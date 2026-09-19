const express = require('express');
const router = express.Router();
const multer = require('multer');
const { hashPassword, comparePassword, generateToken, authenticateToken, requireRole } = require('../middleware/auth');
const { processEventPitchSubmission } = require('../agents/agent2-eventPitch');
const { generateCandidateReport, getFraudScorecard, getHackathonLeaderboards, getTalentHeatmap } = require('../agents/agent6-reporting');
const { getSession } = require('../db/neo4j');

const upload = multer({ storage: multer.memoryStorage() });

// In-memory recruiter DB (for dev/fallback)
const recruiterDB = new Map();

// Seed demo recruiter
recruiterDB.set('hr@company.io', {
  email: 'hr@company.io',
  name: 'Sarah HR Leader',
  company: 'Vertex AI Labs',
  passwordHash: hashPassword('recruit123'),
  role: 'recruiter'
});

/**
 * POST /api/recruiters/register
 */
router.post('/register', (req, res) => {
  const { email, password, name, company } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (recruiterDB.has(email)) {
    return res.status(409).json({ error: 'Recruiter account already exists' });
  }

  const newRecruiter = {
    email,
    name: name || 'Recruiting Partner',
    company: company || 'Tech Corp',
    passwordHash: hashPassword(password),
    role: 'recruiter'
  };

  recruiterDB.set(email, newRecruiter);
  const token = generateToken({
    email: newRecruiter.email,
    name: newRecruiter.name,
    company: newRecruiter.company,
    role: 'recruiter'
  });

  res.status(201).json({
    message: 'Recruiter registered successfully',
    token,
    user: { email: newRecruiter.email, name: newRecruiter.name, company: newRecruiter.company, role: 'recruiter' }
  });
});

/**
 * POST /api/recruiters/login
 */
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const recruiter = recruiterDB.get(email);
  if (!recruiter || !comparePassword(password, recruiter.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = generateToken({
    email: recruiter.email,
    name: recruiter.name,
    company: recruiter.company,
    role: 'recruiter'
  });

  res.json({
    message: 'Login successful',
    token,
    user: { email: recruiter.email, name: recruiter.name, company: recruiter.company, role: 'recruiter' }
  });
});

/**
 * POST /api/recruiters/webhook/pitch (Agent 2 Webhook receiver)
 */
router.post('/webhook/pitch', upload.single('pitchDeck'), async (req, res) => {
  try {
    const source = req.query.source || req.headers['x-webhook-source'] || 'devpost';
    const body = req.body;
    const fileBuffer = req.file ? req.file.buffer : null;
    const mimeType = req.file ? req.file.mimetype : 'application/pdf';

    const result = await processEventPitchSubmission({
      source,
      body,
      pitchText: body.pitchText || '',
      fileBuffer,
      mimeType
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[Pitch Webhook Error]:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/recruiters/cockpit (Aggregated hiring statistics)
 */
router.get('/cockpit', async (req, res) => {
  try {
    const scorecardData = await getFraudScorecard();
    const heatmapData = await getTalentHeatmap();
    const leaderboards = await getHackathonLeaderboards();

    res.json({
      totalCandidates: scorecardData.summary.totalIngested,
      fraudFlaggedCount: scorecardData.summary.flaggedFraud,
      cleanCandidatesCount: scorecardData.summary.cleanProfiles,
      integrityRate: scorecardData.summary.integrityRate,
      topSkills: heatmapData.map(h => h.skill).slice(0, 8),
      leaderboards: leaderboards.slice(0, 5)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/recruiters/fraud-scorecard
 */
router.get('/fraud-scorecard', async (req, res) => {
  try {
    const data = await getFraudScorecard();
    res.json({ success: true, ...data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate fraud scorecard', message: err.message });
  }
});

/**
 * GET /api/recruiters/hackathon-leaderboard
 */
router.get('/hackathon-leaderboard', async (req, res) => {
  try {
    const data = await getHackathonLeaderboards();
    res.json({ success: true, leaderboard: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard', message: err.message });
  }
});

/**
 * GET /api/recruiters/talent-heatmap
 */
router.get('/talent-heatmap', async (req, res) => {
  try {
    const data = await getTalentHeatmap();
    res.json({ success: true, heatmap: data });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch talent heatmap', message: err.message });
  }
});

/**
 * GET /api/recruiters/candidate-report/:email (Agent 6 composite scoring report)
 */
router.get('/candidate-report/:email', (req, res) => {
  const email = req.params.email;
  const report = generateCandidateReport({
    candidateEmail: email,
    candidateName: email.split('@')[0],
    sprintResult: { correctnessPercentage: 100, executionTimeMs: 120, hintsUsed: 0 },
    codeIntelResult: { codeQualityScore: 92 },
    ingestionAudit: { fraudFlag: false, sha256: 'a1b2c3d4e5f67890...' },
    pitchScorecard: { compositeVlmScore: 88 }
  });

  res.json(report);
});

module.exports = router;
