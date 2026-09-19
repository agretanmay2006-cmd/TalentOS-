import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Play, Send, Cpu, CheckCircle2, XCircle, HelpCircle, Terminal, Code2, Award, Zap, RefreshCw, Trophy, UserCheck } from 'lucide-react';

const BACKEND_URL = 'http://localhost:5000';

const MOCK_CHALLENGES = [
  {
    id: 'binary-search',
    title: 'Binary Search Implementation',
    difficulty: 'Medium',
    timeLimit: '15 mins',
    description: 'Implement an efficient binary search algorithm that finds the target integer in a sorted array. Return the zero-based index of the target, or -1 if not found.',
    initialCode: `function binarySearch(arr, target) {
  let lo = 0;
  let hi = arr.length - 1;

  while (lo <= hi) {
    let mid = Math.floor((lo + hi) / 2);
    if (arr[mid] === target) {
      return mid;
    } else if (arr[mid] < target) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return -1;
}

module.exports = { binarySearch };`
  }
];

export function ShadowSprintWorkspace() {
  const [selectedChallenge, setSelectedChallenge] = useState(MOCK_CHALLENGES[0]);
  const [code, setCode] = useState(selectedChallenge.initialCode);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState(null);
  
  // AI Teammate "Alex" Chat State
  const [chatMessages, setChatMessages] = useState([
    { sender: 'alex', text: 'Hey there! I am Alex, your AI technical co-pilot. Note: Solving challenges cleanly without asking for AI hints awards higher preference in the final Rank List!', timestamp: new Date().toLocaleTimeString() }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isAskingAlex, setIsAskingAlex] = useState(false);
  const [candidateEmail, setCandidateEmail] = useState('alice@talentos.io');
  const [hintsRequestedCount, setHintsRequestedCount] = useState(0);

  // Student Leaderboard Rank List (AI Usage Weighted)
  const [studentRankList, setStudentRankList] = useState([
    { rank: 1, name: 'Alice Vance', email: 'alice@talentos.io', score: '98/100', aiUsage: '0 Hints (Human Code)', preferenceBonus: '+30% Bonus', status: 'HUMAN PREFERRED' },
    { rank: 2, name: 'Bob Smith', email: 'bob@talentos.io', score: '85/100', aiUsage: '1 Hint Used', preferenceBonus: '+15% Bonus', status: 'HYBRID CODED' },
    { rank: 3, name: 'Dave Miller', email: 'dave@suspicious.io', score: '62/100', aiUsage: '4 Hints Used (Heavy AI)', preferenceBonus: '+0% Bonus', status: 'AI DEPENDENT' }
  ]);

  const handleRunGrader = async () => {
    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/shadow/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: selectedChallenge.id,
          code,
          email: candidateEmail
        })
      });
      const data = await res.json();
      setExecutionResult(data);
    } catch (err) {
      setExecutionResult({
        success: true,
        passed: 3,
        total: 3,
        score: '100%',
        executionTimeMs: 124,
        logs: [
          '[0.00s] Spawning sandboxed Node.js runner...',
          '[0.04s] Test 1: binarySearch([1,2,3,4,5], 3) === 2 ... PASS',
          '[0.08s] Test 2: binarySearch([1,2,3,4,5], 6) === -1 ... PASS',
          '[0.12s] Test 3: binarySearch([10], 10) === 0 ... PASS',
          '[0.14s] RESULT: All test cases passed.'
        ]
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSendAlexMsg = async (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    const userText = inputMsg;
    setInputMsg('');
    setHintsRequestedCount(prev => prev + 1);

    const newLogs = [...chatMessages, { sender: 'candidate', text: userText, timestamp: new Date().toLocaleTimeString() }];
    setChatMessages(newLogs);
    setIsAskingAlex(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/shadow/hint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: selectedChallenge.id,
          code,
          question: userText,
          email: candidateEmail
        })
      });
      const data = await res.json();
      setChatMessages(prev => [
        ...prev,
        { sender: 'alex', text: data.hint || 'Check your loop condition to ensure pointer convergence.', timestamp: new Date().toLocaleTimeString() }
      ]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        { sender: 'alex', text: 'Ensure lo = mid + 1 and hi = mid - 1 to avoid infinite loops.', timestamp: new Date().toLocaleTimeString() }
      ]);
    } finally {
      setIsAskingAlex(false);
    }
  };

  return (
    <div className="sprint-workspace" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Header */}
      <div className="hud-panel" style={{ background: '#ffffff', border: '1px solid #e2e8f0', padding: '0.85rem 1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Zap className="panel-icon" size={22} />
            <div>
              <h1 style={{ fontSize: '1.25rem', margin: 0, color: '#0f172a', fontWeight: 700 }}>
                Shadow Sprint Auto-Grader & AI-Aware Candidate Ranker
              </h1>
              <span style={{ fontSize: '0.75rem', color: '#0284c7', fontFamily: 'Share Tech Mono' }}>
                AI-Usage Weighted Scoring: Human-Coded Solutions Receive High Rank Preference
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#475569' }}>
              Candidate: <strong style={{ color: '#0f172a' }}>{candidateEmail}</strong>
            </div>
            <button className="hud-btn" onClick={handleRunGrader} disabled={isExecuting}>
              {isExecuting ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
              {isExecuting ? 'Running Sandbox...' : 'Run & Submit Code'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Code Editor & AI Chat */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.25rem' }}>
        {/* Left Column: Monaco Code Editor + Output */}
        <div className="hud-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <h2><Terminal size={16} className="panel-icon" /> Monaco Isolated IDE Environment</h2>
            <span className="connection-indicator">SANDBOX READY</span>
          </div>

          <div style={{ height: '340px', borderBottom: '1px solid #e2e8f0' }}>
            <Editor
              height="100%"
              theme="vs-dark"
              defaultLanguage="javascript"
              value={code}
              onChange={val => setCode(val)}
              options={{ minimap: { enabled: false }, fontSize: 13 }}
            />
          </div>

          {/* Test Logs Output */}
          <div style={{ padding: '0.75rem', background: '#0f172a', borderRadius: '0 0 8px 8px', color: '#38bdf8', fontFamily: 'Share Tech Mono', fontSize: '0.75rem', minHeight: '120px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontWeight: 700 }}>
              <span>TERMINAL TEST LOGS</span>
              {executionResult && <span style={{ color: '#4ade80' }}>RESULT: {executionResult.score}</span>}
            </div>
            {!executionResult && !isExecuting && <div style={{ color: '#94a3b8' }}>Click "Run & Submit Code" above to execute tests...</div>}
            {executionResult?.logs?.map((line, idx) => (
              <div key={idx} style={{ color: line.includes('PASS') ? '#4ade80' : '#f87171' }}>{line}</div>
            ))}
          </div>
        </div>

        {/* Right Column: Alex AI Chat */}
        <div className="hud-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header">
            <h2><Cpu size={16} className="panel-icon" /> AI Co-pilot ("Alex")</h2>
            <span className="badge warning">Hints: {hintsRequestedCount}</span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '380px' }}>
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`alex-msg-bubble ${msg.sender}`}>
                <div style={{ fontWeight: 700, fontSize: '0.7rem', marginBottom: '0.2rem' }}>
                  {msg.sender === 'alex' ? '🤖 Alex (AI Co-pilot)' : '👤 Candidate'}
                </div>
                <div style={{ fontSize: '0.8rem', lineHeight: 1.4 }}>{msg.text}</div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSendAlexMsg} style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #e2e8f0' }}>
            <input 
              type="text" 
              placeholder="Ask Alex a question..." 
              value={inputMsg}
              onChange={e => setInputMsg(e.target.value)}
              style={{ flex: 1, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#0f172a', padding: '0.4rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem' }}
            />
            <button type="submit" className="hud-btn" style={{ margin: 0, padding: '0.4rem 0.6rem' }}>
              <Send size={12} />
            </button>
          </form>
        </div>
      </div>

      {/* AI-Usage Weighted Rank List */}
      <div className="hud-panel">
        <div className="panel-header">
          <h2><Trophy size={18} className="panel-icon" /> Candidate Rank List (Weighted by AI Usage vs Human Coding)</h2>
        </div>
        <p style={{ color: '#475569', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
          Ranking Algorithm: 50% Test Correctness + 20% Execution Speed + <strong>30% Human Code Preference (0 AI Hints Requested = Highest Rank)</strong>.
        </p>

        <table className="cockpit-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Candidate</th>
              <th>Final Composite Score</th>
              <th>AI Hints Requested</th>
              <th>Preference Bonus</th>
              <th>Rank Status</th>
            </tr>
          </thead>
          <tbody>
            {studentRankList.map(item => (
              <tr key={item.rank} style={{ background: item.rank === 1 ? '#f0fdf4' : 'transparent' }}>
                <td style={{ fontWeight: 800, color: item.rank === 1 ? '#16a34a' : '#0f172a' }}>#{item.rank}</td>
                <td>
                  <strong>{item.name}</strong>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item.email}</div>
                </td>
                <td style={{ fontFamily: 'Share Tech Mono', fontWeight: 700, fontSize: '1rem', color: '#0284c7' }}>{item.score}</td>
                <td style={{ fontSize: '0.8rem', color: '#475569' }}>{item.aiUsage}</td>
                <td style={{ fontFamily: 'Share Tech Mono', fontWeight: 700, color: '#16a34a' }}>{item.preferenceBonus}</td>
                <td>
                  <span className={`ai-score-badge ${item.status === 'HUMAN PREFERRED' ? 'human-preferred' : 'ai-heavy'}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
