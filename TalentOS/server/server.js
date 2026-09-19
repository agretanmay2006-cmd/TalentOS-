const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const { initSchema } = require('./db/neo4j');
const { initCollections } = require('./db/qdrant');
const { setupShadowSprintSocket } = require('./agents/agent4-shadowSprint');

const candidatesRouter = require('./routes/candidates');
const recruitersRouter = require('./routes/recruiters');
const shadowSprintRouter = require('./routes/shadowSprint');
const searchRouter = require('./routes/search');

const app = express();
const server = http.createServer(app);

// Realtime Socket.io initialization
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'TalentOS Backend Core',
    timestamp: new Date().toISOString(),
    architecture: 'Autonomous 6-Agent CJS'
  });
});

// Mount Routes
app.use('/api/candidates', candidatesRouter);
app.use('/api/recruiters', recruitersRouter);
app.use('/api/sprint', shadowSprintRouter);
app.use('/api/search', searchRouter);

// Initialize Socket.io ShadowSprint live workspace
setupShadowSprintSocket(io);

// Server bootstrap
const PORT = process.env.PORT || 5000;

async function startServer() {
  // Initialize Database Schemas and Collections (non-blocking for offline resilience)
  try {
    await initSchema();
    await initCollections();
    console.log('[TalentOS] Graph & Vector databases initialized.');
  } catch (err) {
    console.warn('[TalentOS] Running in offline fallback DB mode:', err.message);
  }

  server.listen(PORT, () => {
    console.log(`[TalentOS] Backend server listening on port ${PORT}`);
    console.log(`[TalentOS] Health check available at http://localhost:${PORT}/api/health`);
  });
}

startServer();

module.exports = { app, server };
