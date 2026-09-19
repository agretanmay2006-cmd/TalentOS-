/**
 * test_all_agents.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Master test runner — TalentOS Full Agent Suite
 * Runs all 6 agents sequentially with full reporting.
 *
 * Usage:
 *   $env:GEMINI_API_KEY="<your-key>"
 *   node test_all_agents.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
dotenv.config();

import { execFile, spawn } from 'child_process';
import { writeFile, unlink, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join, dirname } from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execFileAsync = promisify(execFile);

// ─── ANSI helpers ─────────────────────────────────────────────────────────────
const GREEN  = (s) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const CYAN   = (s) => `\x1b[36m${s}\x1b[0m`;
const MAGENTA= (s) => `\x1b[35m${s}\x1b[0m`;
const BOLD   = (s) => `\x1b[1m${s}\x1b[0m`;
const DIM    = (s) => `\x1b[2m${s}\x1b[0m`;

const HAS_KEY = !!process.env.GEMINI_API_KEY;

// ─── Global counters ───────────────────────────────────────────────────────────
let totalPassed = 0;
let totalFailed = 0;
const agentResults = [];

function assert(condition, label, counters) {
  if (condition) {
    console.log(`    ${GREEN('✔')} ${label}`);
    counters.passed++;
    totalPassed++;
  } else {
    console.log(`    ${RED('✘ FAILED:')} ${label}`);
    counters.failed++;
    totalFailed++;
  }
}

function section(title) {
  console.log(BOLD(`\n  [ ${title} ]`));
}

function agentBanner(num, name) {
  console.log(BOLD(MAGENTA(`\n${'═'.repeat(62)}`)));
  console.log(BOLD(MAGENTA(`  Agent ${num} — ${name}`)));
  console.log(BOLD(MAGENTA(`${'═'.repeat(62)}`)));
}

function agentSummary(num, name, counters) {
  const total = counters.passed + counters.failed;
  const status = counters.failed === 0
    ? GREEN(BOLD(`✔ PASSED (${counters.passed}/${total})`))
    : RED(BOLD(`✘ FAILED (${counters.failed}/${total})`));
  console.log(`\n  ${BOLD(`Agent ${num} result:`)} ${status}`);
  agentResults.push({ num, name, ...counters });
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 1 — Ingestion & Authenticity
// ─────────────────────────────────────────────────────────────────────────────
async function testAgent1() {
  agentBanner(1, 'Ingestion & Authenticity Verifier');
  const C = { passed: 0, failed: 0 };

  let calculateSHA256, detectSyntheticText, runAuthenticityIngestion;
  try {
    ({ calculateSHA256, detectSyntheticText, runAuthenticityIngestion } =
      await import('./services/agent1Service.js'));
  } catch (err) {
    console.log(`  ${RED('✘')} Failed to import Agent 1 service: ${err.message}`);
    agentResults.push({ num: 1, name: 'Ingestion & Authenticity Verifier', passed: 0, failed: 1 });
    totalFailed++;
    return;
  }

  const humanText = `Alex Mercer | Senior Software Engineer, TechCorp (2023–Present)
  Wrote Go services, built REST endpoints, Docker. Skills: Go, SQL, Docker.`;
  const aiText = `Dynamic pioneering specialist. Leverage cutting-edge paradigms.
  Foster holistic tapestry of synergistic methodologies. Multifaceted excellence.`;

  section('SHA-256 Hashing');
  try {
    const hashA = calculateSHA256(Buffer.from(humanText));
    const hashB = calculateSHA256(Buffer.from(aiText));
    assert(typeof hashA === 'string' && hashA.length === 64, 'Hash is 64-char hex string', C);
    assert(hashA !== hashB, 'Distinct documents produce distinct hashes', C);
    assert(calculateSHA256(Buffer.from(humanText)) === hashA, 'Hashing is deterministic', C);
    console.log(DIM(`      Human hash: ${hashA.slice(0, 20)}... | AI hash: ${hashB.slice(0, 20)}...`));
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 3; totalFailed += 3; }

  section('Synthetic AI Text Detection');
  try {
    const resA = await detectSyntheticText(humanText);
    const resB = await detectSyntheticText(aiText);
    assert(typeof resA.syntheticScore === 'number', 'Returns numeric syntheticScore', C);
    assert(resA.syntheticScore >= 0 && resA.syntheticScore <= 1, 'Score in [0,1] range', C);
    assert(typeof resA.isSynthetic === 'boolean', 'Returns boolean isSynthetic flag', C);
    assert(typeof resA.modelUsed === 'string', 'Returns modelUsed field', C);
    console.log(DIM(`      Human: ${(resA.syntheticScore*100).toFixed(1)}% AI | AI-text: ${(resB.syntheticScore*100).toFixed(1)}% AI`));
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 4; totalFailed += 4; }

  section('Full Ingestion Pipeline');
  try {
    const result = await runAuthenticityIngestion(Buffer.from(humanText), 'text/plain', 'alex@test.io');
    assert(result !== null && typeof result === 'object', 'Pipeline returns result object', C);
    assert(typeof result.hash === 'string' && result.hash.length === 64, 'Result contains SHA-256 hash', C);
    assert(typeof result.aiDetection === 'object', 'Result contains aiDetection analysis', C);
    assert(typeof result.status === 'string', 'Result contains status field', C);
    console.log(DIM(`      status=${result.status}, aiDetection.isSynthetic=${result.aiDetection?.isSynthetic}`));
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 4; totalFailed += 4; }

  agentSummary(1, 'Ingestion & Authenticity Verifier', C);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 2 — Pitch VLM Evaluator & Devpost Webhook
// ─────────────────────────────────────────────────────────────────────────────
async function testAgent2() {
  agentBanner(2, 'Pitch VLM Evaluator & Devpost Webhook');
  const C = { passed: 0, failed: 0 };

  let gradePitchDeckWithVLM, processDevpostSubmission;
  try {
    ({ gradePitchDeckWithVLM, processDevpostSubmission } =
      await import('./services/agent2Service.js'));
  } catch (err) {
    console.log(`  ${RED('✘')} Failed to import Agent 2 service: ${err.message}`);
    agentResults.push({ num: 2, name: 'Pitch VLM Evaluator', passed: 0, failed: 1 });
    totalFailed++;
    return;
  }

  section('VLM Pitch Deck Grading (mock fallback via null buffer)');
  try {
    const grades = await gradePitchDeckWithVLM(null, 'application/pdf');
    assert(typeof grades === 'object' && grades !== null, 'Returns grades object', C);
    ['clarity', 'viability', 'technical', 'business'].forEach(k => {
      assert(typeof grades[k] === 'number' && grades[k] >= 1 && grades[k] <= 10,
        `${k} score in [1,10] (got ${grades[k]})`, C);
    });
    assert(typeof grades.feedback === 'string' && grades.feedback.length > 0, 'Non-empty feedback', C);
    console.log(DIM(`      Clarity:${grades.clarity} Viability:${grades.viability} Tech:${grades.technical} Biz:${grades.business}`));
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 5; totalFailed += 5; }

  section('Devpost Webhook Pipeline');
  try {
    const payload = {
      submission_id: 'test_001',
      project_title: 'EcoSphere AI Carbon Tracker',
      pitch_deck_url: 'http://example.com/mock.pdf',
      submitter_name: 'Jordan Vance',
      submitter_email: 'jordan@test.io',
      skills_used: ['React', 'Neo4j', 'FastAPI']
    };
    const result = await processDevpostSubmission(payload, null);
    assert(result.success === true, 'Webhook success=true', C);
    assert(typeof result.projectId === 'string' && result.projectId.length > 0, 'Returns projectId', C);
    assert(typeof result.grades === 'object', 'Returns grades object', C);
    console.log(DIM(`      projectId: ${result.projectId}`));
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 3; totalFailed += 3; }

  agentSummary(2, 'Pitch VLM Evaluator', C);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 3 — Code Intelligence & AST Inspector
// ─────────────────────────────────────────────────────────────────────────────
async function testAgent3() {
  agentBanner(3, 'Code Intelligence & AST Inspector');
  const C = { passed: 0, failed: 0 };
  const { default: path } = await import('path');

  let analyzeFile, analyzeRepository;
  try {
    ({ analyzeFile, analyzeRepository } = await import('./services/agent3Service.js'));
  } catch (err) {
    console.log(`  ${RED('✘')} Failed to import Agent 3 service: ${err.message}`);
    agentResults.push({ num: 3, name: 'Code Intelligence & AST Inspector', passed: 0, failed: 1 });
    totalFailed++;
    return;
  }

  section('Single File Analysis');
  try {
    const metrics = analyzeFile(join(__dirname, 'services', 'agent1Service.js'));
    assert(metrics !== null, 'analyzeFile returns metrics for .js file', C);
    assert(metrics.language === 'JavaScript', `Language = JavaScript (got ${metrics.language})`, C);
    assert(metrics.codeLines > 0, `codeLines > 0 (got ${metrics.codeLines})`, C);
    assert(metrics.complexity >= 1, `complexity >= 1 (got ${metrics.complexity})`, C);
    assert(metrics.totalLines === metrics.codeLines + metrics.commentLines + metrics.blankLines,
      'LOC + Comments + Blanks = totalLines', C);
    console.log(DIM(`      agent1Service.js: LOC=${metrics.codeLines}, comments=${metrics.commentLines}, complexity=${metrics.complexity}`));
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 5; totalFailed += 5; }

  section('Non-Code File Returns null');
  try {
    const result = analyzeFile(join(__dirname, 'package.json'));
    assert(result === null, 'analyzeFile returns null for .json (unsupported language)', C);
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed++; totalFailed++; }

  section('Full Repository Scan');
  try {
    const analysis = analyzeRepository(join(__dirname, 'services'));
    assert(Array.isArray(analysis.files) && analysis.files.length > 0, `Scanned ${analysis.files.length} service files`, C);
    assert(analysis.aggregates.codeLines > 0, `Aggregate LOC > 0 (got ${analysis.aggregates.codeLines})`, C);
    assert(analysis.aggregates.maxComplexity >= 1, `maxComplexity >= 1 (got ${analysis.aggregates.maxComplexity})`, C);
    assert(analysis.aggregates.averageComplexity > 0, `averageComplexity > 0`, C);

    const top3 = [...analysis.files].sort((a, b) => b.complexity - a.complexity).slice(0, 3);
    console.log(DIM(`      Top complex files:`));
    top3.forEach(f => console.log(DIM(`        ${f.filename}: complexity=${f.complexity}, LOC=${f.codeLines}`)));
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 4; totalFailed += 4; }

  agentSummary(3, 'Code Intelligence & AST Inspector', C);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 4 — Shadow Sprint Sandboxed Auto-Grader
// ─────────────────────────────────────────────────────────────────────────────
async function testAgent4() {
  agentBanner(4, 'Shadow Sprint Sandboxed Auto-Grader');
  const C = { passed: 0, failed: 0 };

  // ── Inline grader (same logic as agent4GraderService) ────────────────────
  function buildTestHarness(userCode, tests) {
    const assertions = tests.map((t, i) => `
  try {
    const _result = (${t.call});
    const _expected = (${t.expected});
    if (JSON.stringify(_result) === JSON.stringify(_expected)) {
      console.log('PASS [${i + 1}] ${t.description}');
      _passed++;
    } else {
      console.log('FAIL [${i + 1}] ${t.description} | got: ' + JSON.stringify(_result) + ' expected: ' + JSON.stringify(_expected));
      _failed++;
    }
  } catch(e) {
    console.log('ERROR [${i + 1}] ${t.description}: ' + e.message);
    _failed++;
  }`).join('\n');

    return `
${userCode}

let _passed = 0, _failed = 0;
${assertions}

console.log('---');
console.log('RESULT passed=' + _passed + ' failed=' + _failed);
process.exit(_failed > 0 ? 1 : 0);
`.trim();
  }

  async function runGrader(code, testSuite, timeoutMs = 10000) {
    const tmpDir = await mkdtemp(join(tmpdir(), 'sprint-'));
    const tmpFile = join(tmpDir, 'submission.mjs');
    await writeFile(tmpFile, buildTestHarness(code, testSuite), 'utf-8');

    return new Promise((resolve) => {
      const child = spawn(process.execPath, [tmpFile], {
        timeout: timeoutMs,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      let stdout = '', stderr = '';
      let timedOut = false;
      const lines = [];

      child.stdout.on('data', (d) => { const l = d.toString(); stdout += l; lines.push(l.trim()); });
      child.stderr.on('data', (d) => { stderr += d.toString(); });

      const killer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);

      child.on('close', async (code) => {
        clearTimeout(killer);
        try { await unlink(tmpFile); } catch {}
        const rl = stdout.split('\n').find(l => l.startsWith('RESULT'));
        let p = 0, f = 0;
        if (rl) {
          const pm = rl.match(/passed=(\d+)/); const fm = rl.match(/failed=(\d+)/);
          if (pm) p = parseInt(pm[1]); if (fm) f = parseInt(fm[1]);
        }
        resolve({ stdout, stderr, timedOut, exitCode: code, passed: p, failed: f, terminalLines: lines });
      });
    });
  }

  const correctCode = `
function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`.trim();

  const testSuite = [
    { description: 'finds element in middle',       call: 'binarySearch([1,3,5,7,9], 5)', expected: '2' },
    { description: 'finds element at start',        call: 'binarySearch([1,3,5,7,9], 1)', expected: '0' },
    { description: 'returns -1 for missing element',call: 'binarySearch([1,3,5,7,9], 4)', expected: '-1' },
  ];

  section('Grader — Correct Code (All 3 Tests Pass)');
  try {
    const res = await runGrader(correctCode, testSuite);
    assert(res.passed === 3, `All 3 tests pass (got ${res.passed}/3)`, C);
    assert(res.failed === 0, 'Zero failures on correct code', C);
    assert(!res.timedOut, 'Grader did not time out', C);
    assert(res.terminalLines.some(l => l.startsWith('PASS')), 'Output contains PASS lines', C);
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 4; totalFailed += 4; }

  section('Grader — Buggy Code (Failures Detected)');
  const buggyCode = `
function binarySearch(arr, target) {
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid] === target) return 0; // BUG: always returns index 0
    else if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`.trim();
  try {
    const res = await runGrader(buggyCode, testSuite);
    assert(res.failed >= 1, `Detected ≥1 failure on buggy code (got ${res.failed})`, C);
    assert(!res.timedOut, 'Grader did not time out on buggy code', C);
    assert(res.terminalLines.some(l => l.startsWith('FAIL')), 'Output contains FAIL lines', C);
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 3; totalFailed += 3; }

  section('Grader — Infinite Loop (Timeout)');
  const infiniteCode = `function binarySearch(arr, t) { while(true){} }`;
  try {
    const start = Date.now();
    const res = await runGrader(infiniteCode, testSuite, 3000);
    const elapsed = Date.now() - start;
    assert(res.timedOut === true, 'Infinite loop → timedOut=true', C);
    assert(elapsed < 5000, `Sandbox killed in < 5s (actual: ${elapsed}ms)`, C);
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 2; totalFailed += 2; }

  section('Harness Builder — Structure Validation');
  try {
    const harness = buildTestHarness(correctCode, testSuite);
    assert(harness.includes('let _passed = 0, _failed = 0'), 'Harness includes pass/fail counters', C);
    assert(harness.includes('RESULT passed='), 'Harness includes RESULT summary line', C);
    assert(harness.includes('binarySearch'), 'Harness includes user function', C);
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 3; totalFailed += 3; }

  agentSummary(4, 'Shadow Sprint Sandboxed Auto-Grader', C);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 5 — Graph Copilot & Digital Twin
// ─────────────────────────────────────────────────────────────────────────────
async function testAgent5() {
  agentBanner(5, 'Graph Copilot & Candidate Digital Twin');
  const C = { passed: 0, failed: 0 };

  let validateCypher, mergeAndRankResults, translateToQuery;
  let pruneSession, getActiveSessions, createTwinSession;
  try {
    ({ validateCypher, mergeAndRankResults, translateToQuery } =
      await import('./services/agent5CopilotService.js'));
    ({ pruneSession, getActiveSessions, createTwinSession } =
      await import('./services/agent5TwinService.js'));
  } catch (err) {
    console.log(`  ${RED('✘')} Failed to import Agent 5 services: ${err.message}`);
    agentResults.push({ num: 5, name: 'Graph Copilot & Digital Twin', passed: 0, failed: 1 });
    totalFailed++;
    return;
  }

  section('Cypher Whitelist Validator (Offline)');
  try {
    const validQ = 'MATCH (c:Candidate)-[:HAS_SKILL]->(s:Skill) WHERE s.name = "Node.js" RETURN c.email, c.name';
    assert(validateCypher(validQ), 'Accepts valid MATCH query', C);

    let threw = false;
    try { validateCypher('MATCH (c:Candidate) CREATE (s:Skill {name:"hack"}) RETURN c'); } catch { threw = true; }
    assert(threw, 'Rejects CREATE clause', C);

    threw = false;
    try { validateCypher('MATCH (c:Candidate {email:"x@y.com"}) DETACH DELETE c'); } catch { threw = true; }
    assert(threw, 'Rejects DETACH DELETE clause', C);

    threw = false;
    try { validateCypher('MATCH (c:Candidate) SET c.fraudFlag = false RETURN c'); } catch { threw = true; }
    assert(threw, 'Rejects SET clause', C);
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 4; totalFailed += 4; }

  section('Hybrid Result Merger & Ranker (Offline)');
  try {
    const graphMock = [
      { 'c.email': 'alice@test.com', 'c.name': 'Alice', 'c.fraudFlag': false, commitCount: 50, skills: ['Node.js'] },
      { 'c.email': 'bob@test.com',   'c.name': 'Bob',   'c.fraudFlag': true,  commitCount: 10, skills: ['React'] }
    ];
    const vectorMock = [
      { email: 'charlie@test.com', name: 'Charlie', score: 0.95, skills: ['Node.js', 'Express'] },
      { email: 'alice@test.com',   name: 'Alice',   score: 0.85, skills: ['Node.js'] }
    ];
    const results = mergeAndRankResults(graphMock, vectorMock, { fraudFlag: false }, 10);
    assert(results.length === 2, `Fraud candidate filtered out (got ${results.length}, expected 2)`, C);
    assert(results[0].email === 'alice@test.com', 'Alice ranks #1 (high composite score)', C);
    assert(results[0].compositeScore > 0, `Composite score > 0 (${results[0].compositeScore})`, C);
    assert(results.every(r => !r.fraudFlag), 'All results have fraudFlag=false', C);
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 4; totalFailed += 4; }

  if (HAS_KEY) {
    section('Copilot NL → Cypher Translation (Gemini)');
    try {
      const q = await translateToQuery('Find Node.js engineers with zero fraud flags');
      assert(typeof q.cypher === 'string' && q.cypher.toUpperCase().includes('MATCH'), 'Gemini translated to Cypher MATCH query', C);
      assert(typeof q.vectorQuery === 'string' && q.vectorQuery.length > 0, 'Generated vector query string', C);
      assert(q.filters !== undefined, 'Extracted filters object', C);
      console.log(DIM(`      cypher: ${q.cypher.slice(0, 80)}...`));
    } catch (err) {
      if (err.message && err.message.includes('429')) {
        console.log(`    ${YELLOW('⚠')} Gemini quota exhausted — skipping translation (rate limited)`);
      } else {
        console.log(`    ${YELLOW('⚠')} Copilot translation (API): ${err.message.slice(0, 100)}`);
        C.failed++; totalFailed++;
      }
    }
  } else {
    console.log(`  ${YELLOW('⚠')} Skipping Gemini translation tests — GEMINI_API_KEY not set`);
  }

  section('Digital Twin Session Lifecycle (Offline)');
  try {
    const beforeCount = getActiveSessions();
    assert(typeof beforeCount === 'number', `getActiveSessions() returns number (${beforeCount})`, C);
    const pruneResult = pruneSession('nonexistent-session-id');
    assert(pruneResult === false, 'pruneSession returns false for unknown session', C);
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 2; totalFailed += 2; }

  section('Digital Twin Session Create (with fallback snapshot)');
  try {
    const { sessionId, snapshot } = await createTwinSession('test@talentos.io', 'recruiter');
    assert(typeof sessionId === 'string' && sessionId.startsWith('twin-'), `Session ID created: ${sessionId}`, C);
    assert(typeof snapshot === 'object' && snapshot !== null, 'Snapshot object returned', C);
    assert(typeof snapshot.name === 'string', 'Snapshot contains name field', C);
    assert(Array.isArray(snapshot.skills), 'Snapshot contains skills array', C);
    assert(typeof snapshot.totalCommits === 'number', 'Snapshot contains totalCommits', C);

    const pruned = pruneSession(sessionId);
    assert(pruned === true, 'Session pruned after test', C);
    console.log(DIM(`      snapshot.name="${snapshot.name}", totalCommits=${snapshot.totalCommits}`));
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 6; totalFailed += 6; }

  agentSummary(5, 'Graph Copilot & Digital Twin', C);
}

// ─────────────────────────────────────────────────────────────────────────────
// AGENT 6 — Recruiter Cockpit & Guidance Engine
// ─────────────────────────────────────────────────────────────────────────────
async function testAgent6() {
  agentBanner(6, 'Recruiter Cockpit & Guidance Engine');
  const C = { passed: 0, failed: 0 };

  let getFraudScorecard, getHackathonLeaderboards, getTalentHeatmap, getSprintTranscripts, getCandidateGuidanceRoadmap;
  try {
    ({ getFraudScorecard, getHackathonLeaderboards, getTalentHeatmap, getSprintTranscripts, getCandidateGuidanceRoadmap } =
      await import('./services/agent6ReportingService.js'));
  } catch (err) {
    console.log(`  ${RED('✘')} Failed to import Agent 6 service: ${err.message}`);
    agentResults.push({ num: 6, name: 'Recruiter Cockpit & Guidance Engine', passed: 0, failed: 1 });
    totalFailed++;
    return;
  }

  section('Fraud Scorecard');
  try {
    const scorecard = await getFraudScorecard();
    assert(typeof scorecard === 'object' && scorecard !== null, 'Returns scorecard object', C);
    assert(typeof scorecard.summary === 'object', 'Contains summary object', C);
    assert(typeof scorecard.summary.totalIngested === 'number', `summary.totalIngested is number (got ${scorecard.summary?.totalIngested})`, C);
    assert(typeof scorecard.summary.flaggedFraud === 'number', `summary.flaggedFraud is number (got ${scorecard.summary?.flaggedFraud})`, C);
    assert(Array.isArray(scorecard.scorecards), 'scorecards is array', C);
    console.log(DIM(`      total=${scorecard.summary.totalIngested}, flaggedFraud=${scorecard.summary.flaggedFraud}`));
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 5; totalFailed += 5; }

  section('Hackathon Leaderboard');
  try {
    const lb = await getHackathonLeaderboards();
    assert(typeof lb === 'object' && lb !== null, 'Returns leaderboard object', C);
    assert(Array.isArray(lb.leaderboard), 'leaderboard is array', C);
    assert(lb.leaderboard.length > 0, `Leaderboard has entries (${lb.leaderboard.length})`, C);
    const top = lb.leaderboard[0];
    assert(typeof top.rank === 'number' && top.rank === 1, 'First entry rank=1', C);
    assert(typeof top.scores?.total === 'number', `Entry.scores.total is number (got ${top.scores?.total})`, C);
    console.log(DIM(`      #1: ${top.projectName || top.submitterEmail} — score=${top.scores?.total}`));
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 5; totalFailed += 5; }

  section('Talent Heatmap');
  try {
    const heatmap = await getTalentHeatmap();
    assert(typeof heatmap === 'object', 'Returns heatmap object', C);
    assert(Array.isArray(heatmap.skillDistribution), 'skillDistribution is array', C);
    assert(heatmap.skillDistribution.length > 0, `Has skill entries (${heatmap.skillDistribution.length})`, C);
    const first = heatmap.skillDistribution[0];
    assert(typeof first.skill === 'string', 'Skill entry contains skill name', C);
    assert(typeof first.candidateCount === 'number', `Skill entry contains candidateCount (got ${first.candidateCount})`, C);
    console.log(DIM(`      Top skill: ${first.skill} (${first.candidateCount} candidates)`));
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 5; totalFailed += 5; }

  section('Sprint Transcripts');
  try {
    const transcripts = getSprintTranscripts();
    assert(Array.isArray(transcripts), 'Returns transcripts as array', C);
    assert(transcripts.length > 0, `Has at least 1 transcript session (got ${transcripts.length})`, C);
    const first = transcripts[0];
    assert(typeof first.sessionId === 'string', 'Transcript has sessionId', C);
    assert(typeof first.status === 'string', 'Transcript has status', C);
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 4; totalFailed += 4; }

  section('Candidate Guidance Roadmap');
  try {
    const roadmap = await getCandidateGuidanceRoadmap('test@talentos.io');
    assert(typeof roadmap === 'object' && roadmap !== null, 'Returns roadmap object', C);
    assert(typeof roadmap.skillGapAnalysis === 'object', 'Contains skillGapAnalysis object', C);
    assert(Array.isArray(roadmap.skillGapAnalysis?.acquired), `skillGapAnalysis.acquired is array (${roadmap.skillGapAnalysis?.acquired?.length} skills)`, C);
    assert(Array.isArray(roadmap.skillGapAnalysis?.missing), 'skillGapAnalysis.missing is array', C);
    assert(Array.isArray(roadmap.certificationsTracker), 'certificationsTracker is array', C);
    assert(typeof roadmap.progressionTree === 'object', 'progressionTree is object', C);
    console.log(DIM(`      acquired=${roadmap.skillGapAnalysis?.acquired?.length} skills, gaps=${roadmap.skillGapAnalysis?.missing?.length}, certs=${roadmap.certificationsTracker?.length}`));
  } catch (err) { console.log(`    ${RED('✘')} ${err.message}`); C.failed += 6; totalFailed += 6; }

  agentSummary(6, 'Recruiter Cockpit & Guidance Engine', C);
}

// ─────────────────────────────────────────────────────────────────────────────
// MASTER RUNNER
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  const startTime = Date.now();

  console.log(BOLD(CYAN('\n' + '═'.repeat(62))));
  console.log(BOLD(CYAN('  🚀 TalentOS — Full Agent Test Suite (All 6 Agents)')));
  console.log(BOLD(CYAN(`  GEMINI_API_KEY: ${HAS_KEY ? GREEN('✔ SET') : YELLOW('✘ NOT SET (AI tests skipped)')}`)));
  console.log(BOLD(CYAN('═'.repeat(62))));

  await testAgent1();
  await testAgent2();
  await testAgent3();
  await testAgent4();
  await testAgent5();
  await testAgent6();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ── Final Scorecard ───────────────────────────────────────────────────────
  console.log(BOLD(CYAN('\n' + '═'.repeat(62))));
  console.log(BOLD(CYAN('  📊 FINAL SCORECARD')));
  console.log(BOLD(CYAN('═'.repeat(62))));

  let allPassed = true;
  agentResults.forEach(({ num, name, passed, failed }) => {
    const total = passed + failed;
    const status = failed === 0
      ? GREEN(`✔ ${passed}/${total}`)
      : RED(`✘ ${failed} FAILED (${passed}/${total})`);
    console.log(`  Agent ${num} — ${name.padEnd(42)} ${status}`);
    if (failed > 0) allPassed = false;
  });

  console.log(BOLD(CYAN('\n' + '─'.repeat(62))));
  const grandTotal = totalPassed + totalFailed;
  if (allPassed) {
    console.log(BOLD(GREEN(`  ✅ ALL AGENTS PASSED — ${totalPassed}/${grandTotal} assertions in ${elapsed}s`)));
  } else {
    console.log(BOLD(RED(`  ❌ ${totalFailed} FAILURES across all agents — ${totalPassed}/${grandTotal} passed in ${elapsed}s`)));
  }
  console.log(BOLD(CYAN('═'.repeat(62) + '\n')));

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(RED(`\nFatal error in master test runner:`), err);
  process.exit(1);
});
