import React, { useState } from 'react';
import { User, Briefcase } from 'lucide-react';

export function LandingPortal({ onSelectRole }) {
  return (
    <div className="landing-root">
      <div className="landing-blob blob-blue" />
      <div className="landing-blob blob-purple" />

      <div className="landing-header">
        <div className="landing-logo">TO</div>
        <div>
          <h1 className="landing-brand">TalentOS</h1>
          <p className="landing-tagline">Autonomous Multi-Agent Talent Intelligence Platform</p>
        </div>
      </div>

      <div className="landing-hero-text">
        <h2>Sign in to your portal</h2>
        <p>Choose your role to access your dedicated workspace.</p>
      </div>

      <div className="role-card-row">
        <button className="role-card candidate-card" onClick={() => onSelectRole('candidate-login')}>
          <div className="role-card-icon-wrap candidate-icon-wrap">
            <User size={32} strokeWidth={1.5} />
          </div>
          <h3 className="role-card-title">Candidate Login</h3>
          <p className="role-card-desc">Access your AI-powered career profile, recommendations, and assessments.</p>
          <div className="role-card-cta">Sign in as Candidate →</div>
        </button>

        <div className="role-divider">
          <div className="divider-line" />
          <span className="divider-or">OR</span>
          <div className="divider-line" />
        </div>

        <button className="role-card recruiter-card" onClick={() => onSelectRole('recruiter-login')}>
          <div className="role-card-icon-wrap recruiter-icon-wrap">
            <Briefcase size={32} strokeWidth={1.5} />
          </div>
          <h3 className="role-card-title">Recruiter Login</h3>
          <p className="role-card-desc">Access hiring tools, candidate scorecards, and global talent analytics.</p>
          <div className="role-card-cta recruiter-cta">Sign in as Recruiter →</div>
        </button>
      </div>

      <p className="landing-footer-note">
        TalentOS Platform &nbsp;•&nbsp; Powered by Gemini AI &nbsp;•&nbsp; Neo4j Graph &nbsp;•&nbsp; Qdrant Vector
      </p>
    </div>
  );
}
