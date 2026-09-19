import { getSession } from '../config/neo4j.js';

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || process.env.DISABLE_MOCK_FALLBACK === 'true';

/**
 * Creates a Candidate node
 */
export const createCandidate = async (id, name, email) => {
  try {
    const session = getSession();
    try {
      const result = await session.run(
        `MERGE (c:Candidate {email: $email})
         ON CREATE SET c.id = $id, c.name = $name, c.createdAt = datetime()
         ON MATCH SET c.name = $name
         RETURN c`,
        { id, name, email }
      );
      return result.records[0]?.get('c').properties;
    } finally {
      await session.close();
    }
  } catch (err) {
    console.error('[Neo4jService] createCandidate error:', err.message);
    if (IS_PRODUCTION) throw err;
    console.warn('[Neo4jService] createCandidate offline fallback');
    return { id, name, email };
  }
};

/**
 * Creates a Skill node
 */
export const createSkill = async (name, category = 'General') => {
  try {
    const session = getSession();
    try {
      const result = await session.run(
        `MERGE (s:Skill {name: $name})
         ON CREATE SET s.category = $category
         RETURN s`,
        { name, category }
      );
      return result.records[0]?.get('s').properties;
    } finally {
      await session.close();
    }
  } catch (err) {
    console.error('[Neo4jService] createSkill error:', err.message);
    if (IS_PRODUCTION) throw err;
    console.warn('[Neo4jService] createSkill offline fallback');
    return { name, category };
  }
};

/**
 * Links a Candidate to a Skill
 */
export const linkCandidateSkill = async (candidateEmail, skillName, proficiency = 'Intermediate') => {
  try {
    const session = getSession();
    try {
      const result = await session.run(
        `MATCH (c:Candidate {email: $candidateEmail})
         MATCH (s:Skill {name: $skillName})
         MERGE (c)-[r:HAS_SKILL]->(s)
         SET r.proficiency = $proficiency
         RETURN c, r, s`,
        { candidateEmail, skillName, proficiency }
      );
      return result.records.length > 0;
    } finally {
      await session.close();
    }
  } catch (err) {
    console.error('[Neo4jService] linkCandidateSkill error:', err.message);
    if (IS_PRODUCTION) throw err;
    console.warn('[Neo4jService] linkCandidateSkill offline fallback');
    return true;
  }
};

/**
 * Creates a Project node
 */
export const createProject = async (id, name, description = '') => {
  const session = getSession();
  try {
    const result = await session.run(
      `MERGE (p:Project {id: $id})
       ON CREATE SET p.name = $name, p.description = $description, p.createdAt = datetime()
       ON MATCH SET p.name = $name, p.description = $description
       RETURN p`,
      { id, name, description }
    );
    return result.records[0]?.get('p').properties;
  } finally {
    await session.close();
  }
};

/**
 * Links a Candidate to a Project
 */
