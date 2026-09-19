const { GoogleGenAI } = require('@google/genai');
require('dotenv').config();

const DEFAULT_SESSION_BUDGET = parseInt(process.env.TOKEN_BUDGET_PER_SESSION || '100000', 10);
const sessionTokens = new Map(); // sessionId -> { totalPromptTokens, totalCandidatesTokens, totalTokens, callCount, lastReset }

let aiClient = null;

function getAIClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      aiClient = new GoogleGenAI({ apiKey });
    }
  }
  return aiClient;
}

function getSessionUsage(sessionId) {
  if (!sessionTokens.has(sessionId)) {
    sessionTokens.set(sessionId, {
      totalPromptTokens: 0,
      totalCandidatesTokens: 0,
      totalTokens: 0,
      callCount: 0,
      budget: DEFAULT_SESSION_BUDGET,
      lastReset: new Date().toISOString()
    });
  }
  return sessionTokens.get(sessionId);
}

function checkBudget(sessionId, estimatedTokens = 1000) {
  const usage = getSessionUsage(sessionId);
  if (usage.totalTokens + estimatedTokens > usage.budget) {
    return {
      allowed: false,
      currentUsage: usage.totalTokens,
      budget: usage.budget,
      error: `Session ${sessionId} has exceeded its token budget (${usage.totalTokens}/${usage.budget}).`
    };
  }
  return { allowed: true, currentUsage: usage.totalTokens, budget: usage.budget };
}

function recordUsage(sessionId, usageMetadata) {
  const usage = getSessionUsage(sessionId);
  const promptTokens = usageMetadata?.promptTokenCount || 500;
  const candidatesTokens = usageMetadata?.candidatesTokenCount || 200;
  const total = usageMetadata?.totalTokenCount || (promptTokens + candidatesTokens);

  usage.totalPromptTokens += promptTokens;
  usage.totalCandidatesTokens += candidatesTokens;
  usage.totalTokens += total;
  usage.callCount += 1;

  return usage;
}

/**
 * Wraps any Gemini call with token telemetry tracking and budget enforcement.
 */
async function callGeminiWithTelemetry({
  sessionId = 'default-session',
  model = 'gemini-2.5-flash',
  contents,
  config = {},
  fallbackFn = null
}) {
  const budgetCheck = checkBudget(sessionId);
  if (!budgetCheck.allowed) {
    throw new Error(budgetCheck.error);
  }

  const client = getAIClient();
  if (!client) {
    if (fallbackFn) {
      const fallbackResult = await fallbackFn();
      recordUsage(sessionId, { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 });
      return fallbackResult;
    }
    throw new Error('Gemini API key is not configured and no fallback provided.');
  }

  try {
    const response = await client.models.generateContent({
      model,
      contents,
      config
    });

    const usageMeta = response.usageMetadata || {
      promptTokenCount: 300,
      candidatesTokenCount: 150,
      totalTokenCount: 450
    };
    recordUsage(sessionId, usageMeta);

    return response;
  } catch (error) {
    console.warn(`[TokenTelemetry] Gemini call error on session ${sessionId}:`, error.message);
    if (fallbackFn) {
      const fallbackResult = await fallbackFn();
      recordUsage(sessionId, { promptTokenCount: 50, candidatesTokenCount: 20, totalTokenCount: 70 });
      return fallbackResult;
    }
    throw error;
  }
}

function resetSessionBudget(sessionId, newBudget = DEFAULT_SESSION_BUDGET) {
  sessionTokens.set(sessionId, {
    totalPromptTokens: 0,
    totalCandidatesTokens: 0,
    totalTokens: 0,
    callCount: 0,
    budget: newBudget,
    lastReset: new Date().toISOString()
  });
  return sessionTokens.get(sessionId);
}

module.exports = {
  getAIClient,
  getSessionUsage,
  checkBudget,
  recordUsage,
  callGeminiWithTelemetry,
  resetSessionBudget
};
