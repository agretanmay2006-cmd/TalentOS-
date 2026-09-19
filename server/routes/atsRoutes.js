/**
 * atsRoutes.js
 * ATS (Applicant Tracking System) REST API
 * Covers: Profile updates, Application lifecycle, Assessments, Interviews
 * Uses Neo4j when connected, with storageService fallback when Neo4j is offline.
 */

import { Router } from 'express';
import multer from 'multer';
import { getDriver } from '../config/neo4j.js';
import { requireAuth, requireRole } from './authRoutes.js';
import * as storage from '../services/storageService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper to safely execute Cypher or fall back
async function safeCypher(fn, fallbackFn) {
  try {
    const driver = getDriver();
    const session = driver.session();
    try {
      return await fn(session);
    } finally {
      await session.close();
    }
  } catch (err) {
    console.warn('[ATS] Neo4j query error, falling back to storageService:', err.message);
    return await fallbackFn();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CANDIDATE PROFILE
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/ats/profile — candidate gets their own profile
router.get('/profile', requireAuth, requireRole('CANDIDATE'), async (req, res) => {
  const { email } = req.user;
  try {
    const profile = await safeCypher(
      async (session) => {
        const result = await session.run(
          `MATCH (c:Candidate {email: $email})
           OPTIONAL MATCH (c)-[:HAS_EDUCATION]->(edu:Education)
           OPTIONAL MATCH (c)-[:HAS_PROJECT]->(proj:Project)
           OPTIONAL MATCH (c)-[:HAS_CERTIFICATE]->(cert:Certificate)
           OPTIONAL MATCH (c)-[:HAS_SKILL]->(skill:Skill)
           RETURN c, collect(DISTINCT edu) as education, collect(DISTINCT proj) as projects,
                  collect(DISTINCT cert) as certificates, collect(DISTINCT skill) as skills`,
          { email }
        );
        if (result.records.length === 0) return null;
        const r = result.records[0];
        const cand = r.get('c').properties;
        return {
          ...cand,
          education: r.get('education').map(e => e.properties),
          projects: r.get('projects').map(p => p.properties),
          certificates: r.get('certificates').map(c => c.properties),
          skills: r.get('skills').map(s => s.properties?.name || s.properties),
        };
      },
      async () => storage.getCandidateProfile(email)
    );
    return res.json({ profile });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// PUT /api/ats/profile — candidate updates personal/developer links
router.put('/profile', requireAuth, requireRole('CANDIDATE'), async (req, res) => {
  const { email } = req.user;
  const { name, phone, location, githubUrl, linkedinUrl, leetcodeUrl, leetcodeScore, portfolioUrl, skills, role } = req.body;

  try {
    await safeCypher(
      async (session) => {
        await session.run(
          `MERGE (c:Candidate {email: $email})
           SET c.name = coalesce($name, c.name),
               c.phone = $phone,
               c.location = $location,
               c.githubUrl = $githubUrl,
               c.linkedinUrl = $linkedinUrl,
               c.leetcodeUrl = $leetcodeUrl,
               c.leetcodeScore = $leetcodeScore,
               c.portfolioUrl = $portfolioUrl,
               c.role = $role,
               c.updatedAt = datetime()`,
          {
            email, name: name || req.user.name, phone: phone || null, location: location || null,
            githubUrl: githubUrl || null, linkedinUrl: linkedinUrl || null,
            leetcodeUrl: leetcodeUrl || null, leetcodeScore: leetcodeScore || null,
            portfolioUrl: portfolioUrl || null, role: role || null
          }
        );

        if (skills && Array.isArray(skills)) {
          await session.run('MATCH (c:Candidate {email: $email})-[r:HAS_SKILL]->() DELETE r', { email });
          for (const skillName of skills) {
            await session.run(
              `MERGE (s:Skill {name: $skillName})
               WITH s MATCH (c:Candidate {email: $email}) MERGE (c)-[:HAS_SKILL]->(s)`,
              { email, skillName }
            );
          }
        }
      },
      async () => storage.updateCandidateProfile(email, { name, phone, location, githubUrl, linkedinUrl, leetcodeUrl, leetcodeScore, portfolioUrl, skills, role })
    );
    return res.json({ success: true, message: 'Profile updated.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/ats/education — upsert education record
router.post('/education', requireAuth, requireRole('CANDIDATE'), async (req, res) => {
  const { email } = req.user;
  const { college, degree, specialization, gradYear, cgpa } = req.body;
  try {
    await safeCypher(
      async (session) => {
        await session.run(
          `MATCH (c:Candidate {email: $email})
           MERGE (c)-[:HAS_EDUCATION]->(edu:Education {college: $college})
           SET edu.degree = $degree, edu.specialization = $specialization,
               edu.gradYear = $gradYear, edu.cgpa = $cgpa`,
          { email, college, degree: degree||null, specialization: specialization||null, gradYear: gradYear||null, cgpa: cgpa||null }
        );
      },
      async () => storage.addEducation(email, { college, degree, specialization, gradYear, cgpa })
    );
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// POST /api/ats/projects — add project
router.post('/projects', requireAuth, requireRole('CANDIDATE'), async (req, res) => {
  const { email } = req.user;
  const { name, description, techStack, githubUrl, liveDemoUrl } = req.body;
  try {
    const projId = `proj_${Date.now()}`;
    await safeCypher(
      async (session) => {
        await session.run(
          `MATCH (c:Candidate {email: $email})
           CREATE (p:Project {id: $projId, name: $name, description: $description,
             techStack: $techStack, githubUrl: $githubUrl, liveDemoUrl: $liveDemoUrl,
             createdAt: datetime()})
           CREATE (c)-[:HAS_PROJECT]->(p)`,
          { email, projId, name, description: description||null, techStack: techStack||null, githubUrl: githubUrl||null, liveDemoUrl: liveDemoUrl||null }
        );
      },
      async () => storage.addProject(email, { name, description, techStack, githubUrl, liveDemoUrl })
    );
    return res.json({ success: true, id: projId });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// DELETE /api/ats/projects/:id
router.delete('/projects/:id', requireAuth, requireRole('CANDIDATE'), async (req, res) => {
  const { email } = req.user;
  try {
    await safeCypher(
      async (session) => {
        await session.run(
          `MATCH (c:Candidate {email: $email})-[:HAS_PROJECT]->(p:Project {id: $id}) DETACH DELETE p`,
          { email, id: req.params.id }
        );
      },
      async () => storage.deleteProject(email, req.params.id)
    );
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// POST /api/ats/certificates
router.post('/certificates', requireAuth, requireRole('CANDIDATE'), async (req, res) => {
  const { email } = req.user;
  const { name, issuer, date, url } = req.body;
  try {
    const certId = `cert_${Date.now()}`;
    await safeCypher(
      async (session) => {
        await session.run(
          `MATCH (c:Candidate {email: $email})
           CREATE (cert:Certificate {id: $certId, name: $name, issuer: $issuer, date: $date, url: $url})
           CREATE (c)-[:HAS_CERTIFICATE]->(cert)`,
          { email, certId, name, issuer: issuer||null, date: date||null, url: url||null }
        );
      },
      async () => storage.addCertificate(email, { name, issuer, date, url })
    );
    return res.json({ success: true, id: certId });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// DELETE /api/ats/certificates/:id
router.delete('/certificates/:id', requireAuth, requireRole('CANDIDATE'), async (req, res) => {
  const { email } = req.user;
  try {
    await safeCypher(
      async (session) => {
        await session.run(
          `MATCH (c:Candidate {email: $email})-[:HAS_CERTIFICATE]->(cert:Certificate {id: $id}) DETACH DELETE cert`,
          { email, id: req.params.id }
        );
      },
      async () => storage.deleteCertificate(email, req.params.id)
    );
    return res.json({ success: true });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// APPLICATIONS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/ats/apply — candidate submits application
router.post('/apply', requireAuth, requireRole('CANDIDATE'), async (req, res) => {
  const { email, name } = req.user;
  try {
    const result = await safeCypher(
      async (session) => {
        const appId = `app_${Date.now()}`;
        await session.run(
          `MERGE (c:Candidate {email: $email})
           SET c.name = coalesce(c.name, $name)
           CREATE (a:Application {
             id: $appId,
             status: 'Applied',
             appliedAt: datetime(),
             updatedAt: datetime()
           })
           CREATE (c)-[:APPLIED]->(a)`,
          { email, name, appId }
        );
        return { applicationId: appId, status: 'Applied' };
      },
      async () => {
        const app = await storage.createApplication(email, name);
        return { applicationId: app.id, status: app.status };
      }
    );
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    console.error('[ATS] Apply error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/ats/my-application — candidate's own application status
router.get('/my-application', requireAuth, requireRole('CANDIDATE'), async (req, res) => {
  const { email } = req.user;
  try {
    const application = await safeCypher(
      async (session) => {
        const result = await session.run(
          `MATCH (c:Candidate {email: $email})-[:APPLIED]->(a:Application)
           OPTIONAL MATCH (a)-[:HAS_ASSESSMENT]->(asmnt:Assessment)
           OPTIONAL MATCH (a)-[:HAS_INTERVIEW]->(iv:Interview)
           RETURN a, collect(DISTINCT asmnt) as assessments, collect(DISTINCT iv) as interviews
           ORDER BY a.appliedAt DESC LIMIT 1`,
          { email }
        );
        if (result.records.length === 0) return null;
        const r = result.records[0];
        return {
          ...r.get('a').properties,
          assessments: r.get('assessments').map(a => a.properties),
          interviews: r.get('interviews').map(i => i.properties),
        };
      },
      async () => storage.getApplicationByEmail(email)
    );
    return res.json({ application });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — CANDIDATES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/ats/admin/candidates — list all with search/filter/sort/pagination
router.get('/admin/candidates', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { search = '', stage = '', page = 1, limit = 20 } = req.query;
  try {
    const data = await safeCypher(
      async (session) => {
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const query = `
          MATCH (c:Candidate)
          OPTIONAL MATCH (c)-[:APPLIED]->(a:Application)
          WHERE ($search = '' OR toLower(c.name) CONTAINS toLower($search) OR toLower(c.email) CONTAINS toLower($search))
          AND ($stage = '' OR a.status = $stage)
        `;
        const result = await session.run(
          query + `RETURN c, a ORDER BY a.appliedAt DESC SKIP $skip LIMIT $limit`,
          { search, stage, skip: parseInt(skip), limit: parseInt(limit) }
        );
        const countResult = await session.run(
          `MATCH (c:Candidate)
           OPTIONAL MATCH (c)-[:APPLIED]->(a:Application)
           WHERE ($search = '' OR toLower(c.name) CONTAINS toLower($search) OR toLower(c.email) CONTAINS toLower($search))
           AND ($stage = '' OR a.status = $stage)
           RETURN count(c) as total`,
          { search, stage }
        );
        const total = countResult.records[0]?.get('total').toNumber() || 0;
        const candidates = result.records.map(r => ({
          ...r.get('c').properties,
          application: r.get('a')?.properties || null,
        }));
        return { candidates, total, page: parseInt(page), limit: parseInt(limit) };
      },
      async () => storage.getAdminCandidates({ search, stage, page: parseInt(page), limit: parseInt(limit) })
    );
    return res.json(data);
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// GET /api/ats/admin/candidates/:email — full candidate detail
router.get('/admin/candidates/:email', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { email } = req.params;
  try {
    const candidate = await safeCypher(
      async (session) => {
        const result = await session.run(
          `MATCH (c:Candidate {email: $email})
           OPTIONAL MATCH (c)-[:APPLIED]->(a:Application)
           OPTIONAL MATCH (c)-[:HAS_EDUCATION]->(edu:Education)
           OPTIONAL MATCH (c)-[:HAS_PROJECT]->(proj:Project)
           OPTIONAL MATCH (c)-[:HAS_CERTIFICATE]->(cert:Certificate)
           OPTIONAL MATCH (c)-[:HAS_SKILL]->(skill:Skill)
           OPTIONAL MATCH (a)-[:HAS_ASSESSMENT]->(asmnt:Assessment)
           OPTIONAL MATCH (a)-[:HAS_INTERVIEW]->(iv:Interview)
           RETURN c, a,
             collect(DISTINCT edu) as education,
             collect(DISTINCT proj) as projects,
             collect(DISTINCT cert) as certificates,
             collect(DISTINCT skill) as skills,
             collect(DISTINCT asmnt) as assessments,
             collect(DISTINCT iv) as interviews`,
          { email: decodeURIComponent(email) }
        );
        if (result.records.length === 0) return null;
        const r = result.records[0];
        return {
          ...r.get('c').properties,
          application: r.get('a')?.properties || null,
          education: r.get('education').map(e => e.properties),
          projects: r.get('projects').map(p => p.properties),
          certificates: r.get('certificates').map(c => c.properties),
          skills: r.get('skills').map(s => s.properties?.name || s),
          assessments: r.get('assessments').map(a => a.properties),
          interviews: r.get('interviews').map(i => i.properties),
        };
      },
      async () => storage.getAdminCandidateDetail(email)
    );
    if (!candidate) return res.status(404).json({ error: 'Candidate not found.' });
    return res.json({ candidate });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — PIPELINE STAGE CHANGES
// ─────────────────────────────────────────────────────────────────────────────

const VALID_STAGES = ['Applied', 'Screening', 'Assessment', 'Interview', 'Selected', 'Hired', 'Rejected', 'Hold'];

// PUT /api/ats/admin/applications/:id/stage
router.put('/admin/applications/:id/stage', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { stage, note } = req.body;
  if (!VALID_STAGES.includes(stage)) {
    return res.status(400).json({ error: `Invalid stage. Valid: ${VALID_STAGES.join(', ')}` });
  }
  try {
    const application = await safeCypher(
      async (session) => {
        const result = await session.run(
          `MATCH (a:Application {id: $id})
           SET a.status = $stage, a.updatedAt = datetime(), a.adminNote = $note
           RETURN a`,
          { id: req.params.id, stage, note: note || null }
        );
        if (result.records.length === 0) return null;
        return result.records[0].get('a').properties;
      },
      async () => storage.updateApplicationStage(req.params.id, stage, note)
    );
    if (!application) return res.status(404).json({ error: 'Application not found.' });
    return res.json({ success: true, application });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — ASSESSMENTS & INTERVIEWS
// ─────────────────────────────────────────────────────────────────────────────

router.post('/admin/assessments', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { applicationId, title, dueDate, description } = req.body;
  if (!applicationId || !title) return res.status(400).json({ error: 'applicationId and title are required.' });
  try {
    const asmntId = `asmnt_${Date.now()}`;
    await safeCypher(
      async (session) => {
        await session.run(
          `MATCH (a:Application {id: $applicationId})
           CREATE (asmnt:Assessment {
             id: $asmntId, title: $title, description: $description,
             dueDate: $dueDate, status: 'Pending', assignedAt: datetime()
           })
           CREATE (a)-[:HAS_ASSESSMENT]->(asmnt)`,
          { applicationId, asmntId, title, description: description||null, dueDate: dueDate||null }
        );
      },
      async () => storage.createAssessment(applicationId, title, description, dueDate)
    );
    return res.status(201).json({ success: true, id: asmntId });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.post('/admin/interviews', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const { applicationId, date, interviewer, meetingLink, notes } = req.body;
  if (!applicationId || !date) return res.status(400).json({ error: 'applicationId and date are required.' });
  try {
    const ivId = `iv_${Date.now()}`;
    await safeCypher(
      async (session) => {
        await session.run(
          `MATCH (a:Application {id: $applicationId})
           CREATE (iv:Interview {
             id: $ivId, date: $date, interviewer: $interviewer,
             meetingLink: $meetingLink, notes: $notes, status: 'Scheduled', scheduledAt: datetime()
           })
           CREATE (a)-[:HAS_INTERVIEW]->(iv)`,
          { applicationId, ivId, date, interviewer: interviewer||null, meetingLink: meetingLink||null, notes: notes||null }
        );
      },
      async () => storage.createInterview(applicationId, date, interviewer, meetingLink, notes)
    );
    return res.status(201).json({ success: true, id: ivId });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────────────────────
// ADMIN — DASHBOARD STATS & PIPELINE
// ─────────────────────────────────────────────────────────────────────────────

router.get('/admin/stats', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const stats = await safeCypher(
      async (session) => {
        const result = await session.run(`
          MATCH (c:Candidate) WITH count(c) as totalCandidates
          OPTIONAL MATCH (a:Application) WITH totalCandidates, count(a) as totalApplications
          OPTIONAL MATCH (a2:Application {status: 'Applied'}) WITH totalCandidates, totalApplications, count(a2) as newApplications
          OPTIONAL MATCH (a3:Application {status: 'Assessment'}) WITH totalCandidates, totalApplications, newApplications, count(a3) as pendingAssessments
          OPTIONAL MATCH (a4:Application {status: 'Interview'}) WITH totalCandidates, totalApplications, newApplications, pendingAssessments, count(a4) as interviews
          OPTIONAL MATCH (a5:Application {status: 'Selected'}) WITH totalCandidates, totalApplications, newApplications, pendingAssessments, interviews, count(a5) as selected
          OPTIONAL MATCH (a6:Application {status: 'Hired'}) WITH totalCandidates, totalApplications, newApplications, pendingAssessments, interviews, selected, count(a6) as hired
          OPTIONAL MATCH (a7:Application {status: 'Rejected'}) 
          RETURN totalCandidates, totalApplications, newApplications, pendingAssessments, interviews, selected, hired, count(a7) as rejected
        `);
        const r = result.records[0];
        const toNum = key => {
          try { const v = r?.get(key); return (v && typeof v.toNumber === 'function') ? v.toNumber() : (v ?? 0); }
          catch { return 0; }
        };
        return {
          totalCandidates: toNum('totalCandidates'),
          totalApplications: toNum('totalApplications'),
          newApplications: toNum('newApplications'),
          pendingAssessments: toNum('pendingAssessments'),
          interviews: toNum('interviews'),
          selected: toNum('selected'),
          hired: toNum('hired'),
          rejected: toNum('rejected'),
        };
      },
      async () => storage.getAdminStats()
    );
    return res.json(stats);
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

router.get('/admin/pipeline', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const pipeline = await safeCypher(
      async (session) => {
        const result = await session.run(`
          MATCH (c:Candidate)-[:APPLIED]->(a:Application)
          RETURN c.name as name, c.email as email, c.role as role,
                 a.id as applicationId, a.status as stage, a.appliedAt as appliedAt
          ORDER BY a.appliedAt DESC
        `);
        const resPipeline = {};
        VALID_STAGES.forEach(s => { resPipeline[s] = []; });
        result.records.forEach(r => {
          const stage = r.get('stage') || 'Applied';
          if (!resPipeline[stage]) resPipeline[stage] = [];
          resPipeline[stage].push({
            name: r.get('name'),
            email: r.get('email'),
            role: r.get('role'),
            applicationId: r.get('applicationId'),
            appliedAt: r.get('appliedAt'),
          });
        });
        return resPipeline;
      },
      async () => storage.getAdminPipeline()
    );
    return res.json({ pipeline });
  } catch (err) { return res.status(500).json({ error: err.message }); }
});

export default router;
