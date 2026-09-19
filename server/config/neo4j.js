import neo4j from 'neo4j-driver';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || 'password';
const database = process.env.NEO4J_DATABASE || 'neo4j';

const maxConnectionPoolSize = parseInt(process.env.NEO4J_POOL_SIZE || '50', 10);
const connectionAcquisitionTimeout = parseInt(process.env.NEO4J_ACQUISITION_TIMEOUT_MS || '15000', 10);
const maxConnectionLifetime = parseInt(process.env.NEO4J_LIFETIME_MS || '3600000', 10);

let driver;

export const initNeo4jDriver = () => {
  if (driver) return driver;
  try {
    driver = neo4j.driver(
      uri,
      neo4j.auth.basic(user, password),
      {
        maxConnectionPoolSize,
        connectionAcquisitionTimeout,
        maxConnectionLifetime,
        disableLosslessIntegers: true
      }
    );
    console.log(`[Neo4j] Initiated driver for ${uri} (Pool size: ${maxConnectionPoolSize})`);
  } catch (error) {
    console.error('[Neo4j] Driver initialization failed:', error.message);
  }
  return driver;
};

// Initialize on module import
initNeo4jDriver();

export const getSession = (accessMode = neo4j.session.WRITE) => {
  if (!driver) initNeo4jDriver();
  if (!driver) throw new Error('[Neo4j] Driver not initialized');
  return driver.session({
    database,
    defaultAccessMode: accessMode
  });
};

/**
 * Execute a Cypher query with retries for transient errors
 */
export const runCypherWithRetry = async (cypher, params = {}, maxRetries = 3) => {
  let attempt = 0;
  let lastError;
  while (attempt < maxRetries) {
    attempt++;
    const session = getSession();
    try {
      const result = await session.run(cypher, params);
      return result;
    } catch (error) {
      lastError = error;
      const isTransient = error.code && (
        error.code.includes('TransientError') ||
        error.code.includes('ServiceUnavailable') ||
        error.code.includes('SessionExpired')
      );
      if (isTransient && attempt < maxRetries) {
        const backoffMs = Math.pow(2, attempt) * 100;
        console.warn(`[Neo4j] Transient error on attempt ${attempt}/${maxRetries}. Retrying in ${backoffMs}ms... (${error.message})`);
        await new Promise(res => setTimeout(res, backoffMs));
      } else {
        throw error;
      }
    } finally {
      await session.close();
    }
  }
  throw lastError;
};

export const verifyNeo4jConnection = async () => {
  if (!driver) initNeo4jDriver();
  if (!driver) return { connected: false, latencyMs: null, error: 'Driver uninitialized' };
  
  const startTime = Date.now();
  let session;
  try {
    session = getSession(neo4j.session.READ);
    await session.run('RETURN 1 AS num');
    const latencyMs = Date.now() - startTime;
    console.log(`[Neo4j] Live connection verified (${uri}, latency: ${latencyMs}ms)`);
    return { connected: true, latencyMs, uri, database };
  } catch (error) {
    console.error(`[Neo4j] Verification failed to ${uri}: ${error.message}`);
    return { connected: false, latencyMs: null, error: error.message, uri };
  } finally {
    if (session) await session.close();
  }
};

export const closeNeo4jDriver = async () => {
  if (driver) {
    await driver.close();
    driver = null;
    console.log('[Neo4j] Closed driver connections.');
  }
};

export const getDriver = () => { if (!driver) initNeo4jDriver(); return driver; };
export default driver;

