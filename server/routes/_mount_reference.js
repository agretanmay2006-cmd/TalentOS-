// Mount new auth + ATS routes in server.js
// This snippet shows the two lines to add. Insert after existing route mounts.
import authRoutes from './routes/authRoutes.js';
import atsRoutes from './routes/atsRoutes.js';

// Mount
app.use('/api/auth', authRoutes);
app.use('/api/ats', atsRoutes);
