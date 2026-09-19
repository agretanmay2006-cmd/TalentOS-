import { getEmbeddings } from '../config/gemini.js';
import { createCollection, upsertVectors, searchVectors } from '../config/qdrant.js';
import crypto from 'crypto';

const COLLECTION_NAME = 'candidates_skills';
const VECTOR_SIZE = 768; // 'text-embedding-004' generates 768-dimensional vectors
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.DISABLE_MOCK_FALLBACK === 'true';

/**
 * Initializes the collection in Qdrant
 */
export const initializeQdrantCollection = async () => {
  try {
    await createCollection(COLLECTION_NAME, VECTOR_SIZE);
  } catch (error) {
    console.error('[QdrantService] Setup collection failed:', error.message);
    if (IS_PRODUCTION) throw error;
  }
};

/**
 * Ingests a candidate profile into vector storage
 * @param {string} email 
 * @param {string} name 
 * @param {string} resumeText Or detailed skill profile
 * @param {string[]} skills List of skills
 */
export const indexCandidateProfile = async (email, name, resumeText, skills = []) => {
  try {
    const textToEmbed = `Candidate: ${name}\nEmail: ${email}\nSkills: ${skills.join(', ')}\nProfile Summary: ${resumeText}`;
    const embedding = await getEmbeddings(textToEmbed);
    
    // Create an integer/UUID compatible ID for Qdrant points
    const id = crypto.createHash('md5').update(email).digest('hex');
    const uuid = `${id.substring(0, 8)}-${id.substring(8, 12)}-${id.substring(12, 16)}-${id.substring(16, 20)}-${id.substring(20, 32)}`;

    const points = [
      {
        id: uuid,
        vector: embedding,
        payload: {
          email,
          name,
          skills,
          resumeText,
          indexedAt: new Date().toISOString()
        }
      }
    ];

    await upsertVectors(COLLECTION_NAME, points);
    console.log(`[QdrantService] Successfully indexed candidate: ${email}`);
    return true;
  } catch (error) {
    console.error(`[QdrantService] Indexing failed for candidate ${email}:`, error.message);
    if (IS_PRODUCTION) throw error;
    return false;
  }
};

/**
 * Searches for candidates matching a semantic query
 * @param {string} queryText 
 * @param {number} limit 
 */
export const searchCandidates = async (queryText, limit = 5) => {
  try {
    console.log(`[QdrantService] Searching candidates for query: "${queryText}"`);
    const queryEmbedding = await getEmbeddings(queryText);
    const results = await searchVectors(COLLECTION_NAME, queryEmbedding, limit);
    
    return results.map(hit => ({
      score: hit.score,
      id: hit.id,
      name: hit.payload?.name,
      email: hit.payload?.email,
      skills: hit.payload?.skills,
      resumeText: hit.payload?.resumeText
    }));
  } catch (error) {
    console.error(`[QdrantService] Search failed for query "${queryText}":`, error.message);
    if (IS_PRODUCTION) throw error;
    return [];
  }
};

export default {
  initializeQdrantCollection,
  indexCandidateProfile,
  searchCandidates
};

