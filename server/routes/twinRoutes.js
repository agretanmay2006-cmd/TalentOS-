/**
 * twinRoutes.js
 * REST API routes for Agent 5B – Candidate Digital Twin
 */

import { Router } from 'express';
import {
  createTwinSession,
  buildContextSnapshot,
  pruneSession,
  startMockInterview,
  evaluateInterviewAnswer,
  getActiveSessions
} from '../services/agent5TwinService.js';

const router = Router();

/**
 * POST /api/twin/session
 * Create a new digital twin session for a candidate.
 *
 * Body: { candidateEmail: string, mode?: 'candidate' | 'recruiter' }
 * Returns: { sessionId, snapshot }
 */
router.post('/session', async (req, res) => {
  const { candidateEmail, mode = 'candidate' } = req.body;

  if (!candidateEmail || typeof candidateEmail !== 'string') {
    return res.status(400).json({ error: 'candidateEmail is required.' });
  }
  if (!['candidate', 'recruiter'].includes(mode)) {
    return res.status(400).json({ error: "mode must be 'candidate' or 'recruiter'." });
  }

  try {
    const { sessionId, snapshot } = await createTwinSession(candidateEmail.trim(), mode);
    return res.status(201).json({ sessionId, snapshot });
  } catch (err) {
    if (err.message?.includes('No candidate found')) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Session creation failed', message: err.message });
  }
});

/**
 * GET /api/twin/session/:sessionId/snapshot
 * Re-fetch the candidate graph snapshot for an active session.
 */
router.get('/session/:sessionId/snapshot', async (req, res) => {
  const { sessionId } = req.params;

  // Import getSession2 dynamically to avoid circular import issues
  const { getSession2 } = await import('../services/agent5TwinService.js');
  const session = getSession2(sessionId);

  if (!session) {
    return res.status(404).json({ error: `Session not found: ${sessionId}` });
  }

  return res.json({ sessionId, snapshot: session.snapshot, mode: session.mode });
});

/**
 * POST /api/twin/session/:sessionId/interview/start
 * Generate commit-aware mock interview questions for this session.
 *
 * Returns: { sessionId, questions: string[] }
 */
router.post('/session/:sessionId/interview/start', async (req, res) => {
  const { sessionId } = req.params;

  try {
    const questions = await startMockInterview(sessionId);
    return res.json({ sessionId, questions });
  } catch (err) {
    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message?.includes('429') || err.message?.includes('quota')) {
      return res.status(429).json({ error: 'API quota exceeded', retryAfterSeconds: 30 });
    }
    return res.status(500).json({ error: 'Interview generation failed', message: err.message });
  }
});

/**
 * POST /api/twin/session/:sessionId/interview/evaluate
 * Evaluate a candidate's interview answer.
 *
 * Body: { question: string, answer: string }
 * Returns: { sessionId, score, strengths, improvements, verdict }
 */
router.post('/session/:sessionId/interview/evaluate', async (req, res) => {
  const { sessionId } = req.params;
  const { question, answer } = req.body;

  if (!question || !answer) {
    return res.status(400).json({ error: 'Both question and answer are required.' });
  }

  try {
    const evaluation = await evaluateInterviewAnswer(sessionId, question, answer);
    return res.json({ sessionId, ...evaluation });
  } catch (err) {
    if (err.message?.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message?.includes('429') || err.message?.includes('quota')) {
      return res.status(429).json({ error: 'API quota exceeded', retryAfterSeconds: 30 });
    }
    return res.status(500).json({ error: 'Evaluation failed', message: err.message });
  }
});

/**
 * DELETE /api/twin/session/:sessionId
 * Destroy a twin session.
 */
router.delete('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const existed = pruneSession(sessionId);

  if (!existed) {
    return res.status(404).json({ error: `Session not found: ${sessionId}` });
  }
  return res.json({ message: `Session ${sessionId} terminated.` });
});

/**
 * GET /api/twin/status
 * Returns count of active twin sessions (for monitoring).
 */
router.get('/status', (req, res) => {
  return res.json({
    activeSessions: getActiveSessions(),
    timestamp: new Date().toISOString()
  });
});

export default router;
