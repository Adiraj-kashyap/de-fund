import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import projectRoutes from './routes/projects.js';
import userRoutes from './routes/users.js';
import proposalRoutes from './routes/proposals.js';
import ipfsRoutes from './routes/ipfs.js';
import statsRoutes from './routes/stats.js';
import deployRoutes from './routes/deploy.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('dev'));
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/users', userRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/ipfs', ipfsRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/deploy', deployRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`?? Backend API server running on port ${PORT}`);
  console.log(`?? API endpoint: http://localhost:${PORT}`);
  console.log(`?? Health check: http://localhost:${PORT}/health`);
});

export default app;
