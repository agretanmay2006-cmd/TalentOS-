import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Bot, User } from 'lucide-react';
import { useTalentOS } from '../../context/TalentOSContext';
import { AgentBadge, SourceTag, LedgerRow } from '../../components/shared/LedgerComponents';

export default function TwinPage() {
  const { api } = useTalentOS();
  const [email,   setEmail]   = useState('');
  const [session, setSession] = useState(null);
  const [chat,    setChat]    = useState([]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat]);

  const startSession = async () => {
    if (!email) return;
    setStarting(true);
    try {
      const data = await api('/api/twin/session', {
        method: 'POST',
        body: JSON.stringify({ email, action: 'profile' }),
      });
      setSession(data);
      setChat([{
        role: 'agent',
        text: `Digital Twin loaded for ${data.name ?? email}. I have full context of their Neo4j graph — skills, projects, commits, and scores. What would you like to know?`,
        ts: new Date().toISOString(),
      }]);
    } catch (e) {
      setChat([{ role: 'agent', text: `Failed to load profile: ${e.message}`, ts: new Date().toISOString() }]);
    } finally {
      setStarting(false);
    }
  };

  const send = async () => {
    if (!input.trim() || !session) return;
    const userMsg = { role: 'user', text: input, ts: new Date().toISOString() };
    setChat(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const data = await api('/api/twin/session', {
        method: 'POST',
        body: JSON.stringify({ email, action: 'ask', question: userMsg.text }),
      });
      setChat(prev => [...prev, {
        role: 'agent',
        text: data.answer ?? data.message ?? 'No response.',
        ts: new Date().toISOString(),
      }]);
    } catch (e) {
      setChat(prev => [...prev, { role: 'agent', text: `Error: ${e.message}`, ts: new Date().toISOString() }]);
    } finally {
      setLoading(false);
    }
  };

  const QUICK_Q = [
    'What are their strongest skills?',
    'Any fraud flags?',
    'How do they compare for a senior backend role?',
    'Summarise their commit history.',
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Candidate Digital Twin</h1>
        <p className="page-subtitle mono">agent5b·twin → neo4j full-profile → gemini-3.6-flash Q&A</p>
      </div>

      <div className="grid-2" style={{ gap: 'var(--sp-6)' }}>
        {/* ── Left: context panel ───────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Load Profile</span></div>
            <div className="card-body" style={{ display: 'flex', gap: 'var(--sp-3)' }}>
              <input className="input" placeholder="candidate@email.com" value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && startSession()}
                style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={startSession} disabled={starting}>
                {starting ? <Loader2 size={14} className="spinner" /> : <Bot size={14} />}
                Start Twin
              </button>
            </div>
          </div>

          {session && (
            <motion.div className="card animate-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="card-header">
                <span className="card-title">Loaded Context</span>
                <AgentBadge agent="agent5" status="live" />
              </div>
              <div className="card-body">
                <LedgerRow field="name"     value={session.name}                                  agent="agent5b" source="neo4j" timestamp={Date.now()} />
                <LedgerRow field="skills"   value={(session.skills ?? []).join(', ') || '—'}      agent="agent1"  source="neo4j" timestamp={Date.now()} state="verified" />
                <LedgerRow field="projects" value={session.projects?.length ?? 0}                 agent="agent3"  source="neo4j" timestamp={Date.now()} />
                <LedgerRow field="auth·score" value={session.authenticityScore ?? '—'}            agent="agent1"  source="neo4j" timestamp={Date.now()} state="verified" />
              </div>
            </motion.div>
          )}

          {session && (
            <div className="card">
              <div className="card-header"><span className="card-title">Quick Questions</span></div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                {QUICK_Q.map((q, i) => (
                  <button key={i} className="btn" style={{ justifyContent: 'flex-start', textAlign: 'left' }}
                    onClick={() => { setInput(q); }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Right: chat ───────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', flexDirection: 'column', height: '600px', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: 'var(--sp-3) var(--sp-4)', borderBottom: '1px solid var(--rule)', display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', background: 'var(--paper-warm)' }}>
              <Bot size={15} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 600 }}>Digital Twin Session</span>
              {session && <SourceTag db="neo4j" agent="agent5b" ts={new Date().toISOString()} />}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {chat.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--neutral)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', marginTop: 'var(--sp-12)' }}>
                  Load a candidate profile to start the Digital Twin session.
                </div>
              )}
              {chat.map((m, i) => (
                <motion.div key={i} className={`chat-msg ${m.role}`}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <div>{m.text}</div>
                  {m.role === 'agent' && (
                    <div className="chat-msg-meta">
                      agent5b·twin · <SourceTag db="neo4j" ts={m.ts} />
                    </div>
                  )}
                </motion.div>
              ))}
              {loading && (
                <div className="chat-msg agent" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <Loader2 size={12} className="spinner" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>Querying Neo4j context…</span>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="chat-input-row">
              <input className="input input-mono" placeholder={session ? 'Ask about this candidate…' : 'Load a profile first'}
                value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                disabled={!session} style={{ flex: 1 }} />
              <button className="btn btn-primary btn-sm" onClick={send} disabled={!session || loading || !input.trim()}>
                <Send size={13} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
