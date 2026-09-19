/**
 * copilotRoutes.js
 * REST API routes for Agent 5A – Graph & Search Copilot
 */

import { Router } from 'express';
import {
  copilotSearch,
  validateCypher,
  translateToQuery
} from '../services/agent5CopilotService.js';

const router = Router();

// In-memory cache of last search per IP (for /explain re-fetch)
const lastSearchCache = new Map();

/**
 * POST /api/copilot/search
 * Main recruiter natural-language search endpoint.
 *
 * Body: { prompt: string, limit?: number }
 * Returns: { query, explanation, results, meta }
 */
router.post('/search', async (req, res) => {
  const { prompt, limit = 10 } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'prompt must be a non-empty string (min 3 characters).'
    });
  }

  const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50);

  try {
    const startTime = Date.now();
    const { query, results, explanation } = await copilotSearch(prompt.trim(), safeLimit);
    const elapsed = Date.now() - startTime;

    const response = {
      prompt: prompt.trim(),
      explanation,
      query: {
        cypher: query.cypher,
        vectorQuery: query.vectorQuery,
        filters: query.filters
      },
      results,
      meta: {
        totalFound: results.length,
        searchMode: 'hybrid',
        elapsedMs: elapsed,
        timestamp: new Date().toISOString()
      }
    };

    // Cache for /explain re-fetch
    const cacheKey = req.ip || 'default';
    lastSearchCache.set(cacheKey, { prompt, explanation, results, cachedAt: Date.now() });

    return res.json(response);
  } catch (err) {
    console.error('[CopilotRoutes] Search error:', err.message);

    // Distinguish quota / API errors from internal errors
    if (err.message?.includes('429') || err.message?.includes('quota')) {
      return res.status(429).json({
        error: 'API quota exceeded',
        message: 'Gemini API rate limit hit. Please retry in a few seconds.',
        retryAfterSeconds: 30
      });
    }

    return res.status(500).json({
      error: 'Search failed',
      message: err.message
    });
  }
});

/**
 * POST /api/copilot/translate
 * Translate a NL prompt to Cypher + vectorQuery without running the search.
 * Useful for previewing / debugging the generated query.
 *
 * Body: { prompt: string }
 */
router.post('/translate', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'prompt is required' });

  try {
    const query = await translateToQuery(prompt.trim());
    return res.json({ query });
  } catch (err) {
    return res.status(500).json({ error: 'Translation failed', message: err.message });
  }
});

/**
 * POST /api/copilot/validate-cypher
 * Developer utility — validate a raw Cypher string for whitelist compliance.
 *
 * Body: { cypher: string }
 */
router.post('/validate-cypher', (req, res) => {
  const { cypher } = req.body;
  if (!cypher) return res.status(400).json({ error: 'cypher is required' });

  try {
    validateCypher(cypher);
    return res.json({ valid: true, message: 'Cypher passed whitelist validation.' });
  } catch (err) {
    return res.status(422).json({ valid: false, message: err.message });
  }
});

/**
 * GET /api/copilot/explain/:cacheKey
 * Re-fetch the explanation from the last search (session-cached).
 */
router.get('/explain', (req, res) => {
  const cacheKey = req.ip || 'default';
  const cached = lastSearchCache.get(cacheKey);

  if (!cached) {
    return res.status(404).json({ error: 'No recent search found. Run /copilot/search first.' });
  }

  return res.json({
    prompt: cached.prompt,
    explanation: cached.explanation,
    resultCount: cached.results.length,
    cachedAt: cached.cachedAt
  });
});

export default router;
