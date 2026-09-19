const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const agentsDir = path.join(__dirname, 'agents');
const report = {
  totalTests: 0,
  passed: 0,
  failed: 0,
  errors: []
};

async function runTests() {
  console.log('--- STARTING TALENTOS MODEL TESTS ---');

  // Load Agents
  let agent1, agent2, agent3, agent4, agent5, agent6;
  try {
    agent1 = require('./agents/agent1-ingestion.js');
    agent2 = require('./agents/agent2-eventPitch.js');
    agent3 = require('./agents/agent3-codeIntel.js');
    agent4 = require('./agents/agent4-shadowSprint.js');
    agent5 = require('./agents/agent5-graphSearch.js');
    agent6 = require('./agents/agent6-reporting.js');
    console.log('All agent modules loaded successfully.\n');
  } catch (e) {
    console.error('Error loading modules:', e);
    return;
  }

  async function tryTest(testName, moduleName, testFn) {
    report.totalTests++;
    try {
      await testFn();
      report.passed++;
      console.log(`[PASS] ${moduleName} - ${testName}`);
    } catch (e) {
      report.failed++;
      console.error(`[FAIL] ${moduleName} - ${testName}`);
      console.error(`       Error: ${e.message}`);
      report.errors.push({ module: moduleName, test: testName, error: e.message, location: e.stack.split('\n')[1].trim() });
    }
  }

  // AGENT 1: Ingestion
  await tryTest('SHA-256 Fingerprinting', 'Agent 1: Ingestion', async () => {
    if (typeof agent1.computeSha256 === 'function') {
      const hash = agent1.computeSha256('const a = 1;');
      if (!hash || hash.length !== 64) throw new Error('Invalid fingerprint length');
    } else {
      throw new Error('computeSha256 function not exported');
    }
  });

  // AGENT 3: Code Intel
  await tryTest('LOC Analysis', 'Agent 3: Code Intel', async () => {
    if (typeof agent3.analyzeLOC === 'function') {
      const result = agent3.analyzeLOC('function test() { return 1; }\nconsole.log(test());');
      if (result.totalLines !== 2) throw new Error(`LOC calculation failed. Expected 2, got ${result.totalLines}`);
    } else {
      throw new Error('analyzeLOC function not exported');
    }
  });

  // AGENT 4: Shadow Sprint
  await tryTest('Sandboxed Execution Constraints', 'Agent 4: Shadow Sprint', async () => {
    if (typeof agent4.runSandboxedCode === 'function') {
      // Must use the named-object signature with a short timeout to confirm rejection
      try {
        await agent4.runSandboxedCode({
          code: 'while(true) {}',
          testCases: [],
          timeoutMs: 500   // short fuse so the test finishes quickly
        });
        throw new Error('Sandbox did not terminate infinite loop');
      } catch (err) {
        // Agent now rejects with "Sandbox timeout" — accept that plus legacy signals
        if (
          !err.message.includes('Sandbox timeout') &&
          !err.message.includes('timeout') &&
          !err.message.includes('Killed') &&
          !err.message.includes('code 1')
        ) {
          throw new Error('Unexpected error type: ' + err.message);
        }
      }
    } else {
      throw new Error('runSandboxedCode function not exported');
    }
  });

  // AGENT 5: Graph Search
  await tryTest('NL to Cypher Safety Validation', 'Agent 5: Graph Search', async () => {
    if (typeof agent5.isSafeCypher === 'function') {
      const isSafe = agent5.isSafeCypher('MATCH (n) RETURN n');
      if (!isSafe) throw new Error('Safe query was incorrectly blocked');
      
      const isUnsafe = agent5.isSafeCypher('MATCH (n) DETACH DELETE n');
      if (isUnsafe) throw new Error('Unsafe DELETE query was not blocked');
    } else {
      throw new Error('isSafeCypher function not exported');
    }
  });

  // AGENT 6: Reporting (Composite Scoring)
  await tryTest('Composite Scoring Engine Math', 'Agent 6: Reporting', async () => {
    if (typeof agent6.computeCompositeScore === 'function') {
      const score1 = agent6.computeCompositeScore(100, 50, 0); // testCorrectness, execTime, hints
      if (score1.compositeScore !== 100) throw new Error(`Expected 100 for perfect execution, got ${score1.compositeScore}`);
      
      const score2 = agent6.computeCompositeScore(80, 1600, 3);
      if (score2.compositeScore !== 59.5) throw new Error(`Expected 59.5 for decayed score, got ${score2.compositeScore}`);
    } else {
      throw new Error('computeCompositeScore function not exported');
    }
  });

  console.log('\n--- TEST RUN SUMMARY ---');
  console.log(`Total: ${report.totalTests} | Passed: ${report.passed} | Failed: ${report.failed}`);
  if (report.failed > 0) {
    console.log('\n--- ERROR DETAILS ---');
    console.log(JSON.stringify(report.errors, null, 2));
  }

  fs.writeFileSync('test_report.json', JSON.stringify(report, null, 2));
}

runTests();
