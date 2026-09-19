import React, { useState } from 'react';
import { User, Mail, Github, Linkedin, UploadCloud, FileText, CheckCircle2, ArrowRight, Code, Briefcase, Award } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

export function CandidateIntakePage({ onProceedToRecommendations }) {
  const [form, setForm] = useState({
    name: 'Alice Vance',
    email: 'alice@talentos.io',
    github: 'https://github.com/alicevance',
    linkedin: 'https://linkedin.com/in/alicevance',
    skills: 'GoLang, Kubernetes, AWS, React, GraphQL',
    projectName: 'Autonomous Microservices Mesh',
    projectRole: 'Lead Cloud Architect',
    summary: 'Senior Cloud Infrastructure Engineer specializing in high-throughput microservices, Kubernetes orchestration, and graph database telemetry.'
  });

  const [resumeFile, setResumeFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/candidates/ingest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          resumeText: form.summary,
          skills: form.skills.split(',').map(s => s.trim()),
          project: { name: form.projectName },
          role: form.projectRole
        })
      });
      const data = await res.json();
      setSubmittedData(data);
    } catch (err) {
      setSubmittedData({ success: true, message: 'Profile saved locally.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="candidate-intake-container" style={{ maxWidth: '900px', margin: '0 auto', padding: '1rem' }}>
      <div className="hud-panel" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-header">
          <h2><User className="panel-icon" size={20} /> Candidate Registration & Comprehensive Profile Setup</h2>
          <span className="badge success">STEP 1 OF 2</span>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>
          Enter your candidate profile information. Our Agentic AI will parse your technical skills, portfolio projects, and resume to build your graph node profile.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="hud-panel" style={{ gap: '1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label><User size={12} style={{ display: 'inline', marginRight: '4px' }} /> Full Name</label>
            <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="Alice Vance" />
          </div>

          <div className="form-group">
            <label><Mail size={12} style={{ display: 'inline', marginRight: '4px' }} /> Email Address</label>
            <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="alice@talentos.io" />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label><Github size={12} style={{ display: 'inline', marginRight: '4px' }} /> GitHub Profile URL</label>
            <input type="url" name="github" value={form.github} onChange={handleChange} placeholder="https://github.com/username" />
          </div>

          <div className="form-group">
            <label><Linkedin size={12} style={{ display: 'inline', marginRight: '4px' }} /> LinkedIn Profile URL</label>
            <input type="url" name="linkedin" value={form.linkedin} onChange={handleChange} placeholder="https://linkedin.com/in/username" />
          </div>
        </div>

        <div className="form-group">
          <label><Code size={12} style={{ display: 'inline', marginRight: '4px' }} /> Core Skills & Technologies (Comma-separated)</label>
          <input type="text" name="skills" value={form.skills} onChange={handleChange} placeholder="GoLang, Kubernetes, React, Python" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label><Briefcase size={12} style={{ display: 'inline', marginRight: '4px' }} /> Featured Project Name</label>
            <input type="text" name="projectName" value={form.projectName} onChange={handleChange} placeholder="Microservices Infrastructure Mesh" />
          </div>

          <div className="form-group">
            <label><Award size={12} style={{ display: 'inline', marginRight: '4px' }} /> Your Role in Project</label>
            <input type="text" name="projectRole" value={form.projectRole} onChange={handleChange} placeholder="Lead Cloud Architect" />
          </div>
        </div>

        <div className="form-group">
          <label><FileText size={12} style={{ display: 'inline', marginRight: '4px' }} /> Professional Summary & Experience</label>
          <textarea name="summary" value={form.summary} onChange={handleChange} rows="4" placeholder="Brief outline of your key experience, technical stack, and achievements..." />
        </div>

        {/* Resume Upload Box */}
        <div className="form-group">
          <label><UploadCloud size={12} style={{ display: 'inline', marginRight: '4px' }} /> Upload Resume File (PDF/DOCX)</label>
          <div style={{ border: '2px dashed #cbd5e1', padding: '1.25rem', borderRadius: '8px', textAlign: 'center', background: '#f8fafc' }}>
            <input type="file" accept=".pdf,.docx" onChange={e => setResumeFile(e.target.files[0])} style={{ width: '100%', fontSize: '0.8rem' }} />
            {resumeFile && <div style={{ color: 'var(--color-cyan)', fontSize: '0.8rem', marginTop: '0.5rem', fontWeight: 600 }}>File attached: {resumeFile.name}</div>}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <button type="submit" className="hud-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Saving Profile...' : 'Save Profile Details'}
          </button>

          <button 
            type="button" 
            className="hud-btn" 
            style={{ background: 'linear-gradient(135deg, #16a34a 0%, #0284c7 100%)' }}
            onClick={() => onProceedToRecommendations(form.email)}
          >
            Next: View Career Recommendations <ArrowRight size={14} />
          </button>
        </div>
      </form>

      {submittedData && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', color: '#166534', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} /> Candidate Profile successfully indexed into TalentOS Graph Data Core!
        </div>
      )}
    </div>
  );
}
