/**
 * storageService.js
 * In-memory fallback data store for Auth & ATS when Neo4j is offline or unavailable.
 * Ensures 100% functional login, registration, applicant tracking, and admin pipeline.
 */

import bcrypt from 'bcryptjs';

// Pre-hashed passwords for default users
// "admin123" -> $2a$10$wT.fG6/gZ5iS0H/QYyM.c.f6tJqXm7D1U5y5Uv.e.V5cZ7m4z7w6G (or dynamically hashed on init)
// "candidate123" -> same

let initialized = false;

const memoryStore = {
  users: [],
  candidates: {},
  applications: [],
  education: [],
  projects: [],
  certificates: [],
  assessments: [],
  interviews: []
};

export async function initStorageService() {
  if (initialized) return;

  const defaultAdminPass = await bcrypt.hash('admin123', 10);
  const defaultCandPass = await bcrypt.hash('candidate123', 10);

  memoryStore.users = [
    {
      id: 'user_admin_default',
      name: 'System Admin',
      email: 'admin@talentos.io',
      passwordHash: defaultAdminPass,
      role: 'ADMIN',
      createdAt: new Date().toISOString()
    },
    {
      id: 'user_cand_default',
      name: 'Candidate User',
      email: 'candidate@talentos.io',
      passwordHash: defaultCandPass,
      role: 'CANDIDATE',
      createdAt: new Date().toISOString()
    }
  ];

  memoryStore.candidates = {
    'candidate@talentos.io': {
      email: 'candidate@talentos.io',
      name: 'Candidate User',
      phone: '+1 555-0192',
      location: 'San Francisco, CA',
      githubUrl: 'https://github.com/candidate-dev',
      linkedinUrl: 'https://linkedin.com/in/candidate-dev',
      leetcodeUrl: 'https://leetcode.com/candidate-dev',
      leetcodeScore: '1850',
      portfolioUrl: 'https://candidate.dev',
      skills: ['React', 'Node.js', 'TypeScript', 'GraphQL'],
      role: 'Full Stack Engineer'
    },
    'alice@talentos.io': {
      email: 'alice@talentos.io',
      name: 'Alice Vance',
      phone: '+1 555-0144',
      location: 'Seattle, WA',
      githubUrl: 'https://github.com/alice-vance',
      linkedinUrl: 'https://linkedin.com/in/alice-vance',
      leetcodeUrl: 'https://leetcode.com/alice-vance',
      leetcodeScore: '2100',
      portfolioUrl: 'https://alicevance.io',
      skills: ['GoLang', 'Kubernetes', 'Cloud Architecture', 'Docker'],
      role: 'Cloud Architect'
    },
    'bob@talentos.io': {
      email: 'bob@talentos.io',
      name: 'Bob Smith',
      phone: '+1 555-0188',
      location: 'Austin, TX',
      githubUrl: 'https://github.com/bob-smith',
      linkedinUrl: 'https://linkedin.com/in/bob-smith',
      leetcodeUrl: 'https://leetcode.com/bob-smith',
      leetcodeScore: '1720',
      portfolioUrl: 'https://bobsmith.design',
      skills: ['React', 'Tailwind CSS', 'Socket.io', 'Next.js'],
      role: 'Senior Frontend Engineer'
    }
  };

  memoryStore.applications = [
    {
      id: 'app_alice',
      email: 'alice@talentos.io',
      name: 'Alice Vance',
      status: 'Applied',
      adminNote: 'Strong background in cloud native systems.',
      appliedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 3).toISOString()
    },
    {
      id: 'app_bob',
      email: 'bob@talentos.io',
      name: 'Bob Smith',
      status: 'Screening',
      adminNote: 'Scheduled technical screening session.',
      appliedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      updatedAt: new Date(Date.now() - 86400000 * 2).toISOString()
    },
    {
      id: 'app_cand',
      email: 'candidate@talentos.io',
      name: 'Candidate User',
      status: 'Applied',
      adminNote: 'Submitted application via portal.',
      appliedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];

  initialized = true;
  console.log('[StorageService] Initialized in-memory fallback store with default Admin & Candidate users.');
}

