/**
 * agent5TwinService.js
 * Agent 5B – Candidate Digital Twin
 *
 * Loads a candidate's verified graph snapshot and enables:
 *  - Conversational Q&A (first-person candidate / third-person recruiter)
 *  - Commit-aware mock interview question generation
 *  - LLM-based answer evaluation (score 1-10 + feedback)
 */

import { GoogleGenAI } from '@google/genai';
import { getSession } from '../config/neo4j.js';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ─── Session store ────────────────────────────────────────────────────────────
// Map<sessionId, { email, mode, snapshot, history, createdAt }>
const sessions = new Map();
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// ─── TTL pruner (runs every 15 minutes) ──────────────────────────────────────
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(id);
      console.log(`[TwinService] Pruned expired session: ${id}`);
    }
  }
}, 15 * 60 * 1000);

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.DISABLE_MOCK_FALLBACK === 'true';

// ─── Graph snapshot loader ────────────────────────────────────────────────────
export const buildContextSnapshot = async (email) => {
  try {
    const neo4jSession = getSession();
    try {
      const result = await neo4jSession.run(
        `MATCH (c:Candidate {email: $email})
         OPTIONAL MATCH (c)-[hs:HAS_SKILL]->(s:Skill)
         OPTIONAL MATCH (c)-[:WORKED_ON]->(p:Project)
         OPTIONAL MATCH (c)-[:COMMITTED]->(co:Commit)-[:BELONGS_TO]->(p2:Project)
         RETURN 
           c.name AS name,
           c.email AS email,
           c.fraudFlag AS fraudFlag,
           c.aiGeneratedFlag AS aiGeneratedFlag,
           collect(DISTINCT {skill: s.name, category: s.category, proficiency: hs.proficiency}) AS skills,
           collect(DISTINCT {project: p.name, description: p.description}) AS projects,
           collect(DISTINCT {hash: co.hash, message: co.message, date: co.date, project: p2.name})[0..20] AS recentCommits,
           count(DISTINCT co) AS totalCommits`,
        { email }
      );

      if (result.records.length > 0) {
        const rec = result.records[0];
        return {
          name: rec.get('name') || 'Candidate',
          email: rec.get('email') || email,
          fraudFlag: rec.get('fraudFlag') ?? false,
          aiGeneratedFlag: rec.get('aiGeneratedFlag') ?? false,
          skills: (rec.get('skills') || []).filter(s => s.skill),
          projects: (rec.get('projects') || []).filter(p => p.project),
          recentCommits: (rec.get('recentCommits') || []).filter(c => c.hash),
          totalCommits: rec.get('totalCommits')?.toNumber?.() ?? 0,
          snapshotAt: new Date().toISOString()
        };
      }
    } finally {
      await neo4jSession.close();
    }
  } catch (err) {
    console.error('[TwinService] Neo4j error while building context snapshot:', err.message);
    if (IS_PRODUCTION) throw err;
    console.warn('[TwinService] Neo4j offline. Using fallback context snapshot.');
  }

  // Fallback context snapshot when Neo4j is offline
  return {
    name: 'E2E Testing Architect',
    email: email,
    fraudFlag: false,
    aiGeneratedFlag: false,
    skills: [{ skill: 'GoLang', category: 'Languages', proficiency: 'Expert' }, { skill: 'Kubernetes', category: 'DevOps', proficiency: 'Expert' }],
    projects: [{ project: 'E2E Mesh Network', description: 'High scale distributed topology' }],
    recentCommits: [{ hash: 'commit_123', message: 'Optimize graph routing algorithm', date: new Date().toISOString(), project: 'E2E Mesh Network' }],
    totalCommits: 15,
    snapshotAt: new Date().toISOString()
  };
};

// ─── Build system prompt from snapshot ───────────────────────────────────────
const buildSystemPrompt = (snapshot, mode) => {
  const skillsList = snapshot.skills.map(s =>
    `${s.skill} (${s.category || 'General'}) — ${s.proficiency || 'Intermediate'}`
  ).join(', ') || 'None recorded';

  const projectsList = snapshot.projects.map(p =>
    `${p.project}${p.description ? ': ' + p.description : ''}`
  ).join('; ') || 'None recorded';

  const commitSample = snapshot.recentCommits.slice(0, 8).map(c =>
    `[${c.project || 'Unknown'}] ${c.message} (${c.date || 'N/A'})`
  ).join('\n') || 'No commits recorded';

  const flags = [];
  if (snapshot.fraudFlag) flags.push('⚠️ Fraud flag detected');
  if (snapshot.aiGeneratedFlag) flags.push('⚠️ AI-generated content detected');
  const flagStr = flags.length ? flags.join(', ') : 'None';

  if (mode === 'candidate') {
    return `You are the verified digital twin of ${snapshot.name}.
You speak ONLY in the first person ("I", "my", "me").
You ONLY discuss information present in the verified context below.
If asked about something not in your context, say: "I haven't worked on that yet."
Do NOT invent projects, skills, commits, or experiences.
Keep answers concise and direct.

--- Verified Context ---
Name: ${snapshot.name}
Email: ${snapshot.email}
Total Commits: ${snapshot.totalCommits}
Skills: ${skillsList}
Projects: ${projectsList}
Recent Commit History:
${commitSample}
Integrity Flags: ${flagStr}
Snapshot taken: ${snapshot.snapshotAt}
--- End Context ---`;
  }

  // recruiter mode
  return `You are an AI assistant helping a recruiter evaluate ${snapshot.name}.
Speak in the THIRD person ("This candidate", "They", "Their").
Provide objective, evidence-based summaries from the verified candidate graph below.
Do NOT speculate beyond the verified data. Flag any integrity concerns proactively.
Keep responses professional and concise.

--- Verified Candidate Profile ---
Name: ${snapshot.name}
Email: ${snapshot.email}
Total Commits: ${snapshot.totalCommits}
Skills: ${skillsList}
Projects: ${projectsList}
Recent Commit History:
${commitSample}
Integrity Flags: ${flagStr}
Snapshot taken: ${snapshot.snapshotAt}
--- End Profile ---`;
};

