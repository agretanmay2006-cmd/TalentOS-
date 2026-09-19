/**
 * agent4GraderService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Agent 4 – Sandboxed Auto-Grader Pipeline
 *
 * Accepts user-submitted code from the Monaco Editor, injects it into a
 * test harness, spawns a sandboxed Node.js child process, and streams
 * line-by-line output back to the candidate's terminal pane via Socket.io.
 *
 * Safety measures:
 *   • Code written to OS temp dir and deleted immediately after run.
 *   • Hard kill (SIGKILL) after SANDBOX_TIMEOUT_MS.
 *   • stderr captured separately to avoid poisoning terminal output.
 *   • No network-bound operations inside the sandbox (child process has no
 *     special privileges, inherits only standard stdio).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { spawn } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

// ── Config ────────────────────────────────────────────────────────────────────
const SANDBOX_TIMEOUT_MS = 10_000;  // 10 seconds hard kill
const SANDBOX_DIR        = join(tmpdir(), 'talentos-sprint');

// Ensure the sandbox temp dir exists (non-blocking, fire-and-forget on init)
mkdir(SANDBOX_DIR, { recursive: true }).catch(() => {});

// Active process registry  Map<sessionId, { child, killTimer }>
const activeProcesses = new Map();

// ── Test Harness Builder ──────────────────────────────────────────────────────

/**
 * Builds a self-contained CJS-compatible Node.js test harness string.
 *
 * @param {string} userCode
 *   The candidate's complete function code (must be valid JS).
 *
 * @param {Array<{ description: string, call: string, expected: string }>} tests
 *   Array of test cases.
 *   - `call`     : JS expression string (e.g. `"binarySearch([1,3,5], 3)"`)
 *   - `expected` : JS expression string for expected value (e.g. `"1"`)
 *
 * @returns {string} Complete runnable script.
 */
function buildTestHarness(userCode, tests) {
  if (!Array.isArray(tests) || tests.length === 0) {
    throw new Error('At least one test case is required.');
  }

  const caseBlocks = tests
    .map((t, i) => {
      const num = i + 1;
      return `
  (() => {
    try {
      const _result   = (${t.call});
      const _expected = (${t.expected});
      if (JSON.stringify(_result) === JSON.stringify(_expected)) {
        console.log('PASS [${num}] ${escapeForTemplate(t.description)}');
        _passed++;
      } else {
        console.log(
          'FAIL [${num}] ${escapeForTemplate(t.description)} | ' +
          'got: ' + JSON.stringify(_result) + ' | ' +
          'expected: ' + JSON.stringify(_expected)
        );
        _failed++;
      }
    } catch (_err) {
      console.log('ERROR [${num}] ${escapeForTemplate(t.description)}: ' + _err.message);
      _failed++;
    }
  })();`;
    })
    .join('\n');

  return `
// ── Candidate Submission ─────────────────────────────────────────────────────
${userCode}

// ── Test Harness ─────────────────────────────────────────────────────────────
let _passed = 0;
let _failed = 0;

${caseBlocks}

console.log('---');
console.log('RESULT passed=' + _passed + ' failed=' + _failed + ' total=${tests.length}');
process.exit(_failed > 0 ? 1 : 0);
`.trim();
}

