/**
 * authRoutes.js
 * JWT-based authentication — role: CANDIDATE | ADMIN
 * Primary: Neo4j database
 * Fallback: storageService (in-memory persistent fallback if Neo4j is offline)
 */

import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDriver, verifyNeo4jConnection } from '../config/neo4j.js';
import * as storage from '../services/storageService.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'talentos_dev_secret_change_in_production';
const JWT_EXPIRES = '7d';

// ── Middleware: verify token ──────────────────────────────────────────────
export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token required.' });
  }
  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

export function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ error: `Access denied. ${role} role required.` });
    }
    next();
  };
}

// ── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required.' });
  }
  const userRole = (role === 'ADMIN') ? 'ADMIN' : 'CANDIDATE';
  const cleanEmail = email.toLowerCase().trim();

  // Try Neo4j first
  let neo4jSuccess = false;
  let userId = `user_${Date.now()}`;
  let passwordHash = '';

  try {
    passwordHash = await bcrypt.hash(password, 10);
    const driver = getDriver();
    const session = driver.session();

    try {
      // Check if existing
      const existing = await session.run(
        'MATCH (u:User {email: $email}) RETURN u',
        { email: cleanEmail }
      );
      if (existing.records.length > 0) {
        await session.close();
        return res.status(409).json({ error: 'A user with this email already exists.' });
      }

      await session.run(
        `CREATE (u:User {
          id: $id, name: $name, email: $email,
          passwordHash: $passwordHash, role: $role,
          createdAt: datetime()
        }) RETURN u`,
        { id: userId, name, email: cleanEmail, passwordHash, role: userRole }
      );

      if (userRole === 'CANDIDATE') {
        await session.run(
          `MERGE (c:Candidate { email: $email })
           ON CREATE SET c.name = $name, c.id = $cid, c.createdAt = datetime()
           WITH c
           MATCH (u:User { email: $email })
           MERGE (u)-[:IS_CANDIDATE]->(c)`,
          { email: cleanEmail, name, cid: `cand_${Date.now()}` }
        );
      }
      neo4jSuccess = true;
    } finally {
      await session.close();
    }
  } catch (neoErr) {
    console.warn('[Auth] Neo4j unavailable for registration, utilizing storageService fallback:', neoErr.message);
  }

  // If Neo4j was offline or failed, save to storageService fallback
  if (!neo4jSuccess) {
    const existing = await storage.findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'A user with this email already exists.' });
    }
    if (!passwordHash) passwordHash = await bcrypt.hash(password, 10);
    const createdUser = await storage.createUser({
      name,
      email: cleanEmail,
      passwordHash,
      role: userRole
    });
    userId = createdUser.id;
  }

  const token = jwt.sign({ id: userId, email: cleanEmail, role: userRole, name }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  return res.status(201).json({ token, user: { id: userId, name, email: cleanEmail, role: userRole } });
});

// ── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }

  const cleanEmail = email.toLowerCase().trim();

  // Try Neo4j first
  try {
    const driver = getDriver();
    const session = driver.session();
    try {
      const result = await session.run(
        'MATCH (u:User {email: $email}) RETURN u',
        { email: cleanEmail }
      );

      if (result.records.length > 0) {
        const user = result.records[0].get('u').properties;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (valid) {
          const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, name: user.name },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
          );
          return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
        } else {
          return res.status(401).json({ error: 'Invalid credentials.' });
        }
      }
    } finally {
      await session.close();
    }
  } catch (neoErr) {
    console.warn('[Auth] Neo4j unavailable for login, checking storageService fallback:', neoErr.message);
  }

  // Fallback to storageService
  try {
    const user = await storage.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    return res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    console.error('[Auth] Login error:', err.message);
    return res.status(500).json({ error: 'Login failed.', message: err.message });
  }
});

// ── POST /api/auth/google ─────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  const { credential, email, name, role } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required for Google authentication.' });
  }

  const cleanEmail = email.toLowerCase().trim();
  const userName = name || cleanEmail.split('@')[0];
  const userRole = (role === 'ADMIN') ? 'ADMIN' : 'CANDIDATE';

  // Check if user exists in Neo4j or storage fallback
  let userId = `user_${Date.now()}`;
  let existingUser = null;

  try {
    const driver = getDriver();
    const session = driver.session();
    try {
      const result = await session.run(
        'MATCH (u:User {email: $email}) RETURN u',
        { email: cleanEmail }
      );
      if (result.records.length > 0) {
        const u = result.records[0].get('u').properties;
        existingUser = { id: u.id, name: u.name, email: u.email, role: u.role };
      } else {
        // Create user in Neo4j
        const dummyHash = await bcrypt.hash(`google_${Date.now()}`, 10);
        await session.run(
          `CREATE (u:User {
            id: $id, name: $name, email: $email,
            passwordHash: $passwordHash, role: $role,
            provider: 'google',
            createdAt: datetime()
          }) RETURN u`,
          { id: userId, name: userName, email: cleanEmail, passwordHash: dummyHash, role: userRole }
        );
        if (userRole === 'CANDIDATE') {
          await session.run(
            `MERGE (c:Candidate { email: $email })
             ON CREATE SET c.name = $name, c.id = $cid, c.createdAt = datetime()
             WITH c
             MATCH (u:User { email: $email })
             MERGE (u)-[:IS_CANDIDATE]->(c)`,
            { email: cleanEmail, name: userName, cid: `cand_${Date.now()}` }
          );
        }
        existingUser = { id: userId, name: userName, email: cleanEmail, role: userRole };
      }
    } finally {
      await session.close();
    }
  } catch (neoErr) {
    console.warn('[Auth] Neo4j unavailable for Google login, checking storageService fallback:', neoErr.message);
  }

  if (!existingUser) {
    let storageUser = await storage.findUserByEmail(cleanEmail);
    if (!storageUser) {
      const dummyHash = await bcrypt.hash(`google_${Date.now()}`, 10);
      storageUser = await storage.createUser({
        name: userName,
        email: cleanEmail,
        passwordHash: dummyHash,
        role: userRole,
        provider: 'google'
      });
    }
    existingUser = { id: storageUser.id, name: storageUser.name, email: storageUser.email, role: storageUser.role };
  }

  const token = jwt.sign(
    { id: existingUser.id, email: existingUser.email, role: existingUser.role, name: existingUser.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );

  return res.json({ token, user: existingUser });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
