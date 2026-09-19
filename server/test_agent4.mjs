/**
 * test_agent4.mjs
 * ─────────────────────────────────────────────────────────────────────────────
 * Standalone test harness for Phase 3 – Agent 4 (Shadow Sprint Module)
 * Tests: Alex AI Teammate + Sandboxed Auto-Grader
 *
 * Run: node test_agent4.mjs
 * Requires: GEMINI_API_KEY in environment (set via shell or .env export)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { execFile, spawn } from 'child_process';
import { writeFile, unlink, mkdtemp } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';
import { GoogleGenAI } from '@google/genai';

const execFileAsync = promisify(execFile);

// ─── ANSI helpers ────────────────────────────────────────────────────────────
const GREEN  = (s) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const CYAN   = (s) => `\x1b[36m${s}\x1b[0m`;
const BOLD   = (s) => `\x1b[1m${s}\x1b[0m`;

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ${GREEN('✔')} ${label}`);
    passed++;
  } else {
    console.log(`  ${RED('✘')} ${label}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 1 — Alex AI Teammate Tests
// ─────────────────────────────────────────────────────────────────────────────

// ── Minimal in-memory simulation of alexService ──────────────────────────────
const ALEX_SYSTEM_PROMPT = `
You are Alex, a senior software engineer at a fast-moving startup. You are reviewing
code during a busy sprint. You DO NOT write code for the candidate. Instead, you ask
clarifying questions, point to the architectural problem, and reference relevant
documentation or patterns. Keep responses under 3 sentences. Be direct, sometimes
slightly impatient, but always helpful.
`.trim();

const alexSessions = new Map();

async function createAlexSession(sessionId) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not set in environment.');

  const ai = new GoogleGenAI({ apiKey });

  const session = {
    ai,
    history: [],
    systemPrompt: ALEX_SYSTEM_PROMPT,
    sessionId
  };
  alexSessions.set(sessionId, session);
  return session;
}

async function sendMessageToAlex(sessionId, userMessage) {
  const session = alexSessions.get(sessionId);
  if (!session) throw new Error(`No Alex session found for: ${sessionId}`);

  const { ai, history, systemPrompt } = session;

  history.push({ role: 'user', parts: [{ text: userMessage }] });

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...history
    ]
  });

  const reply = response.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  history.push({ role: 'model', parts: [{ text: reply }] });

  return reply;
}

function destroyAlexSession(sessionId) {
  alexSessions.delete(sessionId);
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION 2 — Auto-Grader Tests
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a self-contained Node.js test harness string.
 * @param {string} userCode - The candidate's function code.
 * @param {Array<{description: string, call: string, expected: string}>} tests
 */
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

/**
 * Runs grader in a child process with a timeout.
 * @returns {{ stdout, stderr, timedOut, exitCode, passed, failed }}
 */
