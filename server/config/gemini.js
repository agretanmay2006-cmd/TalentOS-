import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

let ai = null;

if (apiKey) {
  try {
    ai = new GoogleGenAI({ apiKey });
    console.log('[Gemini] Client initialized successfully.');
  } catch (error) {
    console.error('[Gemini] Initialization error:', error.message);
  }
} else {
  console.warn('[Gemini] API Key is missing. AI features will require GEMINI_API_KEY env variable.');
}

export const getGeminiClient = () => ai;

/**
 * Generates vector embeddings for a given string using the standard text-embedding-004 model.
 * @param {string} text 
 * @returns {Promise<number[]>}
 */
export const getEmbeddings = async (text) => {
  if (!ai) {
    throw new Error('[Gemini] Client not initialized. Check GEMINI_API_KEY.');
  }
  try {
    const response = await ai.models.embedContent({
      model: 'text-embedding-004',
      contents: text,
    });
    
    if (response && response.embedding && response.embedding.values) {
      return response.embedding.values;
    }
    throw new Error('Invalid embedding response format');
  } catch (error) {
    console.error('[Gemini] Embedding error:', error.message);
    throw error;
  }
};

/**
 * Generates text response using gemini-3.6-flash
 * @param {string} prompt 
 * @param {string} systemInstruction 
 * @returns {Promise<string>}
 */
export const generateText = async (prompt, systemInstruction = '') => {
  if (!ai) {
    throw new Error('[Gemini] Client not initialized. Check GEMINI_API_KEY.');
  }
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: systemInstruction ? { systemInstruction } : undefined,
    });
    return response.text;
  } catch (error) {
    console.error('[Gemini] Generation error:', error.message);
    throw error;
  }
};

export default {
  getGeminiClient,
  getEmbeddings,
  generateText
};
