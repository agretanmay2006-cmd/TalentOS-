import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, RefreshCw, Loader2, CheckCircle, XCircle } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useTalentOS } from '../../context/TalentOSContext';
import { AgentBadge, DiffBlock, SourceTag, ScoreRing } from '../../components/shared/LedgerComponents';

const STARTER = `// Shadow Sprint — TalentOS Auto-Grader
// Write your solution below. You have 10 seconds.

function solution(nums) {
  // TODO: implement
}

module.exports = { solution };
`;

const CHALLENGE = {
  title: 'Two Sum',
  description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  constraints: ['2 ≤ nums.length ≤ 10⁴', '-10⁹ ≤ nums[i] ≤ 10⁹', 'Exactly one valid answer exists'],
  examples: [{ input: '[2,7,11,15], 9', output: '[0,1]' }, { input: '[3,2,4], 6', output: '[1,2]' }],
};

export default function SprintPage() {
  const { api } = useTalentOS();
  const [code,    setCode]    = useState(STARTER);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [alexMsg, setAlexMsg] = useState(null);
  const [chat,    setChat]    = useState([]);
  const [q,       setQ]       = useState('');

  const submit = async () => {
    setLoading(true); setResult(null); setAlexMsg(null);
    try {
      const data = await api('/api/sprint/submit', {
        method: 'POST',
        body: JSON.stringify({ code, challengeId: 'two-sum', candidateEmail: 'dev@talentos.io' }),
      });
      setResult(data);
      if (data.alexHint) setAlexMsg(data.alexHint);
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const askAlex = async () => {
    if (!q.trim()) return;
    const userMsg = { role: 'user', text: q };
    setChat(prev => [...prev, userMsg]);
    setQ('');
    try {
      const data = await api('/api/sprint/submit', {
        method: 'POST',
        body: JSON.stringify({ code, question: q, candidateEmail: 'dev@talentos.io' }),
      });
      setChat(prev => [...prev, { role: 'agent', text: data.alexHint ?? 'No hint available.' }]);
    } catch {
      setChat(prev => [...prev, { role: 'agent', text: 'Alex is unavailable right now.' }]);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Shadow Sprint Arena</h1>
        <p className="page-subtitle mono">agent4·grader + agent4·alex → sandboxed node.js · sigkill:10s</p>
      </div>

      <div className="grid-2" style={{ gap: 'var(--sp-6)' }}>
        {/* ── Left: challenge + editor ─────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div className="card">
            <div className="card-header">
              <span className="card-title">{CHALLENGE.title}</span>
              <AgentBadge agent="agent4" status="idle" />
            </div>
            <div className="card-body">
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral)', marginBottom: 'var(--sp-4)' }}>{CHALLENGE.description}</p>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--neutral)', marginBottom: 'var(--sp-3)' }}>
                <strong style={{ color: 'var(--ink)' }}>Constraints</strong>
                <ul style={{ paddingLeft: 'var(--sp-4)', marginTop: 'var(--sp-1)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {CHALLENGE.constraints.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                {CHALLENGE.examples.map((ex, i) => (
                  <div key={i} style={{ display: 'flex', gap: 'var(--sp-4)', padding: 'var(--sp-2) 0', borderTop: '1px solid var(--rule-light)' }}>
                    <span style={{ color: 'var(--neutral)' }}>input:</span>
                    <span style={{ color: 'var(--ink)' }}>{ex.input}</span>
                    <span style={{ color: 'var(--neutral)', marginLeft: 'auto' }}>→ {ex.output}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="code-editor-wrap">
            <div className="code-editor-header">
              <span>solution.js</span>
              <SourceTag db="sandbox" agent="agent4" />
            </div>
            <Editor
              height="320px"
              defaultLanguage="javascript"
              value={code}
              onChange={v => setCode(v ?? '')}
              theme="vs-dark"
              options={{ fontSize: 13, minimap: { enabled: false }, lineNumbers: 'on', wordWrap: 'on', fontFamily: "'IBM Plex Mono', monospace" }}
            />
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={submit} disabled={loading}>
              {loading ? <><Loader2 size={14} className="spinner" />Running…</> : <><Play size={14} />Submit to Grader</>}
            </button>
            <button className="btn" onClick={() => setCode(STARTER)}>
              <RefreshCw size={14} /> Reset
            </button>
          </div>
        </div>

        {/* ── Right: results + Alex ─────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {result && (
            <motion.div className="card animate-in" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <div className="card-header">
                <span className="card-title">Grader Output</span>
                <AgentBadge agent="agent4" status={result.error ? 'error' : 'live'} />
              </div>
              <div className="card-body">
                {result.error ? (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--flagged)' }}>{result.error}</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', gap: 'var(--sp-6)', justifyContent: 'center', marginBottom: 'var(--sp-6)' }}>
                      <ScoreRing score={result.score ?? 90}    label="Score"    agent="agent4" state="verified" />
                      <ScoreRing score={result.timePct ?? 85}  label="Speed"    agent="agent4" state="pending"  />
                      <ScoreRing score={result.testsPct ?? 100} label="Tests"   agent="agent4" state={result.testsPct === 100 ? 'verified' : 'flagged'} />
                    </div>
                    {result.testResults && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
                        {result.testResults.map((t, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)' }}>
                            {t.passed ? <CheckCircle size={12} color="var(--verified)" /> : <XCircle size={12} color="var(--flagged)" />}
                            <span style={{ color: t.passed ? 'var(--verified)' : 'var(--flagged)' }}>{t.name}</span>
                            <span style={{ color: 'var(--neutral)', marginLeft: 'auto' }}>{t.duration}ms</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <DiffBlock filename="output.js" lines={result.diffLines ?? [
                      '@@ solution output @@',
                      '+ [0, 1]  // correct',
                      '+ execution: 0.4ms',
                      '+ memory: 42.1 KB',
                    ]} />
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* Alex AI Mentor */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Alex — AI Mentor</span>
              <AgentBadge agent="agent4" status="live" />
            </div>
            <div className="chat-window">
              <div className="chat-messages">
                <div className="chat-msg agent">
                  <div>Hey, I'm Alex. I'll give you architectural hints — I won't write the solution for you. Ask me anything about the approach.</div>
                  <div className="chat-msg-meta">agent4·alex · gemini-3.6-flash</div>
                </div>
                {alexMsg && (
                  <div className="chat-msg agent">
                    <div>{alexMsg}</div>
                    <div className="chat-msg-meta">agent4·alex · <SourceTag db="gemini" agent="agent4" ts={new Date().toISOString()} /></div>
                  </div>
                )}
                {chat.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.role}`}>
                    <div>{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="chat-input-row">
                <input className="input input-mono" placeholder="Ask Alex for a hint…" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && askAlex()} style={{ flex: 1 }} />
                <button className="btn btn-primary btn-sm" onClick={askAlex}>Ask</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
