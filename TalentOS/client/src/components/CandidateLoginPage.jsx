import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertCircle, UserPlus } from 'lucide-react';

const MOCK_USERS = [
  { email: 'alice@talentos.io',   password: 'talent123', name: 'Alice Vance'  },
  { email: 'bob@talentos.io',     password: 'talent123', name: 'Bob Smith'    },
  { email: 'carol@talentos.io',   password: 'talent123', name: 'Carol Danvers'},
];

export function CandidateLoginPage({ onLoginSuccess, onBack }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
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
      const user = MOCK_USERS.find(u => u.email === form.email && u.password === form.password);
      if (user) {
        setSuccess(`Welcome back, ${user.name}!`);
        setTimeout(() => onLoginSuccess(user), 900);
      } else {
        setError('Invalid email or password. Try alice@talentos.io / talent123');
      }
      setLoading(false);
    }, 700);
  };

  const handleRegister = (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.email || !form.password) {
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
      const newUser = { email: form.email, name: form.name };
      setSuccess(`Account created! Welcome, ${form.name}!`);
      setTimeout(() => onLoginSuccess(newUser), 900);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="auth-page-root">
      {/* Left panel — branding */}
      <div className="auth-left-panel candidate-left-panel">
        <div className="auth-left-blob blob-1" />
        <div className="auth-left-blob blob-2" />

        <button className="auth-back-btn" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>

        <div className="auth-brand-wrap">
          <div className="auth-logo">TO</div>
          <h1 className="auth-brand-name">TalentOS</h1>
          <p className="auth-brand-sub">Candidate Portal</p>
        </div>

        <div className="auth-left-features">
          <div className="auth-feature-item">
            <div className="auth-feature-dot candidate-dot" />
            AI-powered career roadmap & skill analysis
          </div>
          <div className="auth-feature-item">
            <div className="auth-feature-dot candidate-dot" />
            Real-time global hackathon rankings
          </div>
          <div className="auth-feature-item">
            <div className="auth-feature-dot candidate-dot" />
            Shadow Sprint AI-weighted code assessment
          </div>
          <div className="auth-feature-item">
            <div className="auth-feature-dot candidate-dot" />
            Personalized certification tracker
          </div>
        </div>

        <p className="auth-left-footer">
          "The platform that understands your code, not just your resume."
        </p>
      </div>

      {/* Right panel — form */}
      <div className="auth-right-panel">
        <div className="auth-form-card">
          {/* Mode Toggle */}
          <div className="auth-mode-toggle">
            <button
              className={`auth-mode-btn ${mode === 'login' ? 'active candidate-mode-active' : ''}`}
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
            >
              Sign In
            </button>
            <button
              className={`auth-mode-btn ${mode === 'register' ? 'active candidate-mode-active' : ''}`}
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
            >
              <UserPlus size={14} /> Register
            </button>
          </div>

          <div className="auth-form-header">
            <div className="auth-form-icon candidate-form-icon">
              <User size={22} />
            </div>
            <div>
              <h2 className="auth-form-title">
                {mode === 'login' ? 'Welcome back' : 'Create account'}
              </h2>
              <p className="auth-form-subtitle">
                {mode === 'login'
                  ? 'Sign in to your candidate workspace'
                  : 'Join TalentOS as a candidate today'}
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
                <label className="auth-label"><Mail size={12} /> Email address</label>
                <input
                  type="email"
                  name="email"
                  className="auth-input"
                  placeholder="alice@talentos.io"
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
                    className="auth-input"
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
                <span className="auth-hint">Demo: alice@talentos.io / talent123</span>
                <button type="button" className="auth-link-btn">Forgot password?</button>
              </div>

              <button type="submit" className="auth-submit-btn candidate-submit-btn" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : <><User size={15} /> Sign In to Candidate Portal</>}
              </button>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="auth-form">
              <div className="auth-field">
                <label className="auth-label"><User size={12} /> Full Name</label>
                <input
                  type="text"
                  name="name"
                  className="auth-input"
                  placeholder="Alice Vance"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="auth-field">
                <label className="auth-label"><Mail size={12} /> Email address</label>
                <input
                  type="email"
                  name="email"
                  className="auth-input"
                  placeholder="you@example.com"
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
                    className="auth-input"
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
                    className="auth-input"
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

              <button type="submit" className="auth-submit-btn candidate-submit-btn" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : <><UserPlus size={15} /> Create Candidate Account</>}
              </button>
            </form>
          )}

          <p className="auth-switch-text">
            {mode === 'login'
              ? <>No account? <button className="auth-link-btn" onClick={() => { setMode('register'); setError(''); }}>Register here</button></>
              : <>Already registered? <button className="auth-link-btn" onClick={() => { setMode('login'); setError(''); }}>Sign in</button></>}
          </p>
        </div>
      </div>
    </div>
  );
}
