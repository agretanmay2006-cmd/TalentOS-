/**
 * reportingRoutes.js
 * REST API routes for Agent 6 – Guidance & Reporting Engine
 */

import { Router } from 'express';
import {
  getFraudScorecard,
  getHackathonLeaderboards,
  getTalentHeatmap,
  getSprintTranscripts,
  getCandidateGuidanceRoadmap
} from '../services/agent6ReportingService.js';

const router = Router();

/**
 * GET /api/reports/fraud-scorecard
 * Aggregated fraud scorecards, SHA-256 hashes, AI synthetic text metrics.
 */
router.get('/fraud-scorecard', async (req, res) => {
  try {
    const data = await getFraudScorecard();
    return res.json({ success: true, ...data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate fraud scorecard', message: err.message });
  }
});

/**
 * GET /api/reports/hackathon-leaderboard
 * Ranked list of hackathon pitch deck submissions by VLM scores.
 */
router.get('/hackathon-leaderboard', async (req, res) => {
  try {
    const data = await getHackathonLeaderboards();
    return res.json({ success: true, ...data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch leaderboard', message: err.message });
  }
});

/**
 * GET /api/reports/talent-heatmap
 * Skill distribution and candidate commit activity heatmaps.
 */
router.get('/talent-heatmap', async (req, res) => {
  try {
    const data = await getTalentHeatmap();
    return res.json({ success: true, ...data });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch talent heatmap', message: err.message });
  }
});

/**
 * GET /api/reports/sprint-transcripts
 * Shadow Sprint coding audit logs, Alex hints, and terminal output.
 */
router.get('/sprint-transcripts', (req, res) => {
  try {
    const { sessionId } = req.query;
    const transcripts = getSprintTranscripts(sessionId);
    return res.json({ success: true, transcripts });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch sprint transcripts', message: err.message });
  }
});

/**
 * GET /api/reports/guidance-roadmap/:email
 * Candidate career guidance roadmap, skill gap analysis, and progression tree.
 */
router.get('/guidance-roadmap/:email', async (req, res) => {
  const { email } = req.params;
  if (!email) {
    return res.status(400).json({ error: 'email is required' });
  }

  try {
    const roadmap = await getCandidateGuidanceRoadmap(email.trim());
    return res.json({ success: true, ...roadmap });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate guidance roadmap', message: err.message });
  }
});

export default router;
