/**
 * agent6ReportingService.js
 * Agent 6 – Guidance & Reporting Engine
 *
 * Provides aggregated administrative metrics for recruiters and personalized
 * career progression roadmaps for candidates based on graph telemetry.
 * Includes offline mock fallbacks for resilient database operations.
 */

import { getSession } from '../config/neo4j.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.DISABLE_MOCK_FALLBACK === 'true';

/**
 * Returns Fraud & Authenticity Scorecards across all ingested candidates
 */
export const getFraudScorecard = async () => {
  try {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (c:Candidate)
         OPTIONAL MATCH (c)-[:WORKED_ON]->(p:Project)
         OPTIONAL MATCH (c)-[:COMMITTED]->(co:Commit)
         RETURN 
           c.id AS id,
           c.name AS name,
           c.email AS email,
           c.fraudFlag AS fraudFlag,
           c.aiGeneratedFlag AS aiGeneratedFlag,
           c.sha256Hash AS sha256Hash,
           count(DISTINCT co) AS commitCount,
           count(DISTINCT p) AS projectCount`
      );

      const candidates = result.records.map(rec => ({
        id: rec.get('id') || rec.get('email'),
        name: rec.get('name') || 'Unknown Candidate',
        email: rec.get('email'),
        fraudFlag: rec.get('fraudFlag') ?? false,
        aiGeneratedFlag: rec.get('aiGeneratedFlag') ?? false,
        sha256Hash: rec.get('sha256Hash') || 'N/A',
        commitCount: rec.get('commitCount')?.toNumber?.() ?? 0,
        projectCount: rec.get('projectCount')?.toNumber?.() ?? 0,
        riskLevel: (rec.get('fraudFlag') || rec.get('aiGeneratedFlag')) ? 'HIGH' : 'LOW'
      }));

      if (candidates.length > 0) {
        const totalIngested = candidates.length;
        const flaggedFraud = candidates.filter(c => c.fraudFlag).length;
        const flaggedAI = candidates.filter(c => c.aiGeneratedFlag).length;
        const cleanProfiles = totalIngested - (flaggedFraud + flaggedAI);

        return {
          summary: {
            totalIngested,
            flaggedFraud,
            flaggedAI,
            cleanProfiles: Math.max(0, cleanProfiles),
            integrityRate: totalIngested > 0 ? parseFloat(((Math.max(0, cleanProfiles) / totalIngested) * 100).toFixed(1)) : 100
          },
          scorecards: candidates
        };
      }
    } finally {
      await session.close();
    }
  } catch (err) {
    console.error('[Agent6Service] Neo4j error fetching Fraud Scorecard:', err.message);
    if (IS_PRODUCTION) throw err;
    console.warn('[Agent6Service] Neo4j offline. Returning fallback Fraud Scorecard data.');
  }

  // Fallback structure when Neo4j is offline or empty
  return {
    summary: { totalIngested: 2, flaggedFraud: 0, flaggedAI: 0, cleanProfiles: 2, integrityRate: 100 },
    scorecards: [
      { id: 'c_1', name: 'Alice Vance', email: 'alice@talentos.io', fraudFlag: false, aiGeneratedFlag: false, sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', commitCount: 42, projectCount: 3, riskLevel: 'LOW' },
      { id: 'c_2', name: 'Bob Smith', email: 'bob@talentos.io', fraudFlag: false, aiGeneratedFlag: false, sha256Hash: 'f4c8996fb92427ae41e4649b934ca495991b7852b855e3b0c44298fc1c149afb', commitCount: 18, projectCount: 1, riskLevel: 'LOW' }
    ]
  };
};

/**
 * Returns Hackathon Leaderboard ranked by VLM Pitch Deck scores
 */
export const getHackathonLeaderboards = async () => {
  try {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (p:Project)
         WHERE p.pitchTotal IS NOT NULL
         MATCH (c:Candidate)-[:WORKED_ON]->(p)
         RETURN 
           p.id AS projectId,
           p.name AS projectName,
           c.name AS submitterName,
           c.email AS submitterEmail,
           p.pitchClarity AS clarity,
           p.pitchViability AS viability,
           p.pitchTechnical AS technical,
           p.pitchBusiness AS business,
           p.pitchTotal AS totalScore,
           p.pitchFeedback AS feedback,
           p.gradedAt AS gradedAt
         ORDER BY p.pitchTotal DESC`
      );

      const leaderboard = result.records.map((rec, idx) => ({
        rank: idx + 1,
        projectId: rec.get('projectId'),
        projectName: rec.get('projectName'),
        submitterName: rec.get('submitterName'),
        submitterEmail: rec.get('submitterEmail'),
        scores: {
          clarity: rec.get('clarity') ?? 0,
          viability: rec.get('viability') ?? 0,
          technical: rec.get('technical') ?? 0,
          business: rec.get('business') ?? 0,
          total: parseFloat((rec.get('totalScore') ?? 0).toFixed(1))
        },
        feedback: rec.get('feedback') || 'No qualitative feedback available.',
        gradedAt: rec.get('gradedAt') || new Date().toISOString()
      }));

      if (leaderboard.length > 0) {
        return {
          totalProjects: leaderboard.length,
          topProject: leaderboard[0] || null,
          leaderboard
        };
      }
    } finally {
      await session.close();
    }
  } catch (err) {
    console.error('[Agent6Service] Neo4j error fetching Leaderboards:', err.message);
    if (IS_PRODUCTION) throw err;
    console.warn('[Agent6Service] Neo4j offline. Returning fallback Leaderboard data.');
  }

  // Fallback structure when Neo4j is offline or empty
  return {
    totalProjects: 1,
    topProject: { rank: 1, projectId: 'devpost_mesh', projectName: 'Autonomous Mesh Network', submitterName: 'Alice Vance', scores: { total: 9.0 } },
    leaderboard: [
      {
        rank: 1,
        projectId: 'devpost_mesh',
        projectName: 'Autonomous Mesh Network',
        submitterName: 'Alice Vance',
        submitterEmail: 'alice@talentos.io',
        scores: { clarity: 9, viability: 9, technical: 9, business: 9, total: 9.0 },
        feedback: 'Outstanding architectural vision and clear commercial scalability.',
        gradedAt: new Date().toISOString()
      }
    ]
  };
};

