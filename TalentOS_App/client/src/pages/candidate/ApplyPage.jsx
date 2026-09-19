import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Upload, Loader2, Save, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const STEPS = ['Personal', 'Education', 'Skills', 'Profiles', 'Projects', 'Certificates', 'Resume', 'Review'];
const SKILL_CATS = ['Languages', 'Frameworks', 'Databases', 'Cloud', 'Tools'];

function StepHeader({ step, setStep, totalSteps }) {
  return (
    <div className="steps-header">
      {STEPS.map((label, idx) => {
        const done = idx < step;
        const active = idx === step;
        return (
          <div key={label} className="step-item">
            <div
              className={`step-circle ${active ? 'active' : done ? 'done' : ''}`}
              style={{ cursor: done ? 'pointer' : 'default' }}
              onClick={() => done && setStep(idx)}
            >
              {done ? '✓' : idx + 1}
            </div>
            <span className={`step-label ${active ? 'active' : done ? 'done' : ''}`}>{label}</span>
            {idx < totalSteps - 1 && <div className={`step-connector ${done ? 'done' : ''}`} />}
          </div>
        );
      })}
    </div>
  );
}

function Field({ label, optional, children, error, hint }) {
  return (
    <div className="form-group">
      <label className="form-label">
        {label} {optional && <span className="form-label-optional">(optional)</span>}
      </label>
      {children}
      {error && <div className="form-error">{error}</div>}
      {hint && !error && <div className="form-hint">{hint}</div>}
    </div>
  );
}

