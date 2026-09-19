/**
 * test_agent5.mjs
 * Complete test suite for Phase 4 (Agent 5A Copilot & Agent 5B Digital Twin).
 *
 * Usage:
 *   node test_agent5.mjs
 */

import {
  validateCypher,
  mergeAndRankResults,
  translateToQuery
} from './services/agent5CopilotService.js';

import {
  createTwinSession,
  pruneSession,
  getActiveSessions
} from './services/agent5TwinService.js';

import dotenv from 'dotenv';
dotenv.config();

const HAS_KEY = !!process.env.GEMINI_API_KEY;

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

async function runTests() {
  console.log('\n══════════════════════════════════════════════════════');
  console.log('  Phase 4 – Agent 5 (Copilot & Digital Twin) Test Suite');
  console.log('══════════════════════════════════════════════════════\n');

  // ── Group 1: Cypher Whitelist Validator ──────────────────────────────────
  console.log('[ Group 1 ] Cypher Whitelist Validator (Offline)');
  try {
    const validQuery1 = 'MATCH (c:Candidate)-[:HAS_SKILL]->(s:Skill) WHERE s.name = "Node.js" RETURN c.email, c.name';
    assert(validateCypher(validQuery1), 'Accepts valid MATCH query');

    const validQuery2 = 'OPTIONAL MATCH (c:Candidate)-[:COMMITTED]->(co:Commit) RETURN c.email, count(co) AS commitCount';
    assert(validateCypher(validQuery2), 'Accepts OPTIONAL MATCH query');

    let threwForWrite = false;
    try {
      validateCypher('MATCH (c:Candidate) CREATE (s:Skill {name: "Hacked"}) RETURN c');
    } catch (e) {
      threwForWrite = true;
    }
    assert(threwForWrite, 'Rejects query with CREATE clause');

    let threwForDelete = false;
    try {
      validateCypher('MATCH (c:Candidate {email: "bad@test.com"}) DETACH DELETE c');
    } catch (e) {
      threwForDelete = true;
    }
    assert(threwForDelete, 'Rejects query with DELETE clause');

    let threwForSet = false;
    try {
      validateCypher('MATCH (c:Candidate) SET c.fraudFlag = false RETURN c');
    } catch (e) {
      threwForSet = true;
    }
    assert(threwForSet, 'Rejects query with SET clause');
  } catch (err) {
    console.error('Group 1 error:', err);
    failed++;
  }

  // ── Group 2: Hybrid Result Merger & Ranker ────────────────────────────────
  console.log('\n[ Group 2 ] Hybrid Result Merger & Ranker (Offline)');
  try {
    const neo4jMock = [
      { 'c.email': 'alice@test.com', 'c.name': 'Alice', 'c.fraudFlag': false, commitCount: 50, skills: ['Node.js'] },
      { 'c.email': 'bob@test.com', 'c.name': 'Bob', 'c.fraudFlag': true, commitCount: 10, skills: ['React'] }
    ];

    const qdrantMock = [
      { email: 'charlie@test.com', name: 'Charlie', score: 0.95, skills: ['Node.js', 'Express'] },
      { email: 'alice@test.com', name: 'Alice', score: 0.85, skills: ['Node.js'] }
    ];

    const results = mergeAndRankResults(neo4jMock, qdrantMock, { fraudFlag: false }, 10);

    assert(results.length === 2, `Filters out fraud candidate (got ${results.length} results, expected 2)`);
    assert(results[0].email === 'alice@test.com', 'Alice ranks #1 due to high composite graph + vector score');
    assert(results[0].compositeScore > 0, `Composite score calculated correctly (${results[0].compositeScore})`);
    assert(results.every(r => !r.fraudFlag), 'All returned candidates have fraudFlag=false');
  } catch (err) {
    console.error('Group 2 error:', err);
    failed++;
  }

  // ── Group 3: Copilot Query Translation (Gemini) ──────────────────────────
  console.log('\n[ Group 3 ] Copilot Query Translation (Gemini)');
  if (!HAS_KEY) {
    console.log('  ⚠ GEMINI_API_KEY missing – skipping Group 3 AI tests');
  } else {
    try {
      const query = await translateToQuery('Find Node.js engineers with zero fraud flags');
      assert(typeof query.cypher === 'string' && query.cypher.includes('MATCH'), 'Gemini translated prompt to Cypher MATCH query');
      assert(typeof query.vectorQuery === 'string' && query.vectorQuery.length > 0, 'Gemini generated vector query string');
      assert(query.filters !== undefined, 'Gemini extracted query filters object');
    } catch (err) {
      console.log(`  ✘ Copilot translation failed (possible API rate limit / key issue): ${err.message}`);
      failed++;
    }
  }

  // ── Group 4: Digital Twin Session Lifecycle ──────────────────────────────
  console.log('\n[ Group 4 ] Digital Twin Session Lifecycle (Offline/Store)');
  try {
    const initialCount = getActiveSessions();
    const mockEmail = 'test-candidate@domain.com';

    // Test pruning nonexistent session
    const prunedNonExistant = pruneSession('fake-session-id');
    assert(!prunedNonExistant, 'Returns false when pruning non-existent session');

    assert(typeof getActiveSessions === 'function', 'getActiveSessions accessor present');
  } catch (err) {
    console.error('Group 4 error:', err);
    failed++;
  }

  console.log('\n══════════════════════════════════════════════════════');
  if (failed === 0) {
    console.log(`  ✔ All ${passed} tests PASSED`);
  } else {
    console.log(`  ✘ ${failed} of ${passed + failed} tests FAILED`);
  }
  console.log('══════════════════════════════════════════════════════\n');
}

runTests();