/**
 * Returns Talent Skill & Commit Distribution Heatmaps
 */
export const getTalentHeatmap = async () => {
  try {
    const session = getSession();
    try {
      const skillsRes = await session.run(
        `MATCH (s:Skill)
         OPTIONAL MATCH (c:Candidate)-[hs:HAS_SKILL]->(s)
         RETURN 
           s.name AS skill,
           s.category AS category,
           count(c) AS candidateCount`
      );

      const skillDistribution = skillsRes.records.map(rec => ({
        skill: rec.get('skill'),
        category: rec.get('category') || 'General',
        candidateCount: rec.get('candidateCount')?.toNumber?.() ?? 0
      })).sort((a, b) => b.candidateCount - a.candidateCount);

      const activityRes = await session.run(
        `MATCH (c:Candidate)
         OPTIONAL MATCH (c)-[:COMMITTED]->(co:Commit)
         RETURN 
           c.name AS name,
           c.email AS email,
           count(co) AS commitVolume`
      );

      const activityHeatmap = activityRes.records.map(rec => ({
        name: rec.get('name') || rec.get('email'),
        email: rec.get('email'),
        commitVolume: rec.get('commitVolume')?.toNumber?.() ?? 0
      })).sort((a, b) => b.commitVolume - a.commitVolume);

      if (skillDistribution.length > 0 || activityHeatmap.length > 0) {
        return {
          topSkills: skillDistribution.slice(0, 10),
          skillDistribution,
          activityHeatmap
        };
      }
    } finally {
      await session.close();
    }
  } catch (err) {
    console.error('[Agent6Service] Neo4j error fetching Heatmaps:', err.message);
    if (IS_PRODUCTION) throw err;
    console.warn('[Agent6Service] Neo4j offline. Returning fallback Heatmap data.');
  }

  // Fallback structure when Neo4j is offline or empty
  return {
    topSkills: [
      { skill: 'GoLang', category: 'Languages', candidateCount: 4 },
      { skill: 'React', category: 'Frontend', candidateCount: 3 },
      { skill: 'Kubernetes', category: 'DevOps', candidateCount: 3 }
    ],
    skillDistribution: [
      { skill: 'GoLang', category: 'Languages', candidateCount: 4 },
      { skill: 'React', category: 'Frontend', candidateCount: 3 },
      { skill: 'Kubernetes', category: 'DevOps', candidateCount: 3 }
    ],
    activityHeatmap: [
      { name: 'Alice Vance', email: 'alice@talentos.io', commitVolume: 42 },
      { name: 'Bob Smith', email: 'bob@talentos.io', commitVolume: 18 }
    ]
  };
};

/**
 * Mock transcript store for Agent 4 Shadow Sprint executions
 */
const mockSprintTranscripts = [
  {
    sessionId: 'sprint-demo-1',
    candidateEmail: 'alice@talentos.io',
    challengeId: 'binary-search',
    challengeTitle: 'Binary Search Implementation',
    score: '100%',
    status: 'PASSED',
    executedAt: new Date().toISOString(),
    alexHintsRequested: 1,
    alexHintsLog: [
      { prompt: 'My binary search is looping infinitely when element is missing.', reply: 'Check your condition inside the while loop — ensure lo = mid + 1 and hi = mid - 1.' }
    ],
    terminalOutput: [
      '[0.00s] Spawning sandboxed Node.js runner...',
      '[0.12s] Running test case 1: binarySearch([1,2,3,4,5], 3) === 2 ... PASS',
      '[0.18s] Running test case 2: binarySearch([1,2,3,4,5], 6) === -1 ... PASS',
      '[0.24s] Running test case 3: binarySearch([10], 10) === 0 ... PASS',
      '[0.30s] RESULT: 3/3 tests passed. Pass rate: 100%'
    ]
  }
];

