/**
 * agent5CopilotService.js
 * Agent 5A – Graph & Search Copilot
 *
 * Translates recruiter natural language prompts into a hybrid
 * Cypher (Neo4j) + vector (Qdrant) query, then merges and ranks results.
 */

import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { getSession } from '../config/neo4j.js';
import { searchCandidates } from './qdrantService.js';

// ─── Gemini client ────────────────────────────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── Zod schema for LLM output validation ─────────────────────────────────────
const QuerySchema = z.object({
  cypher: z.string().min(5),
  vectorQuery: z.string().min(2),
  filters: z.object({
    fraudFlag: z.boolean().optional(),
    aiGeneratedFlag: z.boolean().optional(),
    minCommits: z.number().optional(),
    proficiency: z.string().optional()
  }).optional().default({})
});

// ─── Cypher whitelist validator ────────────────────────────────────────────────
const ALLOWED_CLAUSES = /^(MATCH|OPTIONAL\s+MATCH|WITH|WHERE|RETURN|ORDER\s+BY|LIMIT|SKIP|UNWIND|CALL|YIELD|AS|AND|OR|NOT|IN|IS|NULL|TRUE|FALSE|DISTINCT|COUNT|COLLECT|SUM|AVG|MIN|MAX|SIZE|EXISTS|CASE|WHEN|THEN|ELSE|END)/i;
const FORBIDDEN_CLAUSES = /(CREATE|DELETE|DETACH|MERGE|SET|REMOVE|DROP|CALL\s*\{[^}]*(?:CREATE|DELETE|MERGE|SET|REMOVE)[^}]*\})/i;

export const validateCypher = (cypher) => {
  if (!cypher || typeof cypher !== 'string') {
    throw new Error('Cypher query must be a non-empty string.');
  }
  const trimmed = cypher.trim().toUpperCase();
  if (!trimmed.startsWith('MATCH') && !trimmed.startsWith('OPTIONAL MATCH') && !trimmed.startsWith('WITH') && !trimmed.startsWith('CALL')) {
    throw new Error('Cypher query must begin with MATCH, OPTIONAL MATCH, WITH, or CALL.');
  }
  if (FORBIDDEN_CLAUSES.test(cypher)) {
    throw new Error('Cypher query contains forbidden write clauses (CREATE, DELETE, MERGE, SET, REMOVE, DROP).');
  }
  return true;
};

// ─── NL → Query translation (Gemini) ─────────────────────────────────────────
export const translateToQuery = async (prompt) => {
  const systemPrompt = `You are a Neo4j Cypher expert for a talent recruitment platform.

Graph Schema:
  (:Candidate {id, name, email, fraudFlag: Boolean, aiGeneratedFlag: Boolean})
  (:Skill {name, category})
  (:Project {id, name, description})
  (:Commit {hash, message, date})
  
  (:Candidate)-[:HAS_SKILL {proficiency}]->(:Skill)
  (:Candidate)-[:WORKED_ON {role}]->(:Project)
  (:Candidate)-[:COMMITTED]->(:Commit)
  (:Commit)-[:BELONGS_TO]->(:Project)

Instructions:
- Generate a read-only Cypher MATCH query (no CREATE/MERGE/SET/DELETE).
- Always RETURN c.email, c.name, c.fraudFlag, c.aiGeneratedFlag, and relevant counts.
- Include a vectorQuery string for semantic similarity search.
- Set filters for any boolean/numeric conditions mentioned.

Output ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "cypher": "<MATCH-only Cypher with RETURN>",
  "vectorQuery": "<short semantic description for vector similarity>",
  "filters": {
    "fraudFlag": false,
    "aiGeneratedFlag": false,
    "minCommits": 0,
    "proficiency": ""
  }
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [
      { role: 'user', parts: [{ text: `${systemPrompt}\n\nRecruiter prompt: "${prompt}"` }] }
    ]
  });

  const raw = response.text?.trim();
  if (!raw) throw new Error('Gemini returned empty response for query translation.');

  // Strip markdown fences if present
  const jsonText = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${raw.substring(0, 200)}`);
  }

  // Validate with Zod
  const validated = QuerySchema.parse(parsed);
  return validated;
};

// ─── Execute Cypher (read-only) ───────────────────────────────────────────────
export const runCypherSearch = async (cypher, limit = 20) => {
  // Validate before running
  validateCypher(cypher);

  // Inject LIMIT if not present
  const safeQuery = cypher.includes('LIMIT') ? cypher : `${cypher} LIMIT ${limit}`;

  const session = getSession();
  try {
    const result = await session.run(safeQuery);
    return result.records.map(rec => {
      const obj = {};
      rec.keys.forEach(key => {
        const val = rec.get(key);
        // Convert Neo4j integers
        obj[key] = val && typeof val === 'object' && val.toNumber ? val.toNumber() : val;
      });
      return obj;
    });
  } finally {
    await session.close();
  }
};