// Auto init
initStorageService();

// User methods
export async function findUserByEmail(email) {
  await initStorageService();
  const target = email.toLowerCase().trim();
  return memoryStore.users.find(u => u.email.toLowerCase() === target) || null;
}

export async function createUser({ name, email, passwordHash, role }) {
  await initStorageService();
  const id = `user_${Date.now()}_${Math.floor(Math.random()*1000)}`;
  const user = {
    id,
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role,
    createdAt: new Date().toISOString()
  };
  memoryStore.users.push(user);

  if (role === 'CANDIDATE') {
    if (!memoryStore.candidates[user.email]) {
      memoryStore.candidates[user.email] = {
        email: user.email,
        name: user.name,
        skills: [],
        createdAt: new Date().toISOString()
      };
    }
  }

  return user;
}

// Candidate Profile methods
export async function getCandidateProfile(email) {
  await initStorageService();
  const target = email.toLowerCase().trim();
  const cand = memoryStore.candidates[target] || null;
  if (!cand) return null;

  const userEdu = memoryStore.education.filter(e => e.email === target);
  const userProj = memoryStore.projects.filter(p => p.email === target);
  const userCert = memoryStore.certificates.filter(c => c.email === target);

  return {
    ...cand,
    education: userEdu,
    projects: userProj,
    certificates: userCert,
    skills: cand.skills || []
  };
}

export async function updateCandidateProfile(email, data) {
  await initStorageService();
  const target = email.toLowerCase().trim();
  if (!memoryStore.candidates[target]) {
    memoryStore.candidates[target] = { email: target, name: data.name || 'User' };
  }
  const cand = memoryStore.candidates[target];
  Object.assign(cand, {
    ...data,
    updatedAt: new Date().toISOString()
  });
  return cand;
}

export async function addEducation(email, eduData) {
  await initStorageService();
  const item = { id: `edu_${Date.now()}`, email: email.toLowerCase(), ...eduData };
  memoryStore.education.push(item);
  return item;
}

export async function addProject(email, projData) {
  await initStorageService();
  const item = { id: `proj_${Date.now()}`, email: email.toLowerCase(), ...projData };
  memoryStore.projects.push(item);
  return item;
}

export async function deleteProject(email, id) {
  await initStorageService();
  memoryStore.projects = memoryStore.projects.filter(p => !(p.email === email.toLowerCase() && p.id === id));
  return true;
}

export async function addCertificate(email, certData) {
  await initStorageService();
  const item = { id: `cert_${Date.now()}`, email: email.toLowerCase(), ...certData };
  memoryStore.certificates.push(item);
  return item;
}

export async function deleteCertificate(email, id) {
  await initStorageService();
  memoryStore.certificates = memoryStore.certificates.filter(c => !(c.email === email.toLowerCase() && c.id === id));
  return true;
}

// Applications
export async function createApplication(email, name) {
  await initStorageService();
  const target = email.toLowerCase();
  // Check if exists
  let app = memoryStore.applications.find(a => a.email === target);
  if (app) {
    app.updatedAt = new Date().toISOString();
    return app;
  }
  app = {
    id: `app_${Date.now()}`,
    email: target,
    name,
    status: 'Applied',
    appliedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    adminNote: ''
  };
  memoryStore.applications.push(app);
  return app;
}

export async function getApplicationByEmail(email) {
  await initStorageService();
  const target = email.toLowerCase();
  const app = memoryStore.applications.find(a => a.email === target) || null;
  if (!app) return null;

  const asmnts = memoryStore.assessments.filter(a => a.applicationId === app.id);
  const ivs = memoryStore.interviews.filter(i => i.applicationId === app.id);

  return {
    ...app,
    assessments: asmnts,
    interviews: ivs
  };
}