export default function ApplyPage() {
  const { api, user } = useAuth();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  // Form data per section
  const [personal, setPersonal] = useState({ name: user?.name || '', email: user?.email || '', phone: '', location: '' });
  const [education, setEducation] = useState({ college: '', degree: '', specialization: '', gradYear: '', cgpa: '' });
  const [skillsMap, setSkillsMap] = useState({ Languages: [], Frameworks: [], Databases: [], Cloud: [], Tools: [] });
  const [skillInput, setSkillInput] = useState({ Languages: '', Frameworks: '', Databases: '', Cloud: '', Tools: '' });
  const [profiles, setProfiles] = useState({ githubUrl: '', linkedinUrl: '', leetcodeUrl: '', leetcodeScore: '', portfolioUrl: '', role: '' });
  const [projects, setProjects] = useState([{ name: '', description: '', techStack: '', githubUrl: '', liveDemoUrl: '' }]);
  const [certificates, setCertificates] = useState([{ name: '', issuer: '', date: '', url: '' }]);
  const [resumeFile, setResumeFile] = useState(null);
  const fileRef = useRef();

  const allSkills = Object.values(skillsMap).flat();

  const validate = () => {
    const e = {};
    if (step === 0) {
      if (!personal.name.trim()) e.name = 'Full name is required.';
      if (!personal.email.trim()) e.email = 'Email is required.';
    }
    if (step === 1) {
      if (!education.college.trim()) e.college = 'College name is required.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const addSkill = (cat) => {
    const val = skillInput[cat].trim();
    if (val && !skillsMap[cat].includes(val)) {
      setSkillsMap(m => ({ ...m, [cat]: [...m[cat], val] }));
    }
    setSkillInput(m => ({ ...m, [cat]: '' }));
  };

  const removeSkill = (cat, skill) => setSkillsMap(m => ({ ...m, [cat]: m[cat].filter(s => s !== skill) }));

  const addProject = () => setProjects(p => [...p, { name: '', description: '', techStack: '', githubUrl: '', liveDemoUrl: '' }]);
  const removeProject = (i) => setProjects(p => p.filter((_, idx) => idx !== i));
  const setProject = (i, k, v) => setProjects(p => p.map((proj, idx) => idx === i ? { ...proj, [k]: v } : proj));

  const addCert = () => setCertificates(c => [...c, { name: '', issuer: '', date: '', url: '' }]);
  const removeCert = (i) => setCertificates(c => c.filter((_, idx) => idx !== i));
  const setCert = (i, k, v) => setCertificates(c => c.map((cert, idx) => idx === i ? { ...cert, [k]: v } : cert));

  const next = () => { if (validate()) setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const prev = () => setStep(s => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // 1. Update profile (personal + links + skills)
      await api('/api/ats/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: personal.name, phone: personal.phone, location: personal.location,
          role: profiles.role,
          githubUrl: profiles.githubUrl, linkedinUrl: profiles.linkedinUrl,
          leetcodeUrl: profiles.leetcodeUrl, leetcodeScore: profiles.leetcodeScore,
          portfolioUrl: profiles.portfolioUrl,
          skills: allSkills,
        }),
      });

      // 2. Education
      if (education.college) {
        await api('/api/ats/education', { method: 'POST', body: JSON.stringify(education) });
      }

      // 3. Projects
      for (const proj of projects.filter(p => p.name)) {
        await api('/api/ats/projects', { method: 'POST', body: JSON.stringify(proj) });
      }

      // 4. Certificates
      for (const cert of certificates.filter(c => c.name)) {
        await api('/api/ats/certificates', { method: 'POST', body: JSON.stringify(cert) });
      }

      // 5. Submit application
      await api('/api/ats/apply', { method: 'POST', body: JSON.stringify({}) });

      setSuccess(true);
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <>
        <div className="topbar"><div className="topbar-title">Application Submitted</div></div>
        <div className="page-content" style={{ maxWidth: 600, textAlign: 'center' }}>
          <div className="card">
            <div className="card-body" style={{ padding: 'var(--sp-16)' }}>
              <div style={{ fontSize: 48, marginBottom: 'var(--sp-4)' }}>🎉</div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--sp-3)' }}>Application Submitted!</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--sp-6)' }}>
                Your application has been received. We'll be in touch soon.
              </p>
              <a href="/candidate/dashboard" className="btn btn-primary">Go to Dashboard</a>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="topbar">
        <div>
          <div className="topbar-title">Apply</div>
          <div className="topbar-subtitle">Step {step + 1} of {STEPS.length} — {STEPS[step]}</div>
        </div>
      </div>
      <div className="page-content" style={{ maxWidth: 780 }}>
        <StepHeader step={step} setStep={setStep} totalSteps={STEPS.length} />

        <div className="card">
          <div className="card-body">
            {/* ── Step 0: Personal ── */}
            {step === 0 && (
              <div>
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>Personal Information</h2>
                <div className="grid-2" style={{ gap: 'var(--sp-4)' }}>
                  <Field label="Full Name" error={errors.name}>
                    <input className={`input ${errors.name ? 'error' : ''}`} value={personal.name}
                      onChange={e => setPersonal(p => ({ ...p, name: e.target.value }))} placeholder="Alice Vance" />
                  </Field>
                  <Field label="Email" error={errors.email}>
                    <input className={`input ${errors.email ? 'error' : ''}`} type="email" value={personal.email}
                      onChange={e => setPersonal(p => ({ ...p, email: e.target.value }))} placeholder="alice@example.com" />
                  </Field>
                  <Field label="Phone" optional>
                    <input className="input" value={personal.phone}
                      onChange={e => setPersonal(p => ({ ...p, phone: e.target.value }))} placeholder="+91 98765 43210" />
                  </Field>
                  <Field label="Location" optional>
                    <input className="input" value={personal.location}
                      onChange={e => setPersonal(p => ({ ...p, location: e.target.value }))} placeholder="Bengaluru, India" />
                  </Field>
                </div>
              </div>
            )}

            {/* ── Step 1: Education ── */}
            {step === 1 && (
              <div>
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>Education</h2>
                <div className="grid-2" style={{ gap: 'var(--sp-4)' }}>
                  <Field label="College / University" error={errors.college}>
                    <input className={`input ${errors.college ? 'error' : ''}`} value={education.college}
                      onChange={e => setEducation(d => ({ ...d, college: e.target.value }))} placeholder="IIT Bombay" />
                  </Field>
                  <Field label="Degree" optional>
                    <input className="input" value={education.degree}
                      onChange={e => setEducation(d => ({ ...d, degree: e.target.value }))} placeholder="B.Tech" />
                  </Field>
                  <Field label="Specialization" optional>
                    <input className="input" value={education.specialization}
                      onChange={e => setEducation(d => ({ ...d, specialization: e.target.value }))} placeholder="Computer Science" />
                  </Field>
                  <Field label="Graduation Year" optional>
                    <input className="input" type="number" value={education.gradYear}
                      onChange={e => setEducation(d => ({ ...d, gradYear: e.target.value }))} placeholder="2024" />
                  </Field>
                  <Field label="CGPA" optional>
                    <input className="input" type="number" step="0.01" value={education.cgpa}
                      onChange={e => setEducation(d => ({ ...d, cgpa: e.target.value }))} placeholder="8.5" />
                  </Field>
                </div>
              </div>
            )}

            {/* ── Step 2: Skills ── */}
            {step === 2 && (
              <div>
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>Skills</h2>
                {SKILL_CATS.map(cat => (
                  <div key={cat} style={{ marginBottom: 'var(--sp-5)' }}>
                    <div className="form-label" style={{ marginBottom: 'var(--sp-2)' }}>{cat}</div>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', marginBottom: 'var(--sp-2)' }}>
                      {skillsMap[cat].map(skill => (
                        <span key={skill} className="badge badge-blue" style={{ gap: 6, paddingRight: 4 }}>
                          {skill}
                          <button type="button" onClick={() => removeSkill(cat, skill)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', padding: 0 }}>
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                      <input className="input" style={{ flex: 1 }} placeholder={`Add ${cat.toLowerCase()}…`}
                        value={skillInput[cat]}
                        onChange={e => setSkillInput(m => ({ ...m, [cat]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill(cat))} />
                      <button className="btn btn-secondary" type="button" onClick={() => addSkill(cat)}>
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Step 3: Profiles / Links ── */}
            {step === 3 && (
              <div>
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>Developer Profiles</h2>
                <div className="grid-2" style={{ gap: 'var(--sp-4)' }}>
                  <Field label="Role Applying For" optional>
                    <input className="input" value={profiles.role}
                      onChange={e => setProfiles(p => ({ ...p, role: e.target.value }))} placeholder="Senior Backend Engineer" />
                  </Field>
                  <Field label="GitHub URL" optional>
                    <input className="input" type="url" value={profiles.githubUrl}
                      onChange={e => setProfiles(p => ({ ...p, githubUrl: e.target.value }))} placeholder="https://github.com/username" />
                  </Field>
                  <Field label="LinkedIn URL" optional>
                    <input className="input" type="url" value={profiles.linkedinUrl}
                      onChange={e => setProfiles(p => ({ ...p, linkedinUrl: e.target.value }))} placeholder="https://linkedin.com/in/username" />
                  </Field>
                  <Field label="LeetCode URL" optional>
                    <input className="input" type="url" value={profiles.leetcodeUrl}
                      onChange={e => setProfiles(p => ({ ...p, leetcodeUrl: e.target.value }))} placeholder="https://leetcode.com/username" />
                  </Field>
                  <Field label="LeetCode Score / Rating" optional>
                    <input className="input" type="number" value={profiles.leetcodeScore}
                      onChange={e => setProfiles(p => ({ ...p, leetcodeScore: e.target.value }))} placeholder="1800" />
                  </Field>
                  <Field label="Portfolio URL" optional>
                    <input className="input" type="url" value={profiles.portfolioUrl}
                      onChange={e => setProfiles(p => ({ ...p, portfolioUrl: e.target.value }))} placeholder="https://myportfolio.dev" />
                  </Field>
                </div>
              </div>
            )}

            {/* ── Step 4: Projects ── */}
            {step === 4 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-6)' }}>
                  <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Projects</h2>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={addProject}>
                    <Plus size={13} /> Add Project
                  </button>
                </div>
                {projects.map((proj, i) => (
                  <div key={i} className="card" style={{ marginBottom: 'var(--sp-4)' }}>
                    <div className="card-header" style={{ justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Project {i + 1}</span>
                      {projects.length > 1 && (
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeProject(i)}
                          style={{ color: 'var(--red-500)' }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="card-body">
                      <div className="grid-2" style={{ gap: 'var(--sp-4)' }}>
                        <Field label="Project Name">
                          <input className="input" value={proj.name} placeholder="My Awesome Project"
                            onChange={e => setProject(i, 'name', e.target.value)} />
                        </Field>
                        <Field label="Tech Stack" optional>
                          <input className="input" value={proj.techStack} placeholder="React, Node.js, PostgreSQL"
                            onChange={e => setProject(i, 'techStack', e.target.value)} />
                        </Field>
                        <Field label="GitHub Link" optional>
                          <input className="input" type="url" value={proj.githubUrl} placeholder="https://github.com/..."
                            onChange={e => setProject(i, 'githubUrl', e.target.value)} />
                        </Field>
                        <Field label="Live Demo URL" optional>
                          <input className="input" type="url" value={proj.liveDemoUrl} placeholder="https://myproject.com"
                            onChange={e => setProject(i, 'liveDemoUrl', e.target.value)} />
                        </Field>
                      </div>
                      <Field label="Description" optional>
                        <textarea className="textarea" value={proj.description} placeholder="What does this project do?"
                          onChange={e => setProject(i, 'description', e.target.value)} />
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Step 5: Certificates ── */}
            {step === 5 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-6)' }}>
                  <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>Certificates</h2>
                  <button className="btn btn-secondary btn-sm" type="button" onClick={addCert}>
                    <Plus size={13} /> Add Certificate
                  </button>
                </div>
                {certificates.map((cert, i) => (
                  <div key={i} className="card" style={{ marginBottom: 'var(--sp-4)' }}>
                    <div className="card-header" style={{ justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>Certificate {i + 1}</span>
                      {certificates.length > 1 && (
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => removeCert(i)}
                          style={{ color: 'var(--red-500)' }}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <div className="card-body">
                      <div className="grid-2" style={{ gap: 'var(--sp-4)' }}>
                        <Field label="Certificate Name">
                          <input className="input" value={cert.name} placeholder="AWS Solutions Architect"
                            onChange={e => setCert(i, 'name', e.target.value)} />
                        </Field>
                        <Field label="Issuer" optional>
                          <input className="input" value={cert.issuer} placeholder="Amazon Web Services"
                            onChange={e => setCert(i, 'issuer', e.target.value)} />
                        </Field>
                        <Field label="Date" optional>
                          <input className="input" type="date" value={cert.date}
                            onChange={e => setCert(i, 'date', e.target.value)} />
                        </Field>
                        <Field label="Certificate URL / File" optional>
                          <input className="input" type="url" value={cert.url} placeholder="https://..."
                            onChange={e => setCert(i, 'url', e.target.value)} />
                        </Field>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Step 6: Resume ── */}
            {step === 6 && (
              <div>
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>Resume Upload</h2>
                <div
                  className={`dropzone ${resumeFile ? 'drag-over' : ''}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); }}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setResumeFile(f); }}
                >
                  <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" hidden onChange={e => setResumeFile(e.target.files[0])} />
                  <div className="dropzone-icon"><Upload size={32} /></div>
                  {resumeFile
                    ? <div className="dropzone-title" style={{ color: 'var(--green-600)' }}>✓ {resumeFile.name}</div>
                    : <div className="dropzone-title">Drop your resume here or click to browse</div>
                  }
                  <div className="dropzone-sub">PDF, DOC, DOCX · max 10MB</div>
                </div>
                {resumeFile && (
                  <div className="alert alert-success" style={{ marginTop: 'var(--sp-4)' }}>
                    Resume "{resumeFile.name}" ready to submit.
                  </div>
                )}
              </div>
            )}

            {/* ── Step 7: Review ── */}
            {step === 7 && (
              <div>
                <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--sp-6)' }}>Review & Submit</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
                  {[
                    { title: 'Personal', data: [['Name', personal.name], ['Email', personal.email], ['Phone', personal.phone], ['Location', personal.location]] },
                    { title: 'Education', data: [['College', education.college], ['Degree', education.degree], ['Specialization', education.specialization], ['Graduation', education.gradYear], ['CGPA', education.cgpa]] },
                    { title: 'Developer Profiles', data: [['GitHub', profiles.githubUrl], ['LinkedIn', profiles.linkedinUrl], ['LeetCode', profiles.leetcodeUrl], ['LeetCode Score', profiles.leetcodeScore], ['Portfolio', profiles.portfolioUrl]] },
                  ].map(({ title, data }) => (
                    <div key={title} className="card">
                      <div className="card-header"><span className="card-title">{title}</span></div>
                      <div className="card-body">
                        {data.filter(([, v]) => v).map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', gap: 'var(--sp-4)', fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-2)' }}>
                            <span style={{ color: 'var(--text-secondary)', width: 140, flexShrink: 0 }}>{k}</span>
                            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="card">
                    <div className="card-header"><span className="card-title">Skills ({allSkills.length})</span></div>
                    <div className="card-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                      {allSkills.map(s => <span key={s} className="badge badge-blue">{s}</span>)}
                    </div>
                  </div>
                  <div className="card">
                    <div className="card-header"><span className="card-title">Projects ({projects.filter(p=>p.name).length})</span></div>
                    <div className="card-body">
                      {projects.filter(p => p.name).map((p, i) => (
                        <div key={i} style={{ marginBottom: 'var(--sp-3)' }}>
                          <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{p.name}</div>
                          {p.techStack && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{p.techStack}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                  {errors.submit && <div className="alert alert-error">{errors.submit}</div>}
                </div>
              </div>
            )}
          </div>
          <div className="card-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button className="btn btn-secondary" type="button" onClick={prev} disabled={step === 0}>
                ← Back
              </button>
              {step < STEPS.length - 1 ? (
                <button className="btn btn-primary" type="button" onClick={next}>
                  Continue →
                </button>
              ) : (
                <button className="btn btn-success btn-lg" type="button" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? <Loader2 size={15} className="spinner" /> : <Save size={15} />}
                  {submitting ? 'Submitting…' : 'Submit Application'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
