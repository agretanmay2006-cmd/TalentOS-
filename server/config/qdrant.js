import dotenv from 'dotenv';

dotenv.config();

const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
const apiKey = process.env.QDRANT_API_KEY || '';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.QDRANT_TIMEOUT_MS || '10000', 10);

const getHeaders = () => {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['api-key'] = apiKey;
  }
  return headers;
};

/**
 * Resilient fetch wrapper with timeouts and exponential backoff retries
 */
export const qdrantFetch = async (endpoint, options = {}, retries = 3, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const url = `${qdrantUrl.replace(/\/$/, '')}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  let attempt = 0;
  let lastError;

  while (attempt < retries) {
    attempt++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...getHeaders(),
          ...(options.headers || {})
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // Retryable HTTP status codes (server busy, gateway timeout)
      if ([502, 503, 504, 429].includes(response.status) && attempt < retries) {
        const backoffMs = Math.pow(2, attempt) * 150;
        console.warn(`[Qdrant] HTTP ${response.status} on attempt ${attempt}/${retries}. Retrying in ${backoffMs}ms...`);
        await new Promise(res => setTimeout(res, backoffMs));
        continue;
      }

      const errorText = await response.text().catch(() => '');
      throw new Error(`Qdrant HTTP ${response.status} (${response.statusText}): ${errorText}`);
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      const isAbort = error.name === 'AbortError';
      const isNetworkErr = error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED');

      if ((isAbort || isNetworkErr) && attempt < retries) {
        const backoffMs = Math.pow(2, attempt) * 150;
        console.warn(`[Qdrant] Request ${isAbort ? 'timed out' : 'network failed'} on attempt ${attempt}/${retries}. Retrying in ${backoffMs}ms...`);
        await new Promise(res => setTimeout(res, backoffMs));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
};

export const verifyQdrantConnection = async () => {
  const startTime = Date.now();
  try {
    const response = await qdrantFetch('/healthz', { method: 'GET' }, 2, 5000);
    const latencyMs = Date.now() - startTime;
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      console.log(`[Qdrant] Live connection verified (${qdrantUrl}, latency: ${latencyMs}ms)`);
      return { connected: true, latencyMs, url: qdrantUrl, status: data };
    }
    return { connected: false, latencyMs: null, error: `HTTP ${response.status}`, url: qdrantUrl };
  } catch (error) {
    console.error(`[Qdrant] Connection failed to ${qdrantUrl}: ${error.message}`);
    return { connected: false, latencyMs: null, error: error.message, url: qdrantUrl };
  }
};

export const createCollection = async (collectionName, vectorSize = 768) => {
  try {
    // Check if collection exists
    try {
      const checkRes = await qdrantFetch(`/collections/${collectionName}`, { method: 'GET' }, 2, 5000);
      if (checkRes.ok) {
        console.log(`[Qdrant] Collection '${collectionName}' already exists.`);
        return true;
      }
    } catch {
      // Collection does not exist, proceed to create
    }

    // Create collection with Cosine distance
    const createRes = await qdrantFetch(`/collections/${collectionName}`, {
      method: 'PUT',
      body: JSON.stringify({
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      }),
    });

    if (createRes.ok) {
      console.log(`[Qdrant] Collection '${collectionName}' created successfully.`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[Qdrant] Error creating collection '${collectionName}':`, error.message);
    throw error;
  }
};

export const upsertVectors = async (collectionName, points) => {
  try {
    const response = await qdrantFetch(`/collections/${collectionName}/points?wait=true`, {
      method: 'PUT',
      body: JSON.stringify({ points }),
    });

    if (response.ok) {
      console.log(`[Qdrant] Upserted ${points.length} vectors into '${collectionName}'.`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`[Qdrant] Error upserting vectors in '${collectionName}':`, error.message);
    throw error;
  }
};

export const searchVectors = async (collectionName, vector, limit = 5) => {
  try {
    const response = await qdrantFetch(`/collections/${collectionName}/points/search`, {
      method: 'POST',
      body: JSON.stringify({
        vector,
        limit,
        with_payload: true,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.result || [];
    }
    return [];
  } catch (error) {
    console.error(`[Qdrant] Error searching vectors in '${collectionName}':`, error.message);
    throw error;
  }
};

export default {
  qdrantFetch,
  verifyQdrantConnection,
  createCollection,
  upsertVectors,
  searchVectors
};

