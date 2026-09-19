import React, { useEffect, useRef, useState } from 'react';
import {
  Zap, Users, Globe, Code2, ChevronRight, ArrowRight,
  MapPin, Cpu, Shield, Rocket, Trophy, BookOpen,
  Sparkles, Target, Binary, Network, Sun, Moon,
  BarChart3, Brain, Layers, Lock, Star, Menu, X, Fingerprint, Activity
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   Animated Network Map (right hero column)
───────────────────────────────────────────────────────────── */
function NetworkMap() {
  const nodes = [
    { x: 72,  y: 25,  size: 10, color: '#f97316', pulse: true  },
    { x: 30,  y: 40,  size: 7,  color: '#3b82f6', pulse: false },
    { x: 60,  y: 58,  size: 8,  color: '#3b82f6', pulse: true  },
    { x: 85,  y: 60,  size: 6,  color: '#a855f7', pulse: false },
    { x: 20,  y: 70,  size: 9,  color: '#f97316', pulse: true  },
    { x: 50,  y: 80,  size: 6,  color: '#3b82f6', pulse: false },
    { x: 78,  y: 82,  size: 7,  color: '#a855f7', pulse: true  },
    { x: 40,  y: 20,  size: 6,  color: '#3b82f6', pulse: false },
    { x: 10,  y: 50,  size: 5,  color: '#a855f7', pulse: true  },
    { x: 92,  y: 35,  size: 6,  color: '#f97316', pulse: false },
  ];

  const edges = [
    [0, 2], [0, 1], [0, 9], [1, 4], [2, 3], [2, 5],
    [3, 6], [4, 5], [5, 6], [1, 7], [7, 0], [4, 8], [8, 1],
  ];

  return (
    <div className="relative w-full h-full min-h-[420px] select-none">
      {/* Glow backdrop */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-500/5 via-blue-500/5 to-purple-500/5" />

      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        {[10,20,30,40,50,60,70,80,90].map(v => (
          <g key={v}>
            <line x1={v} y1="0" x2={v} y2="100" stroke="white" strokeOpacity="0.03" strokeWidth="0.3" />
            <line x1="0" y1={v} x2="100" y2={v} stroke="white" strokeOpacity="0.03" strokeWidth="0.3" />
          </g>
        ))}

        {/* Edges */}
        {edges.map(([a, b], i) => (
          <line
            key={i}
            x1={nodes[a].x} y1={nodes[a].y}
            x2={nodes[b].x} y2={nodes[b].y}
            stroke="url(#edgeGrad)"
            strokeOpacity="0.35"
            strokeWidth="0.4"
          />
        ))}

        <defs>
          <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Nodes */}
        {nodes.map((n, i) => (
          <g key={i}>
            {/* Outer glow ring */}
            <circle
              cx={n.x} cy={n.y} r={n.size * 1.8}
              fill={n.color}
              opacity="0.08"
              className={n.pulse ? 'animate-ping' : ''}
              style={{ animationDuration: `${2 + i * 0.3}s` }}
            />
            {/* Main dot */}
            <circle
              cx={n.x} cy={n.y} r={n.size * 0.55}
              fill={n.color}
              opacity="0.95"
            />
            {/* Inner bright core */}
            <circle
              cx={n.x} cy={n.y} r={n.size * 0.25}
              fill="white"
              opacity="0.6"
            />
          </g>
        ))}
      </svg>

      {/* Floating "Knowledge Graph" tooltip */}
      <div
        className="absolute pointer-events-none"
        style={{ left: '64%', top: '18%', transform: 'translate(-50%,-100%)' }}
      >
        <div className="bg-slate-900/80 backdrop-blur-md border border-orange-500/40 rounded-xl px-3 py-2 shadow-lg shadow-orange-500/10 flex items-center gap-2 whitespace-nowrap">
          <Network size={12} className="text-orange-400" />
          <span className="text-xs text-white font-semibold">Live Knowledge Graph</span>
        </div>
        {/* Stem */}
        <div className="w-px h-4 bg-gradient-to-b from-orange-400/60 to-transparent mx-auto" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Fade-in wrapper using IntersectionObserver
───────────────────────────────────────────────────────────── */
function FadeIn({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ${className}`}
      style={{
        transitionDelay: `${delay}ms`,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Landing Page
───────────────────────────────────────────────────────────── */
export default function TalentOSLanding({ onCandidateLogin, onRecruiterLogin }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = ['Platform', 'Agents', 'Features', 'Impact'];

  const stats = [
    { icon: <Cpu size={20} />,         label: 'Autonomous Agents',   value: '6',    color: 'orange' },
    { icon: <Shield size={20} />,      label: 'Fraud Detection',     value: '100%', color: 'blue'   },
    { icon: <Network size={20} />,     label: 'Knowledge Graph',     value: 'Neo4j',color: 'purple' },
    { icon: <Brain size={20} />,       label: 'Vision Evaluator',    value: 'VLM',  color: 'orange' },
  ];

  const steps = [
    { n: '01', title: 'Intake & Fraud Guard',       desc: 'Agent 1 hashes resumes with SHA-256 and runs HF text classifiers to flag AI-generated content instantly.' },
    { n: '02', title: 'Pitch Deck VLM Scorer',      desc: 'Agent 2 uses Gemini Flash Vision to read slides visually and auto-score Clarity, Tech Depth, and Innovation.' },
    { n: '03', title: 'Shadow Sprint IDE',          desc: 'Agent 4 tracks every AI hint in a live coding sandbox. Zero AI hints = Highest Human Rank.' },
    { n: '04', title: 'Digital Twin & Cockpit',     desc: 'Agents 5 & 6 build a live AI twin via graph-aware RAG to power recruiter heatmaps and career roadmaps.' },
  ];

  const features = [
    { icon: <Code2 size={24} />,     title: 'AI-Usage Weighted Ranking',     desc: 'Code more yourself, rank higher. Rewards genuine human engineering over prompt engineering.' },
    { icon: <Fingerprint size={24}/>,title: 'SHA-256 Anti-Fraud',            desc: 'Cryptographic hashing + synthetic text detection eliminates 60% of fabricated applications on day one.' },
    { icon: <Star size={24} />,      title: 'Gemini VLM Pitch Scorer',       desc: 'Objective, automated evaluation of hackathon presentations removing human bias and scaling infinitely.' },
    { icon: <Network size={24} />,   title: 'Neo4j Graph Search',            desc: 'Connects candidates to skills, projects, and peers. Recruiters search by relationship, not just keyword.' },
    { icon: <Users size={24} />,     title: 'AI Career Digital Twin',        desc: 'A Gemini RAG copilot trained on the candidate\'s own graph profile providing tailored progression paths.' },
    { icon: <BarChart3 size={24} />, title: 'Intelligence Cockpit',          desc: 'Real-time talent heatmaps, fraud scorecards, and AI-ranked shortlists for instant hiring decisions.' },
  ];

  const whyReasons = [
    { icon: <Shield size={20} />,  title: 'Resume Fraud is Rampant',    desc: '62% of tech resumes contain inflated/AI content that traditional ATS misses.' },
    { icon: <Activity size={20}/>, title: 'Invisible AI Dependency',    desc: 'Current platforms can\'t tell if you solved it, or if Copilot solved it for you.' },
    { icon: <Target size={20} />,  title: 'Broken Keyword Matching',    desc: 'Flat database searches miss genuine talent hiding behind non-standard keywords.' },
    { icon: <Zap size={20} />,     title: 'Generic Career Guidance',    desc: 'EdTech pushes one-size-fits-all courses instead of adapting to personal skill graphs.' },
  ];

  const colorMap = {
    orange: { border: 'border-orange-500/30', glow: 'group-hover:border-orange-500', icon: 'text-orange-400', bg: 'bg-orange-500/10' },
    blue:   { border: 'border-blue-500/30',   glow: 'group-hover:border-blue-500',   icon: 'text-blue-400',   bg: 'bg-blue-500/10'   },
    purple: { border: 'border-purple-500/30', glow: 'group-hover:border-purple-500', icon: 'text-purple-400', bg: 'bg-purple-500/10' },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-x-hidden">

      {/* ── Radar / grid background ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(248,113,19,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(248,113,19,0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
        {/* Ambient blobs */}
        <div className="absolute top-[-200px] left-[-100px] w-[600px] h-[600px] bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-200px] right-[-100px] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-purple-500/4 rounded-full blur-3xl" />
      </div>

      {/* ══════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════ */}
      <nav className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-xl bg-slate-950/80 border-b border-white/5 shadow-xl shadow-black/20' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <span className="text-white font-black text-sm">TO</span>
              </div>
              <span className="font-bold text-lg tracking-tight">
                Talent<span className="text-orange-400">OS</span>
              </span>
            </div>

            {/* Center links – desktop */}
            <div className="hidden md:flex items-center gap-7">
              {navLinks.map(l => (
                <a key={l} href={`#${l.toLowerCase()}`}
                  className="text-sm text-slate-400 hover:text-white transition-colors duration-200 relative group">
                  {l}
                  <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-orange-400 group-hover:w-full transition-all duration-300" />
                </a>
              ))}
            </div>

            {/* Right controls */}
            <div className="flex items-center gap-3">
              <button onClick={() => setDark(d => !d)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all duration-200">
                {dark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
              <button
                onClick={onCandidateLogin}
                className="hidden md:flex items-center gap-2 px-5 py-2 rounded-full bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/30">
                Register
              </button>
              <button className="md:hidden p-2 text-slate-400" onClick={() => setMenuOpen(m => !m)}>
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="md:hidden border-t border-white/5 py-4 flex flex-col gap-3">
              {navLinks.map(l => (
                <a key={l} href={`#${l.toLowerCase()}`} className="text-sm text-slate-400 hover:text-white px-2 py-1">{l}</a>
              ))}
              <button onClick={onCandidateLogin}
                className="mt-2 px-5 py-2 rounded-full bg-orange-500 text-white text-sm font-semibold">
                Register
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
      <section id="platform" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left – content */}
          <div className="flex flex-col gap-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 w-fit animate-pulse">
              <Sparkles size={13} className="text-orange-400" />
              <span className="text-xs text-orange-300 font-semibold tracking-wide">Powered by Gemini, Neo4j & Qdrant</span>
            </div>

            {/* Headline */}
            <h1 className="text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight">
              Autonomous
              <br />
              Multi-Agent
              <br />
              <span className="bg-gradient-to-r from-orange-400 via-orange-300 to-purple-400 bg-clip-text text-transparent">
                Talent OS.
              </span>
            </h1>

            {/* Sub */}
            <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
              The platform that understands your code — not just your resume. Eliminating resume fraud, AI dependency, and hiring bias with a 6-agent autonomous pipeline.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap gap-3 mt-2">
              <button
                onClick={onCandidateLogin}
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-orange-500 hover:bg-orange-400 text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-orange-500/30 text-sm">
                Register as Candidate <ArrowRight size={15} />
              </button>
              <button
                onClick={onRecruiterLogin}
                className="flex items-center gap-2 px-6 py-3 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold transition-all duration-300 text-sm">
                <Briefcase size={15} /> Recruiter Cockpit
              </button>
            </div>

            {/* Trust row */}
            <div className="flex items-center gap-4 mt-2">
              {[['React 19', 'Frontend'], ['Gemini VLM', 'Vision AI'], ['Neo4j', 'Graph Database']].map(([name, role]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-xs text-slate-500">{name} <span className="text-slate-600">·</span> {role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right – animated map */}
          <div className="relative hidden lg:block">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-orange-500/10 via-blue-500/10 to-purple-500/10 blur-2xl" />
            <div className="relative rounded-3xl border border-white/8 bg-slate-900/50 backdrop-blur-sm p-6 overflow-hidden">
              <NetworkMap />
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          STATS CARDS
      ══════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => {
            const c = colorMap[s.color];
            return (
              <FadeIn key={s.label} delay={i * 80}>
                <div className={`group relative rounded-2xl border ${c.border} ${c.glow} bg-slate-900/60 backdrop-blur-sm p-5 hover:-translate-y-1 transition-all duration-300 cursor-default overflow-hidden`}>
                  {/* Top glow bar on hover */}
                  <div className={`absolute top-0 left-0 right-0 h-[2px] rounded-t-2xl ${s.color === 'orange' ? 'bg-orange-500' : s.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                  <div className={`w-9 h-9 rounded-xl ${c.bg} flex items-center justify-center ${c.icon} mb-3`}>
                    {s.icon}
                  </div>
                  <div className="text-2xl font-black text-white mb-0.5">{s.value}</div>
                  <div className="text-xs text-slate-500 font-medium">{s.label}</div>
                </div>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          ROADMAP / STEPS (AGENTS)
      ══════════════════════════════════════════════ */}
      <section id="agents" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <FadeIn>
          <div className="text-center mb-14">
            <p className="text-orange-400 text-sm font-semibold tracking-widest uppercase mb-3">Pipeline Flow</p>
            <h2 className="text-4xl font-black tracking-tight">The <span className="text-orange-400">6-Agent</span> Architecture</h2>
          </div>
        </FadeIn>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, i) => (
            <FadeIn key={s.n} delay={i * 100}>
              <div className="relative group rounded-2xl border border-white/8 bg-slate-900/50 backdrop-blur-sm p-6 hover:-translate-y-1 hover:border-orange-500/30 transition-all duration-300">
                {/* Big translucent number */}
                <div className="text-8xl font-black text-white/4 absolute top-3 right-4 leading-none select-none">{s.n}</div>
                <div className="relative">
                  <div className="text-orange-400 text-sm font-bold mb-3">Agent {s.n.replace('0', '')}</div>
                  <h3 className="text-white font-bold text-lg mb-2 leading-snug">{s.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          THEMES GRID -> FEATURES GRID
      ══════════════════════════════════════════════ */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <FadeIn>
          <div className="text-center mb-14">
            <p className="text-blue-400 text-sm font-semibold tracking-widest uppercase mb-3">Key Features</p>
            <h2 className="text-4xl font-black tracking-tight">Not just another ATS.</h2>
            <p className="text-slate-400 mt-3 max-w-xl mx-auto">TalentOS creates a verifiable, multi-dimensional profile for every candidate using state-of-the-art AI and graph tech.</p>
          </div>
        </FadeIn>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((t, i) => (
            <FadeIn key={t.title} delay={i * 80}>
              <div className="group rounded-2xl border border-white/8 bg-slate-900/50 backdrop-blur-sm p-6 hover:-translate-y-1 hover:border-blue-500/30 transition-all duration-300 cursor-default">
                <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 mb-4 group-hover:bg-blue-500/20 transition-colors duration-300">
                  {t.icon}
                </div>
                <h3 className="text-white font-bold text-base mb-2">{t.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{t.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          WHY PARTICIPATE -> THE PROBLEM
      ══════════════════════════════════════════════ */}
      <section id="impact" className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-3xl border border-white/8 bg-slate-900/40 backdrop-blur-sm p-10 lg:p-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <div>
                <p className="text-purple-400 text-sm font-semibold tracking-widest uppercase mb-3">The Gap</p>
                <h2 className="text-4xl font-black tracking-tight mb-4">
                  Hiring is broken at
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                    Massive Scale.
                  </span>
                </h2>
                <p className="text-slate-400 leading-relaxed mb-6">
                  No platform today combines skill verification, AI-fraud detection, and personalized career guidance in one system. TalentOS changes the game for 40M+ graduates and recruiters drowning in unqualified applications.
                </p>
                <button onClick={onCandidateLogin}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-purple-500/30 text-sm">
                  Experience TalentOS <ChevronRight size={15} />
                </button>
              </div>
            </FadeIn>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {whyReasons.map((r, i) => (
                <FadeIn key={r.title} delay={i * 80}>
                  <div className="rounded-xl border border-white/8 bg-slate-950/60 p-5 hover:border-purple-500/30 transition-all duration-300">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mb-3">
                      {r.icon}
                    </div>
                    <h4 className="text-white font-bold text-sm mb-1">{r.title}</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">{r.desc}</p>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════ */}
      <footer className="relative z-10 border-t border-white/5 py-10 px-4 sm:px-6 lg:px-8 mt-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
              <span className="text-white font-black text-xs">TO</span>
            </div>
            <span className="text-white font-bold text-sm">TalentOS</span>
            <span className="text-slate-600 text-xs ml-2">Autonomous Talent Intelligence Platform</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-slate-600">
            Powered by &nbsp;<span className="text-slate-500">Gemini AI</span>&nbsp;·&nbsp;
            <span className="text-slate-500">Neo4j Graph</span>&nbsp;·&nbsp;
            <span className="text-slate-500">Qdrant Vector</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Named Briefcase import fix
function Briefcase({ size = 16, ...props }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2"/>
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
    </svg>
  );
}
