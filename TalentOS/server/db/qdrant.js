const { QdrantClient } = require('@qdrant/js-client-rest');
require('dotenv').config();

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const QDRANT_API_KEY = process.env.QDRANT_API_KEY || undefined;

let clientInstance = null;

function getQdrantClient() {
  if (!clientInstance) {
    clientInstance = new QdrantClient({
      url: QDRANT_URL,
      apiKey: QDRANT_API_KEY
    });
  }
  return clientInstance;
}

const COLLECTIONS = {
  RESUME: 'resume_embeddings',
  CODE: 'code_embeddings',
  PITCH: 'pitch_embeddings'
};

async function initCollections(vectorSize = 768) {
  const client = getQdrantClient();
  const results = {};

  for (const [key, name] of Object.entries(COLLECTIONS)) {
    try {
      const collections = await client.getCollections();
      const exists = collections.collections.some(c => c.name === name);
      if (!exists) {
        await client.createCollection(name, {
          vectors: {
            size: vectorSize,
            distance: 'Cosine'
          }
        });
        results[name] = 'created';
      } else {
        results[name] = 'exists';
      }
    } catch (err) {
      console.warn(`[Qdrant] Collection ${name} init notice (fallback mode):`, err.message);
      results[name] = 'fallback_mode';
    }
  }
  return results;
}

async function upsertVector(collectionName, id, vector, payload = {}) {
  const client = getQdrantClient();
  try {
    const response = await client.upsert(collectionName, {
      wait: true,
      points: [
        {
          id,
          vector,
          payload
        }
      ]
    });
    return response;
  } catch (error) {
    console.warn(`[Qdrant] upsertVector fallback (${collectionName}):`, error.message);
    return { fallback: true, id, payload };
  }
}

async function searchVectors(collectionName, vector, limit = 5, filter = null) {
  const client = getQdrantClient();
  try {
    const searchParams = {
      vector,
      limit,
      with_payload: true
    };
    if (filter) searchParams.filter = filter;
    const results = await client.search(collectionName, searchParams);
    return results;
  } catch (error) {
    console.warn(`[Qdrant] searchVectors fallback (${collectionName}):`, error.message);
    return [];
  }
}

module.exports = {
  getQdrantClient,
  initCollections,
  upsertVector,
  searchVectors,
  COLLECTIONS
};
