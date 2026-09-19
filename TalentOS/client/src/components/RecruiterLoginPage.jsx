import React, { useState } from 'react';
import { Briefcase, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react';

const MOCK_RECRUITERS = [
  { email: 'hr@company.io',       password: 'recruit123', name: 'Sarah Connor',   company: 'TechCorp'    },
  { email: 'talent@startup.io',   password: 'recruit123', name: 'James Wilson',   company: 'StartupXYZ'  },
  { email: 'hiring@enterprise.io',password: 'recruit123', name: 'Priya Sharma',   company: 'Enterprise Co'},
];

export function RecruiterLoginPage({ onLoginSuccess, onBack }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', company: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setTimeout(() => {
      const user = MOCK_RECRUITERS.find(u => u.email === form.email && u.password === form.password);
      if (user) {
        setSuccess(`Welcome, ${user.name} from ${user.company}!`);
        setTimeout(() => onLoginSuccess(user), 900);
      } else {
        setError('Invalid credentials. Try hr@company.io / recruit123');
      }
      setLoading(false);
    }, 700);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password || !form.company) {
      setError('All fields are required.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const newUser = { email: form.email, name: form.name, company: form.company };
      setSuccess(`Account created! Welcome to TalentOS, ${form.name}!`);
      setTimeout(() => onLoginSuccess(newUser), 900);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="auth-page-root">
      {/* Left panel — branding */}
      <div className="auth-left-panel recruiter-left-panel">
        <div className="auth-left-blob recruiter-blob-1" />
        <div className="auth-left-blob recruiter-blob-2" />

        <button className="auth-back-btn" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>

        <div className="auth-brand-wrap">
          <div className="auth-logo recruiter-auth-logo">TO</div>
          <h1 className="auth-brand-name">TalentOS</h1>
          <p className="auth-brand-sub recruiter-brand-sub">Recruiter Portal</p>
        </div>

        <div className="auth-left-features">
          <div className="auth-feature-item">
            <div className="auth-feature-dot recruiter-dot" />
            Post hiring requisitions & AI match candidates
          </div>
          <div className="auth-feature-item">
            <div className="auth-feature-dot recruiter-dot" />
            Monitor real-time global hackathon leaderboards
          </div>
          <div className="auth-feature-item">
            <div className="auth-feature-dot recruiter-dot" />
            Review student scorecards & fraud detection
          </div>
          <div className="auth-feature-item">
            <div className="auth-feature-dot recruiter-dot" />
            Track student tech achievements & evolution
          </div>
        </div>

        <p className="auth-left-footer">
          "Hire for talent intelligence, not just credentials."
        </p>
      </div>

      {/* Right panel — form */}
      <div className="auth-right-panel">
        <div className="auth-form-card">
          {/* Mode Toggle */}
          <div className="auth-mode-toggle">
            <button
              className={`auth-mode-btn ${mode === 'login' ? 'active recruiter-mode-active' : ''}`}
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            >
              Sign In
            </button>
            <button
              className={`auth-mode-btn ${mode === 'register' ? 'active recruiter-mode-active' : ''}`}
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
            >
              <UserPlus size={14} /> Register
            </button>
          </div>

          <div className="auth-form-header">
            <div className="auth-form-icon recruiter-form-icon">
              <Briefcase size={22} />
            </div>
            <div>
              <h2 className="auth-form-title">
                {mode === 'login' ? 'Recruiter sign in' : 'Create recruiter account'}
              </h2>
              <p className="auth-form-subtitle">
                {mode === 'login'
                  ? 'Access your talent acquisition command centre'
                  : 'Join TalentOS as a recruiter today'}
              </p>
            </div>
          </div>

          {/* Success Banner */}
          {success && (
            <div className="auth-banner auth-success-banner">
              <CheckCircle2 size={15} /> {success}
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="auth-banner auth-error-banner">
              <AlertCircle size={15} /> {error}
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="auth-form">
              <div className="auth-field">
                <label className="auth-label"><Mail size={12} /> Work email address</label>
                <input
                  type="email"
                  name="email"
                  className="auth-input recruiter-input"
                  placeholder="hr@company.io"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label className="auth-label"><Lock size={12} /> Password</label>
                <div className="auth-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="auth-input recruiter-input"
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    autoComplete="current-password"
                  />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(p => !p)}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="auth-forgot-row">
                <span className="auth-hint">Demo: hr@company.io / recruit123</span>
                <button type="button" className="auth-link-btn recruiter-link">Forgot password?</button>
              </div>

              <button type="submit" className="auth-submit-btn recruiter-submit-btn" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : <><Briefcase size={15} /> Sign In to Recruiter Portal</>}
              </button>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="auth-form">
              <div className="auth-field">
                <label className="auth-label"><Briefcase size={12} /> Full Name</label>
                <input
                  type="text"
                  name="name"
                  className="auth-input recruiter-input"
                  placeholder="Sarah Connor"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-label"><Briefcase size={12} /> Company / Organisation</label>
                <input
                  type="text"
                  name="company"
                  className="auth-input recruiter-input"
                  placeholder="TechCorp Inc."
                  value={form.company}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-label"><Mail size={12} /> Work email address</label>
                <input
                  type="email"
                  name="email"
                  className="auth-input recruiter-input"
                  placeholder="hr@company.io"
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="auth-field">
                <label className="auth-label"><Lock size={12} /> Password</label>
                <div className="auth-input-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="auth-input recruiter-input"
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(p => !p)}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label"><Lock size={12} /> Confirm Password</label>
                <div className="auth-input-wrap">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirm"
                    className="auth-input recruiter-input"
                    placeholder="Repeat password"
                    value={form.confirm}
                    onChange={handleChange}
                    required
                  />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowConfirm(p => !p)}>
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-submit-btn recruiter-submit-btn" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : <><UserPlus size={15} /> Create Recruiter Account</>}
              </button>
            </form>
          )}

          <p className="auth-switch-text">
            {mode === 'login'
              ? <>No account? <button className="auth-link-btn recruiter-link" onClick={() => { setMode('register'); setError(''); }}>Register here</button></>
              : <>Already registered? <button className="auth-link-btn recruiter-link" onClick={() => { setMode('login'); setError(''); }}>Sign in</button></>}
          </p>
        </div>
      </div>
    </div>
  );
}
