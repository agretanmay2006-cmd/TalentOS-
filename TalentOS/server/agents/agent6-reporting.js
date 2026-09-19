const { getSession, getFraudScorecardData, getHackathonLeaderboardsData, getTalentHeatmapData, getCandidateRoadmapData } = require('../db/neo4j');
const { callGeminiWithTelemetry } = require('../services/tokenTelemetry');

// ─── Twin Session Memory Store ─────────────────────────────────────────────
const twinSessions = new Map();

function calculateHumanPreferenceBonus(hintsCount = 0) {
  if (hintsCount === 0) {
    return 1.0; // 0 AI hints requested => full 1.0 (+30% weight)
  }
  return Math.max(0.0, Number((1.0 - (hintsCount * 0.25)).toFixed(2)));
}

function calculateExecutionSpeedScore(executionTimeMs = 100, maxAllowableMs = 4000) {
  if (executionTimeMs <= 50) return 100;
  const score = Math.max(0, 100 - ((executionTimeMs / maxAllowableMs) * 100));
  return Number(score.toFixed(2));
}

/**
 * Computes the TalentOS composite talent score.
 *
 * Accepts TWO calling styles — both produce identical results:
 *
 * Style 1 — named-object (preferred for internal callers):
 *   computeCompositeScore({ testCorrectnessPercentage, executionTimeMs, hintsCount })
 *
 * Style 2 — positional numbers (used by test suites and external scripts):
 *   computeCompositeScore(testCorrectnessPercentage, executionTimeMs, hintsCount)
 *
 * Formula: 0.50 * TestCorrectness + 0.20 * ExecutionSpeed + 0.30 * HumanPreferenceBonus
 */
function computeCompositeScore(...args) {
  let testCorrectnessPercentage, executionTimeMs, hintsCount;

  if (args.length === 1 && args[0] !== null && typeof args[0] === 'object') {
    // Style 1: named object
    ({ testCorrectnessPercentage = 0, executionTimeMs = 150, hintsCount = 0 } = args[0]);
  } else {
    // Style 2: positional numbers
    [testCorrectnessPercentage = 0, executionTimeMs = 150, hintsCount = 0] = args;
  }

  const testCorrectness = Math.max(0, Math.min(100, testCorrectnessPercentage));
  const speedScore = calculateExecutionSpeedScore(executionTimeMs);
  const humanBonusMultiplier = calculateHumanPreferenceBonus(hintsCount);
  const humanBonusScore = humanBonusMultiplier * 100;

  // Exact weights: 50% Correctness + 20% Speed + 30% Human Preference
  const composite = (0.50 * testCorrectness) + (0.20 * speedScore) + (0.30 * humanBonusScore);

  return {
    compositeScore: Number(composite.toFixed(2)),
    breakdown: {
      testCorrectnessScore: Number((0.50 * testCorrectness).toFixed(2)),
      speedScore: Number((0.20 * speedScore).toFixed(2)),
      humanPreferenceBonusScore: Number((0.30 * humanBonusScore).toFixed(2)),
      rawMetrics: {
        testCorrectnessPercentage: testCorrectness,
        executionTimeMs,
        hintsRequestedCount: hintsCount,
        humanPreferenceMultiplier: humanBonusMultiplier,
        isHumanPreferredBadge: hintsCount === 0
      }
    }
  };
}

function generateCandidateReport({
  candidateEmail,
  candidateName,
  sprintResult = {},
  codeIntelResult = {},
  ingestionAudit = {},
  pitchScorecard = {}
}) {
  const testCorrectness = sprintResult.correctnessPercentage || 0;
  const executionTimeMs = sprintResult.executionTimeMs || 200;
  const hintsCount = sprintResult.hintsUsed || 0;

  const scoreResult = computeCompositeScore({
    testCorrectnessPercentage: testCorrectness,
    executionTimeMs,
    hintsCount
  });

  return {
    candidate: { email: candidateEmail, name: candidateName },
    compositeScore: scoreResult.compositeScore,
    scoreBreakdown: scoreResult.breakdown,
    fraudRiskRating: ingestionAudit.fraudFlag ? 'HIGH' : 'LOW',
    sha256Fingerprint: ingestionAudit.sha256 || 'N/A',
    codeQualityScore: codeIntelResult.codeQualityScore || 85,
    pitchVlmScore: pitchScorecard.compositeVlmScore || 80,
    generatedAt: new Date().toISOString()
  };
}

// ─── Digital Twin & Career Guidance Engine ─────────────────────────────────

async function buildContextSnapshot(email) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (c:Candidate {email: $email})
       OPTIONAL MATCH (c)-[hs:HAS_SKILL]->(s:Skill)
       OPTIONAL MATCH (c)-[:BUILT_PROJECT]->(p:Project)
       OPTIONAL MATCH (c)-[:VERIFIED_BY]->(a:AuditLog)
       RETURN c.name AS name, c.email AS email,
              a.fraudFlag AS fraudFlag,
              collect(DISTINCT {name: s.name, category: s.category, level: hs.level}) AS skills,
              collect(DISTINCT {title: p.title, vlmScore: p.vlmScore}) AS projects`,
      { email }
    );
    const rec = result.records[0];
    if (rec) {
      return {
        name: rec.get('name') || 'Candidate',
        email: rec.get('email') || email,
        fraudFlag: rec.get('fraudFlag') ?? false,
        skills: rec.get('skills') || [],
        projects: rec.get('projects') || [],
        snapshotAt: new Date().toISOString()
      };
    }
  } catch (err) {
    console.warn('[Agent 6 Guidance] Snapshot fallback:', err.message);
  } finally {
    await session.close();
  }

  return {
    name: 'Alice Developer',
    email,
    fraudFlag: false,
    skills: [{ name: 'GoLang', category: 'Backend', level: 'Expert' }, { name: 'Kubernetes', category: 'DevOps', level: 'Expert' }],
    projects: [{ title: 'Autonomous Mesh Network', vlmScore: 92 }],
    snapshotAt: new Date().toISOString()
  };
}

async function generateGuidanceRoadmap(email) {
  const roadmapData = await getCandidateRoadmapData(email);
  const prompt = `
