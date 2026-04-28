/**
 * ONCLICK Emergency System — API Service Layer
 * 
 * Centralizes all API calls. In development, falls back to mock data.
 * In production, connects to the real backend via VITE_API_BASE_URL.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Generic fetch wrapper with error handling.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add auth token if it exists
  const token = localStorage.getItem('onclick_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `API error: ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(`[API] ${endpoint}:`, error.message);
    throw error;
  }
}

// ── SOS Alerts ──────────────────────────────────────────────
export const sosAPI = {
  /** Fetch all SOS alerts */
  getAll: () => request('/sos'),

  /** Fetch a single SOS alert by ID */
  getById: (id) => request(`/sos/${id}`),

  /** Create a new SOS alert */
  create: (data) => request('/sos', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  /** Update status of an SOS alert */
  updateStatus: (id, status) => request(`/sos/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
};

// ── Auth ────────────────────────────────────────────────────
export const authAPI = {
  /** Login with credentials */
  login: (credentials) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  }),

  /** Verify current session token */
  verify: () => request('/auth/verify'),
};

// ── Hospital / Dashboard ────────────────────────────────────
export const hospitalAPI = {
  /** Get dashboard stats */
  getStats: () => request('/hospital/stats'),

  /** Get doctor list */
  getDoctors: () => request('/hospital/doctors'),

  /** Add a new doctor */
  addDoctor: (data) => request('/hospital/doctors', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  /** Get resource telemetry */
  getResources: () => request('/hospital/resources'),

  /** Get ambulance list */
  getAmbulances: () => request('/hospital/ambulances'),
};

// ── Analytics ───────────────────────────────────────────────
export const analyticsAPI = {
  /** Get monthly report */
  getMonthlyReport: () => request('/reports/monthly'),

  /** Get incident heatmap data */
  getHeatmap: () => request('/analytics/heatmap'),

  /** Get geo-performance zones */
  getGeoZones: () => request('/analytics/geo-zones'),

  /** Request AI analysis */
  getAIAnalysis: (stats) => request('/reports/ai-analysis', {
    method: 'POST',
    body: JSON.stringify({ stats }),
  }),
};