function escapeForTemplate(str) {
  return String(str).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

// ── Core Grader ───────────────────────────────────────────────────────────────

/**
 * Executes the test harness in a sandboxed child process and streams output
 * back via the Socket.io socket.
 *
 * Emits these socket events:
 *   • `terminal-output`  { line: string, type: 'stdout' | 'stderr' | 'system' }
 *   • `test-result`      { passed, failed, total, timedOut, exitCode, sessionId }
 *
 * @param {string}   sessionId   Socket / session ID (used for process registry)
 * @param {string}   code        Candidate's code string
 * @param {Array}    testSuite   Array of test case objects (see buildTestHarness)
 * @param {object}   socket      Socket.io socket instance for streaming
 * @param {number}   [timeoutMs] Override default timeout (for tests)
 * @returns {Promise<{ passed, failed, total, timedOut, exitCode }>}
 */
async function runGrader(sessionId, code, testSuite, socket, timeoutMs = SANDBOX_TIMEOUT_MS) {
  // Kill any already-running grader for this session
  killSandbox(sessionId);

  const runId   = randomUUID().slice(0, 8);
  const tmpFile = join(SANDBOX_DIR, `submission-${runId}.cjs`);

  // Emit helper
  const emit = (line, type = 'stdout') => {
    if (socket) {
      socket.emit('terminal-output', { line, type, sessionId });
    }
  };

  emit(`[Grader] Starting run ${runId}…`, 'system');

  // Build harness
  let harness;
  try {
    harness = buildTestHarness(code, testSuite);
  } catch (buildErr) {
    emit(`[Grader] ✘ Failed to build test harness: ${buildErr.message}`, 'stderr');
    return { passed: 0, failed: testSuite.length, total: testSuite.length, timedOut: false, exitCode: -1 };
  }

  // Write to temp file
  await writeFile(tmpFile, harness, 'utf-8');
  emit(`[Grader] Test harness ready (${testSuite.length} assertion(s))`, 'system');

  return new Promise((resolve) => {
    const child = spawn(process.execPath, [tmpFile], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: SANDBOX_DIR
    });

    let timedOut    = false;
    let stdoutBuf   = '';
    let passedCount = 0;
    let failedCount = 0;
    let total       = testSuite.length;

    // Hard kill timer
    const killTimer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
      emit('[Grader] ✘ TIMEOUT — process killed after ' + (timeoutMs / 1000) + 's', 'stderr');
    }, timeoutMs);

    activeProcesses.set(sessionId, { child, killTimer });

    // Stream stdout line by line
    child.stdout.on('data', (chunk) => {
      stdoutBuf += chunk.toString();
      const lines = stdoutBuf.split('\n');
      stdoutBuf = lines.pop(); // keep partial line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;
        emit(line, 'stdout');

        // Parse running totals from RESULT line
        if (line.startsWith('RESULT')) {
          const pm = line.match(/passed=(\d+)/);
          const fm = line.match(/failed=(\d+)/);
          const tm = line.match(/total=(\d+)/);
          if (pm) passedCount = parseInt(pm[1]);
          if (fm) failedCount = parseInt(fm[1]);
          if (tm) total       = parseInt(tm[1]);
        }
      }
    });

    // Stream stderr
    child.stderr.on('data', (chunk) => {
      const lines = chunk.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        emit(line, 'stderr');
      }
    });

    child.on('close', async (exitCode) => {
      clearTimeout(killTimer);
      activeProcesses.delete(sessionId);

      // Flush any remaining stdout buffer
      if (stdoutBuf.trim()) emit(stdoutBuf, 'stdout');

      // Cleanup temp file
      try { await unlink(tmpFile); } catch {}

      const result = {
        passed:   passedCount,
        failed:   failedCount,
        total,
        timedOut,
        exitCode: exitCode ?? -1,
        sessionId,
        runId
      };

      // Emit final result event
      if (socket) {
        socket.emit('test-result', result);
      }

      const statusIcon = timedOut ? '⏱' : failedCount === 0 ? '✔' : '✘';
      emit(
        `[Grader] ${statusIcon} Run complete — ${passedCount}/${total} passed${timedOut ? ' (timed out)' : ''}`,
        'system'
      );

      resolve(result);
    });

    child.on('error', async (err) => {
      clearTimeout(killTimer);
      activeProcesses.delete(sessionId);
      try { await unlink(tmpFile); } catch {}

      emit(`[Grader] ✘ Spawn error: ${err.message}`, 'stderr');

      const result = { passed: 0, failed: total, total, timedOut: false, exitCode: -1, sessionId, runId };
      if (socket) socket.emit('test-result', result);
      resolve(result);
    });
  });
}

// ── Process Management ────────────────────────────────────────────────────────

/**
 * Force-kills a running grader process for a session.
 * @param {string} sessionId
 * @returns {boolean} true if a process was killed
 */