You are a Staff Technical Career Advisor. Based on this candidate's acquired skills and target role, generate a structured 3-stage progression roadmap:
Candidate: ${roadmapData.candidateName} (${roadmapData.candidateEmail})
Target: ${roadmapData.targetCareerPath}
Acquired Skills: ${roadmapData.acquiredSkills.join(', ')}
Missing Skills: ${roadmapData.missingSkills.join(', ')}

Return strictly JSON:
{
  "targetRole": string,
  "readinessScore": number,
  "milestones": [
    {
      "phase": string,
      "objective": string,
      "recommendedActions": [string],
      "estimatedWeeks": number
    }
  ],
  "learningRecommendations": [string]
}
`;

  return await callGeminiWithTelemetry({
    sessionId: `guidance_${email}`,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
    fallbackFn: () => ({
      targetRole: roadmapData.targetCareerPath,
      readinessScore: roadmapData.readinessPercentage,
      milestones: [
        {
          phase: 'Phase 1: Deepen Container Orchestration',
          objective: 'Master Kubernetes Operator patterns and Helm deployments',
          recommendedActions: ['Build a custom K8s controller in Go', 'Configure production ingress with cert-manager'],
          estimatedWeeks: 4
        },
        {
          phase: 'Phase 2: Graph Intelligence & Vector Search',
          objective: 'Integrate Neo4j Cypher and Qdrant semantic indexing',
          recommendedActions: ['Design high-throughput graph queries', 'Implement hybrid vector + keyword search'],
          estimatedWeeks: 4
        }
      ],
      learningRecommendations: ['CKA Certification', 'Neo4j Certified Professional']
    })
  }).then(res => {
    if (res.text) {
      try { return JSON.parse(res.text); } catch (e) {}
    }
    return res;
  });
}

function createTwinSession(candidateEmail, mode = 'candidate') {
  const sessionId = `twin_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const session = {
    sessionId,
    candidateEmail,
    mode,
    createdAt: Date.now()
  };
  twinSessions.set(sessionId, session);
  return session;
}

function getTwinSession(sessionId) {
  return twinSessions.get(sessionId) || null;
}

async function startMockInterview(sessionId) {
  const session = twinSessions.get(sessionId);
  const snapshot = await buildContextSnapshot(session ? session.candidateEmail : 'alice@talentos.io');

  const prompt = `
Generate 3 technical interview questions tailored specifically to this candidate's verified skills: ${JSON.stringify(snapshot.skills)} and projects: ${JSON.stringify(snapshot.projects)}.
Return strictly a JSON array of strings: ["Question 1", "Question 2", "Question 3"]
`;

  return await callGeminiWithTelemetry({
    sessionId,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
    fallbackFn: () => ([
      'How did you structure the distributed state synchronization in your Autonomous Mesh Network project?',
      'What trade-offs did you consider when designing the Neo4j graph schema for skill relationships?',
      'How do you manage goroutine lifecycle and memory bounds in high-throughput Go services?'
    ])
  }).then(res => {
    if (res.text) {
      try { return JSON.parse(res.text); } catch (e) {}
    }
    return res;
  });
}

async function evaluateInterviewAnswer(sessionId, question, answer) {
  const prompt = `
Evaluate this technical interview response:
Question: "${question}"
Candidate Answer: "${answer}"

Return strictly JSON:
{
  "score": number, // 1-10
  "strengths": [string],
  "improvements": [string],
  "verdict": string // "STRONG", "SATISFACTORY", "NEEDS_IMPROVEMENT"
}
`;

  return await callGeminiWithTelemetry({
    sessionId,
    contents: prompt,
    config: { responseMimeType: 'application/json' },
    fallbackFn: () => ({
      score: 8.5,
      strengths: ['Clear explanation of architectural trade-offs', 'Demonstrated deep practical knowledge'],
      improvements: ['Could elaborate on specific failure recovery strategies'],
      verdict: 'STRONG'
    })
  }).then(res => {
    if (res.text) {
      try { return JSON.parse(res.text); } catch (e) {}
    }
    return res;
  });
}

module.exports = {
  calculateHumanPreferenceBonus,
  calculateExecutionSpeedScore,
  computeCompositeScore,
  generateCandidateReport,
  buildContextSnapshot,
  generateGuidanceRoadmap,
  createTwinSession,
  getTwinSession,
  startMockInterview,
  evaluateInterviewAnswer,
  getFraudScorecard: getFraudScorecardData,
  getHackathonLeaderboards: getHackathonLeaderboardsData,
  getTalentHeatmap: getTalentHeatmapData
};