// Admin Candidate Listing & Pipeline
export async function getAdminCandidates({ search = '', stage = '', page = 1, limit = 20 }) {
  await initStorageService();
  const s = search.toLowerCase();

  let list = Object.values(memoryStore.candidates).map(c => {
    const app = memoryStore.applications.find(a => a.email === c.email) || null;
    return {
      ...c,
      application: app
    };
  });

  if (s) {
    list = list.filter(c => c.name.toLowerCase().includes(s) || c.email.toLowerCase().includes(s));
  }
  if (stage) {
    list = list.filter(c => c.application?.status === stage);
  }

  const total = list.length;
  const skip = (page - 1) * limit;
  const paginated = list.slice(skip, skip + limit);

  return { candidates: paginated, total, page, limit };
}

export async function getAdminCandidateDetail(email) {
  await initStorageService();
  const target = decodeURIComponent(email).toLowerCase();
  const cand = memoryStore.candidates[target];
  if (!cand) return null;

  const app = memoryStore.applications.find(a => a.email === target) || null;
  const edu = memoryStore.education.filter(e => e.email === target);
  const proj = memoryStore.projects.filter(p => p.email === target);
  const cert = memoryStore.certificates.filter(c => c.email === target);
  const asmnts = app ? memoryStore.assessments.filter(a => a.applicationId === app.id) : [];
  const ivs = app ? memoryStore.interviews.filter(i => i.applicationId === app.id) : [];

  return {
    ...cand,
    application: app,
    education: edu,
    projects: proj,
    certificates: cert,
    skills: cand.skills || [],
    assessments: asmnts,
    interviews: ivs
  };
}

export async function updateApplicationStage(id, stage, note) {
  await initStorageService();
  const app = memoryStore.applications.find(a => a.id === id);
  if (!app) return null;
  app.status = stage;
  if (note !== undefined) app.adminNote = note;
  app.updatedAt = new Date().toISOString();
  return app;
}

export async function getAdminStats() {
  await initStorageService();
  const candidatesCount = Object.keys(memoryStore.candidates).length;
  const applicationsCount = memoryStore.applications.length;

  const countByStage = stage => memoryStore.applications.filter(a => a.status === stage).length;

  return {
    totalCandidates: candidatesCount,
    totalApplications: applicationsCount,
    newApplications: countByStage('Applied'),
    pendingAssessments: countByStage('Assessment'),
    interviews: countByStage('Interview'),
    selected: countByStage('Selected'),
    hired: countByStage('Hired'),
    rejected: countByStage('Rejected')
  };
}

export async function getAdminPipeline() {
  await initStorageService();
  const VALID_STAGES = ['Applied', 'Screening', 'Assessment', 'Interview', 'Selected', 'Hired', 'Rejected', 'Hold'];
  const pipeline = {};
  VALID_STAGES.forEach(s => { pipeline[s] = []; });

  memoryStore.applications.forEach(a => {
    const cand = memoryStore.candidates[a.email] || { name: a.name, email: a.email, role: 'Developer' };
    const stage = a.status || 'Applied';
    if (!pipeline[stage]) pipeline[stage] = [];
    pipeline[stage].push({
      name: cand.name,
      email: cand.email,
      role: cand.role || 'Candidate',
      applicationId: a.id,
      appliedAt: a.appliedAt
    });
  });

  return pipeline;
}

export async function createAssessment(applicationId, title, description, dueDate) {
  await initStorageService();
  const item = {
    id: `asmnt_${Date.now()}`,
    applicationId,
    title,
    description: description || null,
    dueDate: dueDate || null,
    status: 'Pending',
    assignedAt: new Date().toISOString()
  };
  memoryStore.assessments.push(item);
  return item;
}

export async function createInterview(applicationId, date, interviewer, meetingLink, notes) {
  await initStorageService();
  const item = {
    id: `iv_${Date.now()}`,
    applicationId,
    date,
    interviewer: interviewer || null,
    meetingLink: meetingLink || null,
    notes: notes || null,
    status: 'Scheduled',
    scheduledAt: new Date().toISOString()
  };
  memoryStore.interviews.push(item);
  return item;
}