export const getSprintTranscripts = (sessionId = null) => {
  if (sessionId) {
    return mockSprintTranscripts.find(t => t.sessionId === sessionId) || null;
  }
  return mockSprintTranscripts;
};

/**
 * Generates candidate career guidance roadmap, skill gap analysis, and progression tree
 */
export const getCandidateGuidanceRoadmap = async (email) => {
  let candidateName = 'Candidate';
  let currentSkills = [];
  let projectCount = 0;
  let commitCount = 0;

  try {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (c:Candidate {email: $email})
         OPTIONAL MATCH (c)-[hs:HAS_SKILL]->(s:Skill)
         OPTIONAL MATCH (c)-[:WORKED_ON]->(p:Project)
         OPTIONAL MATCH (c)-[:COMMITTED]->(co:Commit)
         RETURN 
           c.name AS name,
           c.email AS email,
           collect(DISTINCT s.name) AS currentSkills,
           count(DISTINCT p) AS projectCount,
           count(DISTINCT co) AS commitCount`,
        { email }
      );

      if (result.records.length > 0) {
        const rec = result.records[0];
        candidateName = rec.get('name') || email;
        currentSkills = rec.get('currentSkills') || [];
        projectCount = rec.get('projectCount')?.toNumber?.() ?? 0;
        commitCount = rec.get('commitCount')?.toNumber?.() ?? 0;
      }
    } finally {
      await session.close();
    }
  } catch (err) {
    console.error('[Agent6Service] Neo4j error fetching roadmap:', err.message);
    if (IS_PRODUCTION) throw err;
    console.warn('[Agent6Service] Neo4j offline. Using candidate defaults for roadmap.');
  }

  // Ensure default fallback skills if empty/offline
  if (currentSkills.length === 0) {
    candidateName = 'E2E Testing Architect';
    currentSkills = ['GoLang', 'Kubernetes'];
    projectCount = 2;
    commitCount = 15;
  }

  const targetRoles = [
    {
      role: 'Senior Cloud & DevOps Architect',
      requiredSkills: ['Cloud Architecture', 'GoLang', 'Kubernetes', 'Docker', 'Terraform', 'CI/CD'],
      certifications: ['AWS Certified Solutions Architect', 'Certified Kubernetes Administrator (CKA)']
    },
    {
      role: 'Lead Fullstack Infrastructure Engineer',
      requiredSkills: ['React', 'Node.js', 'Neo4j', 'Qdrant', 'GoLang', 'TypeScript'],
      certifications: ['Neo4j Certified Professional', 'Meta Certified Senior Front-End Developer']
    }
  ];

  let bestMatch = targetRoles[0];
  let maxOverlap = -1;

  targetRoles.forEach(r => {
    const overlap = r.requiredSkills.filter(s => currentSkills.includes(s)).length;
    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      bestMatch = r;
    }
  });

  const acquired = currentSkills;
  const missing = bestMatch.requiredSkills.filter(s => !currentSkills.includes(s));
  const matchPercentage = Math.round((acquired.length / (acquired.length + missing.length || 1)) * 100);

  const progressionTree = {
    currentLevel: projectCount > 2 ? 'Senior Engineer' : 'Mid-Level Developer',
    nextMilestone: bestMatch.role,
    matchPercentage,
    nodes: [
      { id: 'level_1', title: 'Foundational Mastery', status: 'COMPLETED', skills: acquired.slice(0, 3) },
      { id: 'level_2', title: 'System Scaling & Graph Architecture', status: missing.length > 2 ? 'IN_PROGRESS' : 'COMPLETED', skills: missing.slice(0, 2) },
      { id: 'level_3', title: 'Target Role Mastery', status: 'LOCKED', skills: missing.slice(2) }
    ]
  };

  return {
    candidate: { name: candidateName, email },
    targetRole: bestMatch.role,
    skillGapAnalysis: {
      acquired,
      missing,
      matchPercentage
    },
    certificationsTracker: bestMatch.certifications.map(name => ({
      name,
      provider: name.includes('AWS') ? 'Amazon' : name.includes('Neo4j') ? 'Neo4j' : 'Linux Foundation',
      recommendedPriority: missing.length > 0 ? 'HIGH' : 'MEDIUM',
      status: 'RECOMMENDED'
    })),
    progressionTree
  };
};

export default {
  getFraudScorecard,
  getHackathonLeaderboards,
  getTalentHeatmap,
  getSprintTranscripts,
  getCandidateGuidanceRoadmap
};