// ─── Hybrid search: Neo4j + Qdrant merge ─────────────────────────────────────
export const runHybridSearch = async (query, limit = 10) => {
  const { cypher, vectorQuery, filters } = query;

  // Run both in parallel
  const [neo4jRaw, qdrantRaw] = await Promise.allSettled([
    runCypherSearch(cypher, limit * 2).catch(() => []),
    searchCandidates(vectorQuery, limit * 2).catch(() => [])
  ]);

  const neo4jResults = neo4jRaw.status === 'fulfilled' ? neo4jRaw.value : [];
  const qdrantResults = qdrantRaw.status === 'fulfilled' ? qdrantRaw.value : [];

  return mergeAndRankResults(neo4jResults, qdrantResults, filters, limit);
};

// ─── Merge + composite score ──────────────────────────────────────────────────
export const mergeAndRankResults = (neo4jResults, qdrantResults, filters = {}, limit = 10) => {
  const map = new Map();

  // Index Neo4j results (graph rank = position-based score)
  neo4jResults.forEach((rec, idx) => {
    const email = rec['c.email'] || rec.email;
    if (!email) return;
    map.set(email, {
      email,
      name: rec['c.name'] || rec.name || '',
      fraudFlag: rec['c.fraudFlag'] ?? rec.fraudFlag ?? false,
      aiGeneratedFlag: rec['c.aiGeneratedFlag'] ?? rec.aiGeneratedFlag ?? false,
      commitCount: rec.commitCount || rec['commitCount'] || 0,
      skills: rec.skills || [],
      graphScore: 1 - (idx / Math.max(neo4jResults.length, 1)), // normalize 0-1
      vectorScore: 0,
      compositeScore: 0
    });
  });

  // Merge Qdrant scores
  qdrantResults.forEach((hit, idx) => {
    const email = hit.email;
    if (!email) return;
    const vectorScore = hit.score || (1 - idx / Math.max(qdrantResults.length, 1));
    if (map.has(email)) {
      map.get(email).vectorScore = vectorScore;
      map.get(email).skills = hit.skills || map.get(email).skills;
    } else {
      map.set(email, {
        email,
        name: hit.name || '',
        fraudFlag: false,
        aiGeneratedFlag: false,
        commitCount: 0,
        skills: hit.skills || [],
        graphScore: 0,
        vectorScore,
        compositeScore: 0
      });
    }
  });

  // Apply filters and compute composite score
  let results = [...map.values()];

  if (filters.fraudFlag === false) {
    results = results.filter(r => !r.fraudFlag);
  }
  if (filters.aiGeneratedFlag === false) {
    results = results.filter(r => !r.aiGeneratedFlag);
  }
  if (filters.minCommits) {
    results = results.filter(r => r.commitCount >= filters.minCommits);
  }

  results.forEach(r => {
    r.compositeScore = parseFloat((0.6 * r.graphScore + 0.4 * r.vectorScore).toFixed(4));
  });

  return results
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .slice(0, limit);
};

// ─── Explain results in plain English ────────────────────────────────────────
export const explainResults = async (prompt, results) => {
  if (!results || results.length === 0) {
    return 'No candidates matched your search criteria.';
  }
  const summary = results.slice(0, 5).map(r =>
    `${r.name} (${r.email}): score=${r.compositeScore}, commits=${r.commitCount}, skills=${(r.skills || []).join(', ')}`
  ).join('\n');

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [{
      role: 'user',
      parts: [{
        text: `Recruiter searched: "${prompt}"
Top results:
${summary}

Write a single clear sentence (max 30 words) summarizing what was found. No markdown.`
      }]
    }]
  });

  return response.text?.trim() || `Found ${results.length} matching candidates.`;
};

// ─── Main entry point ─────────────────────────────────────────────────────────
export const copilotSearch = async (prompt, limit = 10) => {
  const query = await translateToQuery(prompt);
  const results = await runHybridSearch(query, limit);
  const explanation = await explainResults(prompt, results).catch(() => `Found ${results.length} candidates.`);
  return { query, results, explanation };
};

export default {
  validateCypher,
  translateToQuery,
  runCypherSearch,
  runHybridSearch,
  mergeAndRankResults,
  explainResults,
  copilotSearch
};
