/**
 * test_phase5_e2e.mjs
 * End-to-End Integration Test Suite across Agents 1 through 6.
 *
 * Usage:
 *   node test_phase5_e2e.mjs
 */

import { calculateSHA256, detectSyntheticText } from './services/agent1Service.js';
import { processDevpostSubmission } from './services/agent2Service.js';
import { runGrader } from './services/agent4GraderService.js';
import { validateCypher, mergeAndRankResults } from './services/agent5CopilotService.js';
import { createTwinSession } from './services/agent5TwinService.js';
import { 
  getFraudScorecard, 
  getHackathonLeaderboards, 
  getTalentHeatmap, 
  getCandidateGuidanceRoadmap 
} from './services/agent6ReportingService.js';
import neo4jService from './services/neo4jService.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ ${message}`);
    passed++;
  } else {
    console.error(`  ✘ FAILED: ${message}`);
    failed++;
  }
}

async function runE2ETests() {
  console.log('\n═════════════════════════════════════════════════════════════════');
  console.log('  TalentOS Phase 5 – Full 6-Agent End-to-End Integration Test');
  console.log('═════════════════════════════════════════════════════════════════\n');

  const testEmail = `e2e_candidate_${Date.now()}@talentos.io`;
  const testName = 'E2E Testing Architect';

  // ── Step 1: Ingestion & Verification (Agents 1 & 3) ──────────────────────
  console.log('[ Stage 1 ] Intake, Hashing & Fraud Verification (Agents 1 & 3)');
  try {
    const resumeText = 'Senior Cloud Architect with GoLang, Kubernetes, Docker, and Neo4j experience.';
    const hash = calculateSHA256(Buffer.from(resumeText));
    assert(typeof hash === 'string' && hash.length === 64, 'SHA-256 cryptographic hash computed successfully');

    const aiAnalysis = await detectSyntheticText(resumeText);
    assert(typeof aiAnalysis.isSynthetic === 'boolean', 'Synthetic AI text classifier executed');

    // Create candidate in Neo4j
    await neo4jService.createCandidate(`c_${Date.now()}`, testName, testEmail);
    await neo4jService.createSkill('GoLang', 'Languages');
    await neo4jService.createSkill('Kubernetes', 'DevOps');
    await neo4jService.linkCandidateSkill(testEmail, 'GoLang', 'Expert');
    await neo4jService.linkCandidateSkill(testEmail, 'Kubernetes', 'Expert');

    assert(true, `Candidate ${testName} (${testEmail}) ingested into Neo4j graph`);
  } catch (err) {
    console.error('Stage 1 error:', err);
    failed++;
  }

  // ── Step 2: Event & Pitch Deck Evaluation (Agent 2) ─────────────────────
  console.log('\n[ Stage 2 ] Pitch Deck VLM Evaluation & Leaderboard (Agent 2)');
  try {
    const devpostPayload = {
      submission_id: `sub_${Date.now()}`,
      project_title: 'E2E Autonomous Mesh Network',
      pitch_deck_url: 'https://example.com/mock-pitch.pdf',
      submitter_name: testName,
      submitter_email: testEmail,
      skills_used: ['GoLang', 'Kubernetes']
    };

    const submissionResult = await processDevpostSubmission(devpostPayload);
    assert(submissionResult.success === true, 'Devpost webhook payload processed successfully');
    assert(submissionResult.grades && submissionResult.grades.technical >= 1, 'VLM / Mock pitch deck scores generated');
  } catch (err) {
    console.error('Stage 2 error:', err);
    failed++;
  }

  // ── Step 3: Interactive Shadow Sprint Auto-Grader (Agent 4) ─────────────
  console.log('\n[ Stage 3 ] Shadow Sprint Sandboxed Auto-Grader (Agent 4)');
  try {
    const code = `
function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid] === target) return mid;
    else if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`;
    const testSuite = [
      { name: 'Found index', code: 'if (binarySearch([1,2,3,4,5], 3) !== 2) throw new Error("Expected 2");' }
    ];

    const mockSocket = {
      emitted: [],
      emit(event, payload) { this.emitted.push({ event, payload }); }
    };

    const graderResult = await runGrader('e2e-session', code, testSuite, mockSocket);
    assert(graderResult.passed === 1 && graderResult.failed === 0, 'Sandboxed child-process runner executed user code cleanly');
  } catch (err) {
    console.error('Stage 3 error:', err);
    failed++;
  }

  // ── Step 4: Graph Copilot & Candidate Digital Twin (Agent 5) ─────────────
  console.log('\n[ Stage 4 ] Graph Copilot & Candidate Digital Twin (Agent 5)');
  try {
    const cypher = 'MATCH (c:Candidate)-[:HAS_SKILL]->(s:Skill {name: "GoLang"}) RETURN c.email, c.name';
    assert(validateCypher(cypher) === true, 'Copilot Cypher whitelist validator approved read query');

    const merged = mergeAndRankResults(
      [{ 'c.email': testEmail, 'c.name': testName, 'c.fraudFlag': false, commitCount: 15 }],
      [{ email: testEmail, score: 0.92 }],
      { fraudFlag: false }
    );
    assert(merged.length === 1 && merged[0].email === testEmail, 'Hybrid search merged candidate results with composite score');

    // Twin session
    const { sessionId, snapshot } = await createTwinSession(testEmail, 'candidate');
    assert(sessionId.startsWith('twin-'), 'Digital Twin session initialized');
    assert(snapshot && snapshot.email === testEmail, 'Graph context snapshot loaded into Digital Twin session');
  } catch (err) {
    console.error('Stage 4 error:', err);
    failed++;
  }

  // ── Step 5: Recruiter Cockpit & Guidance Engine (Agent 6) ───────────────
  console.log('\n[ Stage 5 ] Recruiter Cockpit & Guidance Engine (Agent 6)');
  try {
    const fraudReport = await getFraudScorecard();
    assert(fraudReport.summary.totalIngested >= 1, 'Recruiter Fraud Scorecard returned aggregate statistics');

    const leaderboard = await getHackathonLeaderboards();
    assert(leaderboard.totalProjects >= 1, 'Hackathon Leaderboard returned ranked projects');

    const heatmap = await getTalentHeatmap();
    assert(heatmap.skillDistribution.length >= 1, 'Talent Heatmap calculated skill distribution');

    const guidance = await getCandidateGuidanceRoadmap(testEmail);
    assert(guidance.skillGapAnalysis.acquired.length >= 1, 'Candidate Guidance Roadmap identified acquired graph skills');
    assert(guidance.progressionTree.nodes.length >= 1, 'Career Progression Tree built milestones from graph telemetry');
  } catch (err) {
    console.error('Stage 5 error:', err);
    failed++;
  }

  console.log('\n═════════════════════════════════════════════════════════════════');
  if (failed === 0) {
    console.log(`  ✔ ALL STAGES PASSED (${passed} total assertions) — TalentOS Pipeline Verified!`);
  } else {
    console.log(`  ✘ ${failed} assertions FAILED out of ${passed + failed}`);
  }
  console.log('═════════════════════════════════════════════════════════════════\n');
}

runE2ETests();
