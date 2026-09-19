const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { callGeminiWithTelemetry } = require('../services/tokenTelemetry');

// In-memory active session stores: sessionId -> { candidateEmail, hintsRequested: [], startTime, submissions: [] }
const activeCodingSessions = new Map();

function initSession(sessionId, candidateEmail) {
  const session = {
    sessionId,
    candidateEmail,
    startTime: Date.now(),
    hintsRequested: [],
    submissions: []
  };
  activeCodingSessions.set(sessionId, session);
  return session;
}

function getSession(sessionId) {
  return activeCodingSessions.get(sessionId) || null;
}

/**
 * "Alex" AI Copilot - provides progressive coding hints and logs every hint requested.
 */
async function requestAlexCopilotHint({
  sessionId,
  problemStatement,
  userCode,
  userQuery = 'Give me a hint on solving this efficiently'
}) {
  const session = activeCodingSessions.get(sessionId) || initSession(sessionId, 'anonymous_coder');

  const prompt = `
You are "Alex", an AI pairing copilot assisting a candidate in a timed technical coding sprint.
Your objective is to provide a gentle, instructive hint or algorithmic direction WITHOUT giving away the full code solution.

Problem Statement:
${problemStatement || 'Solve the algorithmic problem efficiently.'}

Candidate Current Code:
\`\`\`javascript
${userCode || '// No code written yet'}
\`\`\`

Candidate Question:
"${userQuery}"

Provide a concise, helpful 2-4 sentence hint to unblock the candidate.
`;

  const hintResponse = await callGeminiWithTelemetry({
    sessionId,
    contents: prompt,
    fallbackFn: () => ({
      text: 'Consider using a hash map to achieve O(N) time complexity instead of an O(N^2) nested loop. Check your edge cases for empty or single-element inputs.'
    })
  });

  const hintText = hintResponse.text || 'Focus on optimizing time and space complexity with appropriate data structures.';

  // Log the hint request in the session for human preference bonus calculation
  session.hintsRequested.push({
    timestamp: Date.now(),
    query: userQuery,
    hintGiven: hintText
  });

  return {
    hint: hintText,
    totalHintsRequested: session.hintsRequested.length
  };
}

/**
 * Runs submitted candidate code against unit tests in a sandboxed child process with strict timeout.
 *
 * On success: resolves with { success, passedCount, totalCount, executionTimeMs, correctnessPercentage, testResults }
 * On timeout / process crash: REJECTS with an Error whose message contains "Sandbox timeout" or the stderr output.
 * This allows callers and test suites to use try/catch or .catch() for failure handling.
 */
async function runSandboxedCode({
  code,
  testCases = [],
  timeoutMs = 4000,
  onLog = () => {}
}) {
  const tmpDir = os.tmpdir();
  const runnerFile = path.join(tmpDir, `talentos_runner_${Date.now()}_${Math.random().toString(36).slice(2)}.js`);

  // Build sandboxed runner script
  const runnerSource = `
    const vm = require('vm');
    const startTime = Date.now();
    let passedCount = 0;
    const testResults = [];
    const testCases = ${JSON.stringify(testCases)};

    try {
      // Run candidate code in the global context so function declarations
      // land on the global object and are accessible via global[fnName]
      vm.runInThisContext(${JSON.stringify(code)});

      // Run test cases
      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const fnName = tc.functionName || 'solution';
        if (typeof global[fnName] !== 'function') {
          throw new Error(\`Function "\${fnName}" is not defined in submitted code.\`);
        }
        
        const output = global[fnName](...tc.input);
        const passed = JSON.stringify(output) === JSON.stringify(tc.expected);
        if (passed) passedCount++;
        testResults.push({
          testCase: i + 1,
          input: tc.input,
          expected: tc.expected,
          actual: output,
          passed
        });
      }

      const executionTimeMs = Date.now() - startTime;
      console.log(JSON.stringify({
        success: true,
        passedCount,
        totalCount: testCases.length,
        executionTimeMs,
        testResults
      }));
    } catch (err) {
      console.log(JSON.stringify({
        success: false,
        error: err.message,
        passedCount: 0,
        totalCount: testCases.length,
        executionTimeMs: Date.now() - startTime,
        testResults: []
      }));
    }
  `;

  fs.writeFileSync(runnerFile, runnerSource, 'utf8');

  return new Promise((resolve, reject) => {
    let outputData = '';
    let errorData = '';

    const child = spawn(process.execPath, [runnerFile], {
      timeout: timeoutMs,
      env: { NODE_ENV: 'sandbox' }
    });

    child.stdout.on('data', (data) => {
      const str = data.toString();
      outputData += str;
      onLog({ type: 'stdout', message: str });
    });

    child.stderr.on('data', (data) => {
      const str = data.toString();
      errorData += str;
      onLog({ type: 'stderr', message: str });
    });

    child.on('close', (exitCode, signal) => {
      // Clean up tmp file
      try { fs.unlinkSync(runnerFile); } catch (e) {}

      // REJECTED path: process timed out (signal SIGTERM/null) or crashed with no output
      if (exitCode !== 0 || signal) {
        const timeoutHint = signal || exitCode === null ? ' (Sandbox timeout)' : '';
        const errMsg = errorData
          ? `${errorData.trim()}${timeoutHint}`
          : `Sandbox timeout — process exited with code ${exitCode}${timeoutHint}`;
        return reject(new Error(errMsg));
      }

      // RESOLVED path: process exited cleanly, parse the JSON result
      if (!outputData.trim()) {
        return reject(new Error('Sandbox produced no output'));
      }

      try {
        const parsed = JSON.parse(outputData.trim());
        const total = parsed.totalCount || 1;
        parsed.correctnessPercentage = Number(((parsed.passedCount / total) * 100).toFixed(2));
        resolve(parsed);
      } catch (parseErr) {
        reject(new Error(`Failed to parse sandbox output: ${parseErr.message}`));
      }
    });
  });
}

/**
 * Socket.io Namespace Setup for ShadowSprint
 */
function setupShadowSprintSocket(io) {
  const sprintNamespace = io.of('/sprint');

  sprintNamespace.on('connection', (socket) => {
    let currentSessionId = null;

    socket.on('join_session', ({ sessionId, candidateEmail }) => {
      currentSessionId = sessionId;
      socket.join(sessionId);
      initSession(sessionId, candidateEmail);
      socket.emit('session_ready', { sessionId, message: 'Connected to ShadowSprint sandbox' });
    });

    socket.on('request_hint', async ({ sessionId, problemStatement, userCode, query }) => {
      try {
        const result = await requestAlexCopilotHint({
          sessionId: sessionId || currentSessionId,
          problemStatement,
          userCode,
          userQuery: query
        });
        socket.emit('hint_response', result);
      } catch (err) {
        socket.emit('hint_error', { error: err.message });
      }
    });

    socket.on('submit_code', async ({ sessionId, code, testCases }) => {
      const activeSession = getSession(sessionId || currentSessionId);
      socket.emit('grading_status', { status: 'running_tests' });

      const result = await runSandboxedCode({
        code,
        testCases,
        onLog: (log) => socket.emit('terminal_log', log)
      });

      if (activeSession) {
        activeSession.submissions.push({
          timestamp: Date.now(),
          result
        });
      }

      socket.emit('grading_complete', {
        result,
        hintsUsed: activeSession ? activeSession.hintsRequested.length : 0
      });
    });
  });

  return sprintNamespace;
}

module.exports = {
  initSession,
  getSession,
  requestAlexCopilotHint,
  runSandboxedCode,
  setupShadowSprintSocket
};