export const linkCandidateProject = async (candidateEmail, projectId, role = 'Contributor') => {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (c:Candidate {email: $candidateEmail})
       MATCH (p:Project {id: $projectId})
       MERGE (c)-[r:WORKED_ON]->(p)
       SET r.role = $role
       RETURN c, r, p`,
      { candidateEmail, projectId, role }
    );
    return result.records.length > 0;
  } finally {
    await session.close();
  }
};

/**
 * Creates a Commit node and links it to a Project and a Candidate
 */
export const createCommit = async (hash, message, authorEmail, date, projectId) => {
  const session = getSession();
  try {
    const result = await session.run(
      `MERGE (co:Commit {hash: $hash})
       ON CREATE SET co.message = $message, co.date = $date
       
       WITH co
       MATCH (p:Project {id: $projectId})
       MERGE (co)-[:BELONGS_TO]->(p)
       
       WITH co
       MATCH (c:Candidate {email: $authorEmail})
       MERGE (c)-[:COMMITTED]->(co)
       
       RETURN co`,
      { hash, message, authorEmail, date, projectId }
    );
    return result.records[0]?.get('co').properties;
  } finally {
    await session.close();
  }
};

/**
 * Returns a complete counts/summary of nodes and links in the graph DB
 */
export const getGraphSummary = async () => {
  const session = getSession();
  try {
    // Count nodes by label
    const nodesRes = await session.run(
      `CALL {
         MATCH (c:Candidate) RETURN 'candidates' AS label, count(c) AS count
         UNION ALL
         MATCH (s:Skill) RETURN 'skills' AS label, count(s) AS count
         UNION ALL
         MATCH (p:Project) RETURN 'projects' AS label, count(p) AS count
         UNION ALL
         MATCH (co:Commit) RETURN 'commits' AS label, count(co) AS count
       } RETURN label, count`
    );

    const counts = {
      candidates: 0,
      skills: 0,
      projects: 0,
      commits: 0
    };

    nodesRes.records.forEach(rec => {
      counts[rec.get('label')] = rec.get('count').toNumber ? rec.get('count').toNumber() : rec.get('count');
    });

    // Get a sample of relations for visualizers
    const linksRes = await session.run(
      `MATCH (n)-[r]->(m)
       RETURN labels(n)[0] AS sourceLabel, n.name AS sourceName, n.email AS sourceEmail, n.hash AS sourceHash, n.id AS sourceId,
              type(r) AS relType, 
              labels(m)[0] AS targetLabel, m.name AS targetName, m.id AS targetId
       LIMIT 100`
    );

    const links = linksRes.records.map(rec => ({
      source: {
        label: rec.get('sourceLabel'),
        name: rec.get('sourceName') || rec.get('sourceEmail') || rec.get('sourceHash') || rec.get('sourceId')
      },
      type: rec.get('relType'),
      target: {
        label: rec.get('targetLabel'),
        name: rec.get('targetName') || rec.get('targetId')
      }
    }));

    return { counts, links };
  } catch (error) {
    console.error('[Neo4jService] Failed to fetch summary:', error.message);
    if (IS_PRODUCTION) throw error;
    // Return empty mock structure if db is not populated or offline in dev
    return {
      counts: { candidates: 0, skills: 0, projects: 0, commits: 0 },
      links: []
    };
  } finally {
    await session.close();
  }
};

/**
 * Returns full candidate profile: skills, projects, commits, flags.
 * Used by Agent 5B Digital Twin to build context snapshot.
 */
export const getCandidateFullProfile = async (email) => {
  const session = getSession();
  try {
    const result = await session.run(
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
    if (result.records.length === 0) return null;
    const rec = result.records[0];
    return {
      name: rec.get('name'),
      email: rec.get('email'),
      fraudFlag: rec.get('fraudFlag') ?? false,
      aiGeneratedFlag: rec.get('aiGeneratedFlag') ?? false,
      skills: (rec.get('skills') || []).filter(s => s.skill),
      projects: (rec.get('projects') || []).filter(p => p.project),
      recentCommits: (rec.get('recentCommits') || []).filter(c => c.hash),
      totalCommits: rec.get('totalCommits')?.toNumber?.() ?? 0
    };
  } finally {
    await session.close();
  }
};

/**
 * Executes a pre-validated read-only Cypher query.
 * Used by Agent 5A Copilot after whitelist validation.
 */
export const searchCandidatesByCypher = async (cypher, limit = 20) => {
  const session = getSession();
  try {
    const safeQuery = cypher.includes('LIMIT') ? cypher : `${cypher} LIMIT ${limit}`;
    const result = await session.run(safeQuery);
    return result.records.map(rec => {
      const obj = {};
      rec.keys.forEach(key => {
        const val = rec.get(key);
        obj[key] = val && typeof val === 'object' && val.toNumber ? val.toNumber() : val;
      });
      return obj;
    });
  } catch (err) {
    console.error('[Neo4jService] Cypher search error:', err.message);
    return [];
  } finally {
    await session.close();
  }
};

export default {
  createCandidate,
  createSkill,
  linkCandidateSkill,
  createProject,
  linkCandidateProject,
  createCommit,
  getGraphSummary,
  getCandidateFullProfile,
  searchCandidatesByCypher
};
