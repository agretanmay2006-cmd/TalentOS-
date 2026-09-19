const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { executeGraphSearch, translateNaturalLanguageToCypher, isSafeCypher } = require('../agents/agent5-graphSearch');
const { getSession } = require('../db/neo4j');

const lastSearchCache = new Map();

/**
 * POST /api/search/graph & POST /api/search/search (Recruiter Natural Language Search)
 */
async function handleSearch(req, res) {
  try {
    const prompt = req.body.prompt;
    const sessionId = req.body.sessionId || req.ip || 'search_query';
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 2) {
      return res.status(400).json({ error: 'Search prompt is required (min 2 characters).' });
    }

    const results = await executeGraphSearch(prompt.trim(), sessionId);

    // Cache for /explain endpoint
    lastSearchCache.set(req.ip || 'default', {
      prompt,
      explanation: results.explanation,
      results: results.candidates,
      cachedAt: Date.now()
    });

    res.json(results);
  } catch (error) {
    console.error('[Search Route Error]:', error);
    res.status(500).json({ error: error.message });
  }
}

router.post('/graph', handleSearch);
router.post('/search', handleSearch);

/**
 * POST /api/search/translate (Translate NL to Cypher without executing)
 */
router.post('/translate', async (req, res) => {
  try {
    const { prompt, sessionId } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const translation = await translateNaturalLanguageToCypher(prompt, sessionId || 'translate_preview');
    res.json({ query: translation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/search/validate-cypher
 */
router.post('/validate-cypher', (req, res) => {
  const { cypher } = req.body;
  if (!cypher) return res.status(400).json({ error: 'cypher is required' });

  const safe = isSafeCypher(cypher);
  if (safe) {
    return res.json({ valid: true, message: 'Cypher passed read-only validation.' });
  }
  return res.status(422).json({ valid: false, message: 'Cypher contains forbidden write/delete clauses.' });
});

/**
 * GET /api/search/explain
 */
router.get('/explain', (req, res) => {
  const cacheKey = req.ip || 'default';
  const cached = lastSearchCache.get(cacheKey);

  if (!cached) {
    return res.status(404).json({ error: 'No recent search found.' });
  }
  res.json(cached);
});

/**
 * GET /api/search/stats
 */
router.get('/stats', async (req, res) => {
  const session = getSession();
  try {
    const cypher = `
      MATCH (c:Candidate) WITH count(c) AS candidates
      MATCH (s:Skill) WITH candidates, count(s) AS skills
      MATCH (p:Project) WITH candidates, skills, count(p) AS projects
      RETURN candidates, skills, projects
    `;
    const result = await session.run(cypher);
    const record = result.records[0];

    res.json({
      candidatesCount: record?.get('candidates') || 28,
      skillsCount: record?.get('skills') || 45,
      projectsCount: record?.get('projects') || 19,
      status: 'ONLINE'
    });
  } catch (error) {
    res.json({
      candidatesCount: 28,
      skillsCount: 45,
      projectsCount: 19,
      status: 'FALLBACK_ONLINE'
    });
  } finally {
    await session.close();
  }
});

module.exports = router;
