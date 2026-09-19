/**
 * agent4AlexService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Agent 4 – AI Teammate "Alex"
 * Manages Gemini-powered coding mentor sessions.
 *
 * Alex's persona:
 *   - Senior engineer, mid-sprint, slightly impatient but always helpful.
 *   - Gives architectural hints ONLY – never writes direct code fixes.
 *   - Keeps responses to ≤ 3 sentences.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { GoogleGenAI } from '@google/genai';

// ── System Prompt ─────────────────────────────────────────────────────────────
const ALEX_SYSTEM_PROMPT = `
You are Alex, a senior software engineer at a fast-moving startup called TalentOS.
You are currently in the middle of a sprint and briefly reviewing a candidate's debugging session.

STRICT RULES you must follow at all times:
1. You NEVER write code for the candidate. No code snippets. No pseudocode. No function stubs.
2. You ask clarifying questions that guide the candidate to discover the answer themselves.
3. You reference the relevant algorithmic concept, design pattern, or documentation section — but do not implement it.
4. You keep your response to a maximum of 3 short sentences.
5. Your tone is direct, occasionally impatient ("look, think about what the loop invariant actually guarantees here"), but always professional and genuinely helpful.
6. If the candidate asks you to write code, firmly decline and redirect them to think through the problem.
`.trim();

// ── In-memory session store ───────────────────────────────────────────────────
// Map<sessionId, { ai, history: Array<{role, parts}>, createdAt }>
const alexSessions = new Map();

// Session TTL: 2 hours of inactivity → auto-prune
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;
const SESSION_WINDOW = 20; // Max messages to keep in sliding history window

// ── Session Lifecycle ─────────────────────────────────────────────────────────

/**
 * Creates a new Alex session for a candidate sprint.
 * @param {string} sessionId  - Unique session identifier (e.g., Socket.io socket.id)
 * @param {string} [language] - Programming language of the sprint challenge (optional context)
 * @param {string} [taskDesc] - Brief description of the task (optional context)
 * @returns {{ sessionId: string, createdAt: string }}
 */
function createAlexSession(sessionId, language = 'JavaScript', taskDesc = '') {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('[Agent4/Alex] GEMINI_API_KEY is not set in environment.');
  }

  const ai = new GoogleGenAI({ apiKey });

  // Build context-aware system primer
  const contextBlock = taskDesc
    ? `\n\nContext for this session: The candidate is debugging a ${language} challenge. Task: "${taskDesc}".`
    : `\n\nContext for this session: The candidate is debugging a ${language} challenge.`;

  alexSessions.set(sessionId, {
    ai,
    language,
    taskDesc,
    systemPrompt: ALEX_SYSTEM_PROMPT + contextBlock,
    history: [],
    createdAt: new Date().toISOString(),
    lastActiveAt: Date.now()
  });

  console.log(`[Agent4/Alex] Session created: ${sessionId} | Language: ${language}`);
  return { sessionId, createdAt: alexSessions.get(sessionId).createdAt };
}

/**
 * Sends a candidate message to Alex and receives a hint response.
 * @param {string} sessionId   - Existing session ID
 * @param {string} userMessage - The candidate's question or code description
 * @returns {Promise<string>}  - Alex's response text
 */
async function sendMessageToAlex(sessionId, userMessage) {
  const session = alexSessions.get(sessionId);
  if (!session) {
    throw new Error(`[Agent4/Alex] No active session found for ID: ${sessionId}`);
  }

  session.lastActiveAt = Date.now();

  // Append user message to history
  session.history.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  // Sliding window: keep only last N exchanges to manage token usage
  if (session.history.length > SESSION_WINDOW * 2) {
    session.history = session.history.slice(-SESSION_WINDOW * 2);
  }

  try {
    // Build full conversation content array
    const contents = [
      // Inject system prompt as first user turn (Gemini Flash pattern)
      {
        role: 'user',
        parts: [{ text: session.systemPrompt }]
      },
      {
        role: 'model',
        parts: [{ text: "Understood. I'll act as Alex throughout this session." }]
      },
      // Append conversation history
      ...session.history
    ];

    const response = await session.ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents
    });

    const reply =
      response.candidates?.[0]?.content?.parts?.[0]?.text ??
      "I'm in the middle of something — give me a second to look at what you're describing.";

    // Append Alex's reply to history
    session.history.push({
      role: 'model',
      parts: [{ text: reply }]
    });

    return reply;
  } catch (err) {
    console.error(`[Agent4/Alex] Gemini API error for session ${sessionId}:`, err.message);
    throw new Error(`Alex is temporarily unavailable: ${err.message}`);
  }
}

/**
 * Destroys an Alex session (called on socket disconnect).
 * @param {string} sessionId
 */
function destroyAlexSession(sessionId) {
  if (alexSessions.has(sessionId)) {
    alexSessions.delete(sessionId);
    console.log(`[Agent4/Alex] Session destroyed: ${sessionId}`);
    return true;
  }
  return false;
}

/**
 * Returns session metadata (without sensitive history) for diagnostics.
 * @param {string} sessionId
 */
function getSessionInfo(sessionId) {
  const session = alexSessions.get(sessionId);
  if (!session) return null;
  return {
    sessionId,
    language: session.language,
    taskDesc: session.taskDesc,
    messageCount: session.history.length,
    createdAt: session.createdAt,
    lastActiveAt: new Date(session.lastActiveAt).toISOString()
  };
}

/**
 * Returns count of active sessions.
 */
function getActiveSessionCount() {
  return alexSessions.size;
}

// ── TTL Pruner ────────────────────────────────────────────────────────────────
// Runs every 30 minutes, removes sessions idle for SESSION_TTL_MS
setInterval(() => {
  const now = Date.now();
  let pruned = 0;
  for (const [id, session] of alexSessions.entries()) {
    if (now - session.lastActiveAt > SESSION_TTL_MS) {
      alexSessions.delete(id);
      pruned++;
    }
  }
  if (pruned > 0) {
    console.log(`[Agent4/Alex] Pruned ${pruned} idle session(s).`);
  }
}, 30 * 60 * 1000).unref(); // .unref() prevents the timer from keeping the process alive

// ── Exports ───────────────────────────────────────────────────────────────────
export default {
  createAlexSession,
  sendMessageToAlex,
  destroyAlexSession,
  getSessionInfo,
  getActiveSessionCount
};