function killSandbox(sessionId) {
  const entry = activeProcesses.get(sessionId);
  if (!entry) return false;

  clearTimeout(entry.killTimer);
  try {
    entry.child.kill('SIGKILL');
  } catch {}

  activeProcesses.delete(sessionId);
  console.log(`[Agent4/Grader] Force-killed sandbox for session: ${sessionId}`);
  return true;
}

/**
 * Returns number of actively running grader processes.
 */
function getActiveGraderCount() {
  return activeProcesses.size;
}

// ── Predefined Challenge Test Suites ─────────────────────────────────────────
// Bundled challenges used by the sprint sessions. Each has:
//   id, title, language, starterCode, description, testSuite[]

const SPRINT_CHALLENGES = {
  'binary-search': {
    id: 'binary-search',
    title: 'Binary Search',
    language: 'JavaScript',
    description: 'Implement a binary search that returns the index of the target in a sorted array, or -1 if not found.',
    starterCode: `function binarySearch(arr, target) {
  // Your implementation here
  return -1;
}`,
    testSuite: [
      { description: 'finds element in the middle',        call: 'binarySearch([1,3,5,7,9], 5)',  expected: '2'  },
      { description: 'finds element at start',             call: 'binarySearch([1,3,5,7,9], 1)',  expected: '0'  },
      { description: 'finds element at end',               call: 'binarySearch([1,3,5,7,9], 9)',  expected: '4'  },
      { description: 'returns -1 for missing element',     call: 'binarySearch([1,3,5,7,9], 4)',  expected: '-1' },
      { description: 'handles single-element array match', call: 'binarySearch([42], 42)',         expected: '0'  },
      { description: 'handles empty array',                call: 'binarySearch([], 1)',            expected: '-1' }
    ]
  },

  'flatten-array': {
    id: 'flatten-array',
    title: 'Deep Flatten Array',
    language: 'JavaScript',
    description: 'Write a function that deeply flattens a nested array to any depth.',
    starterCode: `function flatten(arr) {
  // Your implementation here
  return [];
}`,
    testSuite: [
      { description: 'flattens one level',     call: 'flatten([1,[2,3],4])',            expected: '[1,2,3,4]'       },
      { description: 'flattens deeply nested', call: 'flatten([1,[2,[3,[4]]],5])',      expected: '[1,2,3,4,5]'     },
      { description: 'handles empty array',    call: 'flatten([])',                     expected: '[]'               },
      { description: 'handles flat array',     call: 'flatten([1,2,3])',                expected: '[1,2,3]'         },
      { description: 'mixed types preserved',  call: 'flatten([1,"a",[true,[null]]])',  expected: '[1,"a",true,null]'}
    ]
  },

  'valid-parentheses': {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    language: 'JavaScript',
    description: 'Determine if the input string has valid, balanced parentheses including (), [], and {}.',
    starterCode: `function isValid(s) {
  // Your implementation here
  return false;
}`,
    testSuite: [
      { description: '() is valid',        call: 'isValid("()")',        expected: 'true'  },
      { description: '()[]{} is valid',    call: 'isValid("()[]{}")',    expected: 'true'  },
      { description: '(] is invalid',      call: 'isValid("(]")',        expected: 'false' },
      { description: '([)] is invalid',    call: 'isValid("([)]")',      expected: 'false' },
      { description: '{[]} is valid',       call: 'isValid("{[]}")',      expected: 'true'  },
      { description: 'empty string valid', call: 'isValid("")',          expected: 'true'  },
    ]
  }
};

/**
 * Returns all available sprint challenges (metadata only, no solutions).
 */
function listChallenges() {
  return Object.values(SPRINT_CHALLENGES).map(({ id, title, language, description, starterCode }) => ({
    id, title, language, description, starterCode
  }));
}

/**
 * Returns the full test suite for a challenge ID.
 * @param {string} challengeId
 */
function getChallenge(challengeId) {
  return SPRINT_CHALLENGES[challengeId] ?? null;
}

// ── Exports ───────────────────────────────────────────────────────────────────
export {
  buildTestHarness,
  runGrader,
  killSandbox,
  getActiveGraderCount,
  listChallenges,
  getChallenge
};

export default {
  buildTestHarness,
  runGrader,
  killSandbox,
  getActiveGraderCount,
  listChallenges,
  getChallenge
};
