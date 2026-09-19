const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { initSession, getSession, requestAlexCopilotHint, runSandboxedCode } = require('../agents/agent4-shadowSprint');
const { computeCompositeScore } = require('../agents/agent6-reporting');

const CHALLENGES = [
  {
    id: 'two-sum-fast',
    title: 'Two Sum O(N) Optimized',
    difficulty: 'Medium',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You must solve it in O(N) time complexity.',
    starterCode: `// Function must be attached to global
global.solution = function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) {
      return [map.get(diff), i];
    }
    map.set(nums[i], i);
  }
  return [];
};`,
    testCases: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
      { input: [[3, 3], 6], expected: [0, 1] }
    ]
  },
  {
    id: 'lru-cache',
    title: 'LRU Cache Design',
    difficulty: 'Hard',
    description: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache with get and put in O(1) average time.',
    starterCode: `global.solution = function isPalindrome(s) {
  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === clean.split('').reverse().join('');
};`,
    testCases: [
      { input: ['A man, a plan, a canal: Panama'], expected: true },
      { input: ['race a car'], expected: false }
    ]
  }
];

/**
 * GET /api/sprint/problems
 */
router.get('/problems', (req, res) => {
  res.json({
    challenges: CHALLENGES.map(c => ({ id: c.id, title: c.title, difficulty: c.difficulty, description: c.description }))
  });
});

/**
 * GET /api/sprint/problem/:id
 */
router.get('/problem/:id', (req, res) => {
  const challenge = CHALLENGES.find(c => c.id === req.params.id) || CHALLENGES[0];
  res.json(challenge);
});

/**
 * POST /api/sprint/session
 */
router.post('/session', (req, res) => {
  const { sessionId, candidateEmail } = req.body;
  const session = initSession(sessionId || `sprint_${Date.now()}`, candidateEmail || 'anonymous');
  res.json({ success: true, session });
});

/**
 * POST /api/sprint/hint (Alex Copilot)
 */
router.post('/hint', async (req, res) => {
  try {
    const { sessionId, problemStatement, userCode, query } = req.body;
    const result = await requestAlexCopilotHint({
      sessionId: sessionId || 'default_sprint',
      problemStatement,
      userCode,
      userQuery: query
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sprint/grade (Sandboxed evaluation + composite score calculation)
 */
router.post('/grade', async (req, res) => {
  try {
    const { sessionId, code, challengeId } = req.body;
    const challenge = CHALLENGES.find(c => c.id === challengeId) || CHALLENGES[0];
    const session = getSession(sessionId);

    const testResults = await runSandboxedCode({
      code,
      testCases: challenge.testCases
    });

    const hintsCount = session ? session.hintsRequested.length : 0;
    const composite = computeCompositeScore({
      testCorrectnessPercentage: testResults.correctnessPercentage,
      executionTimeMs: testResults.executionTimeMs,
      hintsCount
    });

    res.json({
      testResults,
      compositeScore: composite.compositeScore,
      breakdown: composite.breakdown
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