async function runGrader(code, testSuite, timeoutMs = 10000) {
  const tmpDir = await mkdtemp(join(tmpdir(), 'sprint-'));
  const tmpFile = join(tmpDir, 'submission.mjs');
  const harness = buildTestHarness(code, testSuite);
  await writeFile(tmpFile, harness, 'utf-8');

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [tmpFile], {
      timeout: timeoutMs,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const terminalLines = [];

    child.stdout.on('data', (d) => {
      const line = d.toString();
      stdout += line;
      terminalLines.push(line.trim());
    });

    child.stderr.on('data', (d) => {
      stderr += d.toString();
    });

    const killer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    child.on('close', async (code) => {
      clearTimeout(killer);
      // Cleanup
      try { await unlink(tmpFile); } catch {}

      const resultLine = stdout.split('\n').find(l => l.startsWith('RESULT'));
      let passedCount = 0, failedCount = 0;
      if (resultLine) {
        const pm = resultLine.match(/passed=(\d+)/);
        const fm = resultLine.match(/failed=(\d+)/);
        if (pm) passedCount = parseInt(pm[1]);
        if (fm) failedCount = parseInt(fm[1]);
      }

      resolve({
        stdout,
        stderr,
        timedOut,
        exitCode: code,
        passed: passedCount,
        failed: failedCount,
        terminalLines
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TEST RUNNER
// ─────────────────────────────────────────────────────────────────────────────

async function runTests() {
  console.log(BOLD(CYAN('\n══════════════════════════════════════════════════════')));
  console.log(BOLD(CYAN('  Agent 4 – Shadow Sprint Module Test Suite')));
  console.log(BOLD(CYAN('══════════════════════════════════════════════════════\n')));

  // ── Test Group 1: Alex Session ──────────────────────────────────────────
  console.log(BOLD('[ Group 1 ] Alex AI Teammate'));

  let alexReply = '';
  let alexSessionId = 'test-session-001';

  try {
    const session = await createAlexSession(alexSessionId);
    assert(alexSessions.has(alexSessionId), 'Alex session created and stored in map');

    alexReply = await sendMessageToAlex(
      alexSessionId,
      "I have a bug in my binary search. It returns -1 even when the value exists."
    );
    console.log(`  ${YELLOW('ℹ')} Alex replied: "${alexReply.slice(0, 120).replace(/\n/g, ' ')}..."`);

    assert(typeof alexReply === 'string' && alexReply.length > 0, 'Alex returned a non-empty response');

    // Alex should NOT write code directly (no triple-backtick code blocks)
    const hasCodeBlock = /```[\s\S]*?```/.test(alexReply);
    assert(!hasCodeBlock, 'Alex response does not contain a direct code block (hint-only persona)');

    // Alex response should be concise (under ~500 chars for 3 sentences)
    assert(alexReply.length < 600, 'Alex response is concise (< 600 characters)');

    destroyAlexSession(alexSessionId);
    assert(!alexSessions.has(alexSessionId), 'Alex session destroyed on disconnect');

  } catch (err) {
    console.log(`  ${RED('✘')} Alex test group failed: ${err.message}`);
    failed += 2;

    if (err.message.includes('GEMINI_API_KEY')) {
      console.log(`  ${YELLOW('⚠')} Skipping remaining Alex tests – API key not set.`);
    }
  }

  // ── Test Group 2: Grader – Pass Case ───────────────────────────────────
  console.log(BOLD('\n[ Group 2 ] Auto-Grader – Pass Case'));

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
    { description: 'finds element in middle',       call: 'binarySearch([1,3,5,7,9], 5)',  expected: '2' },
    { description: 'finds element at start',        call: 'binarySearch([1,3,5,7,9], 1)',  expected: '0' },
    { description: 'returns -1 for missing element', call: 'binarySearch([1,3,5,7,9], 4)', expected: '-1' },
  ];

  try {
    const result = await runGrader(correctCode, testSuite);
    assert(result.passed === 3,   `All 3 tests passed (got ${result.passed}/3)`);
    assert(result.failed === 0,   `Zero failures on correct code`);
    assert(!result.timedOut,      `Grader did not time out`);
    assert(result.terminalLines.some(l => l.startsWith('PASS')), `Terminal output contains PASS lines`);
  } catch (err) {
    console.log(`  ${RED('✘')} Grader pass-case failed: ${err.message}`);
    failed += 4;
  }

  // ── Test Group 3: Grader – Fail Case ────────────────────────────────────
  console.log(BOLD('\n[ Group 3 ] Auto-Grader – Fail Case'));

  const buggyCode = `
function binarySearch(arr, target) {
  // Bug: always returns 0 regardless of target position
  let lo = 0, hi = arr.length - 1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (arr[mid] === target) return 0; // BUG: always returns index 0
    else if (arr[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`.trim();

  // Use a test suite that will clearly fail: finding elements that exist
  const failTestSuite = [
    { description: 'finds element in middle',    call: 'binarySearch([1,3,5,7,9], 5)',  expected: '2'  },
    { description: 'finds element at start',     call: 'binarySearch([1,3,5,7,9], 1)',  expected: '0'  },
    { description: 'finds element at end',       call: 'binarySearch([1,3,5,7,9], 9)',  expected: '4'  },
  ];

  try {
    const result = await runGrader(buggyCode, failTestSuite);
    assert(result.failed >= 1,  `At least 1 test fails on buggy code (got ${result.failed} failures)`);
    assert(result.timedOut === false, `Grader does not time out on buggy code`);
    assert(result.terminalLines.some(l => l.startsWith('FAIL')), `Terminal output contains FAIL lines`);
  } catch (err) {
    console.log(`  ${RED('✘')} Grader fail-case failed: ${err.message}`);
    failed += 3;
  }

  // ── Test Group 4: Grader – Timeout Case ─────────────────────────────────
  console.log(BOLD('\n[ Group 4 ] Auto-Grader – Timeout / Infinite Loop'));

  const infiniteLoop = `
function binarySearch(arr, target) {
  while(true) {}  // intentional infinite loop
}`.trim();

  try {
    const start = Date.now();
    const result = await runGrader(infiniteLoop, testSuite, 3000); // 3s timeout for test speed
    const elapsed = Date.now() - start;
    assert(result.timedOut === true, `Grader detected infinite loop and set timedOut=true`);
    assert(elapsed < 5000,          `Sandbox killed within 5 seconds (actual: ${elapsed}ms)`);
  } catch (err) {
    console.log(`  ${RED('✘')} Grader timeout-case failed: ${err.message}`);
    failed += 2;
  }

  // ── Test Group 5: Test Harness Builder ──────────────────────────────────
  console.log(BOLD('\n[ Group 5 ] Test Harness Builder'));

  const harness = buildTestHarness(correctCode, testSuite);
  assert(harness.includes('let _passed = 0, _failed = 0'), 'Harness includes pass/fail counters');
  assert(harness.includes('RESULT passed='),               'Harness includes RESULT summary line');
  assert(harness.includes('binarySearch'),                 'Harness includes user function code');
  assert(harness.includes('finds element in middle'),      'Harness includes test descriptions');

  // ── Summary ──────────────────────────────────────────────────────────────
  console.log(BOLD(CYAN('\n══════════════════════════════════════════════════════')));
  const total = passed + failed;
  if (failed === 0) {
    console.log(GREEN(BOLD(`  ✔ ALL ${total} TESTS PASSED`)));
  } else {
    console.log(RED(BOLD(`  ✘ ${failed} of ${total} tests FAILED`)));
  }
  console.log(BOLD(CYAN('══════════════════════════════════════════════════════\n')));

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(RED('Fatal error in test runner:'), err);
  process.exit(1);
});
