/**
 * App-level configuration derived from environment variables.
 * Centralizes all env reads so components import from here
 * instead of accessing import.meta.env directly.
 */

const config = {
  app: {
    name: import.meta.env.VITE_APP_NAME || 'ONCLICK Emergency System',
    version: import.meta.env.VITE_APP_VERSION || '2.0.0',
    env: import.meta.env.VITE_APP_ENV || 'development',
    isDev: import.meta.env.DEV,
    isProd: import.meta.env.PROD,
  },
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  },
  map: {
    tileUrl: import.meta.env.VITE_MAP_TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    defaultCenter: [18.5204, 73.8567],
    defaultZoom: 13,
  },
  socket: {
    url: import.meta.env.VITE_SOCKET_URL || '',
  },
};

export default config;