// ─── Create session ───────────────────────────────────────────────────────────
export const createTwinSession = async (candidateEmail, mode = 'candidate') => {
  if (!['candidate', 'recruiter'].includes(mode)) {
    throw new Error("mode must be 'candidate' or 'recruiter'.");
  }

  const snapshot = await buildContextSnapshot(candidateEmail);
  if (!snapshot) {
    throw new Error(`No candidate found with email: ${candidateEmail}`);
  }

  const sessionId = `twin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  sessions.set(sessionId, {
    email: candidateEmail,
    mode,
    snapshot,
    systemPrompt: buildSystemPrompt(snapshot, mode),
    history: [],
    createdAt: Date.now()
  });

  console.log(`[TwinService] Session created: ${sessionId} (${mode} mode) for ${candidateEmail}`);
  return { sessionId, snapshot };
};

// ─── Chat with Digital Twin ───────────────────────────────────────────────────
export const chat = async (sessionId, message) => {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Twin session not found: ${sessionId}`);

  // Maintain sliding window of 20 turns
  session.history.push({ role: 'user', parts: [{ text: message }] });
  if (session.history.length > 20) session.history = session.history.slice(-20);

  const contents = [
    { role: 'user', parts: [{ text: session.systemPrompt }] },
    { role: 'model', parts: [{ text: 'Understood. I am ready.' }] },
    ...session.history
  ];

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents
  });

  const reply = response.text?.trim() || 'I could not generate a response right now.';

  // Store model turn in history
  session.history.push({ role: 'model', parts: [{ text: reply }] });

  return reply;
};

// ─── Mock Interview: Generate questions ──────────────────────────────────────
export const startMockInterview = async (sessionId) => {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Twin session not found: ${sessionId}`);

  const { snapshot } = session;
  const commitSample = snapshot.recentCommits.slice(0, 10).map(c =>
    `- [${c.project || 'Unknown'}] "${c.message}"`
  ).join('\n') || '- No commits available';

  const skillsList = snapshot.skills.slice(0, 6).map(s => s.skill).join(', ') || 'general development';

  const prompt = `You are a senior technical interviewer.
Based on the candidate's REAL commit history and skills below, generate 4 targeted interview questions.
Questions should probe the DEPTH of their actual work (not generic questions).
Mix difficulty: 1 easy, 2 medium, 1 hard.
Return ONLY a JSON array of strings. No markdown, no explanation.

Candidate Skills: ${skillsList}
Recent Commits:
${commitSample}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });

  const raw = response.text?.trim()
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim();

  let questions;
  try {
    questions = JSON.parse(raw);
    if (!Array.isArray(questions)) throw new Error('Not an array');
  } catch {
    // Fallback: parse line-by-line
    questions = (raw || '').split('\n')
      .map(l => l.replace(/^[\d.\-*]\s*/, '').trim())
      .filter(l => l.length > 10)
      .slice(0, 4);
  }

  session.activeInterview = { questions, answers: [], startedAt: Date.now() };
  return questions;
};

// ─── Mock Interview: Evaluate answer ─────────────────────────────────────────
export const evaluateInterviewAnswer = async (sessionId, question, answer) => {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`Twin session not found: ${sessionId}`);

  const { snapshot } = session;
  const contextHint = `Candidate has: ${snapshot.skills.map(s => s.skill).join(', ')}. Total commits: ${snapshot.totalCommits}.`;

  const prompt = `You are a senior technical interviewer evaluating a candidate's answer.

Question: "${question}"
Candidate's Answer: "${answer}"
Candidate Context: ${contextHint}

Evaluate the answer. Return ONLY valid JSON (no markdown):
{
  "score": <integer 1-10>,
  "strengths": "<what was good>",
  "improvements": "<what could be better>",
  "verdict": "<one of: Excellent | Good | Adequate | Weak | Poor>"
}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });

  const raw = response.text?.trim()
    .replace(/^```(?:json)?\n?/, '')
    .replace(/\n?```$/, '')
    .trim();

  let evaluation;
  try {
    evaluation = JSON.parse(raw);
  } catch {
    evaluation = { score: 5, strengths: 'N/A', improvements: raw, verdict: 'Adequate' };
  }

  // Store answer in session
  if (session.activeInterview) {
    session.activeInterview.answers.push({ question, answer, evaluation });
  }

  return evaluation;
};

// ─── Destroy session ──────────────────────────────────────────────────────────
export const pruneSession = (sessionId) => {
  const existed = sessions.has(sessionId);
  sessions.delete(sessionId);
  return existed;
};

// ─── Accessors for status/test ────────────────────────────────────────────────
export const getSession2 = (sessionId) => sessions.get(sessionId);
export const getActiveSessions = () => sessions.size;

export default {
  buildContextSnapshot,
  createTwinSession,
  chat,
  startMockInterview,
  evaluateInterviewAnswer,
  pruneSession,
  getSession2,
  getActiveSessions
};
