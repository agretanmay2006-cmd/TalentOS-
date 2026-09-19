import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

/* ─────────────────────────────────────────────────────────────────────────────
   Context
───────────────────────────────────────────────────────────────────────────── */
const TalentOSContext = createContext(null);

export function TalentOSProvider({ children }) {
  const [dbStatus, setDbStatus] = useState({ neo4j: 'pending', qdrant: 'pending', prisma: 'pending' });
  const [graphSummary, setGraphSummary] = useState(null);
  const socketRef = useRef(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // ─── Health check ──────────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/status`);
      const data = await res.json();
      setDbStatus({
        neo4j:  data.neo4j  === 'connected' ? 'live' : 'error',
        qdrant: data.qdrant === 'connected' ? 'live' : 'error',
        prisma: data.prisma === 'connected' ? 'live' : 'error',
      });
    } catch {
      setDbStatus({ neo4j: 'error', qdrant: 'error', prisma: 'error' });
    }
  }, []);

  const fetchGraphSummary = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/graph/summary`);
      const data = await res.json();
      setGraphSummary(data);
    } catch { /* non-fatal */ }
  }, []);

  // ─── Socket.io ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchStatus();
    fetchGraphSummary();
    const poll = setInterval(fetchStatus, 30_000);

    socketRef.current = io(BACKEND_URL, { transports: ['websocket', 'polling'] });
    socketRef.current.on('connect',    () => setSocketConnected(true));
    socketRef.current.on('disconnect', () => setSocketConnected(false));

    return () => {
      clearInterval(poll);
      socketRef.current?.disconnect();
    };
  }, [fetchStatus, fetchGraphSummary]);

  // ─── API helper ───────────────────────────────────────────────────────────
  const api = useCallback(async (path, opts = {}) => {
    const res = await fetch(`${BACKEND_URL}${path}`, {
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      ...opts,
    });
    if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
    return res.json();
  }, []);

  const onSocket = useCallback((event, handler) => {
    socketRef.current?.on(event, handler);
    return () => socketRef.current?.off(event, handler);
  }, []);

  return (
    <TalentOSContext.Provider value={{ dbStatus, graphSummary, socketConnected, api, onSocket, backendUrl: BACKEND_URL }}>
      {children}
    </TalentOSContext.Provider>
  );
}

export const useTalentOS = () => {
  const ctx = useContext(TalentOSContext);
  if (!ctx) throw new Error('useTalentOS must be inside TalentOSProvider');
  return ctx;
};

/* ─────────────────────────────────────────────────────────────────────────────
   useApi hook
───────────────────────────────────────────────────────────────────────────── */
export function useApi(path, opts = {}) {
  const { api } = useTalentOS();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const execute = useCallback(async (body) => {
    setLoading(true); setError(null);
    try {
      const result = await api(path, {
        method: opts.method || 'GET',
        body: body ? JSON.stringify(body) : undefined,
        ...opts,
      });
      setData(result);
      return result;
    } catch (e) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [api, path, opts]);

  // auto-fetch on GET
  useEffect(() => {
    if (!opts.method || opts.method === 'GET') execute();
  }, [path]); // eslint-disable-line

  return { data, loading, error, execute };
}
