import dotenv from 'dotenv';
dotenv.config({ path: "./.env" })
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import rateLimit from 'express-rate-limit';

import { runMigrations } from './utils/migrationRunner.js';
import authRoutes from './routes/authRoutes.js';
import postRoutes from './routes/postRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import imageCategoryRoutes from './routes/imageCategoryRoutes.js';
import mediaRoutes from './routes/mediaRoutes.js';
import userRoutes from './routes/userRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import debatesRoutes from './routes/debates.js';
import issueRoutes from './routes/issueRoutes.js';


import path from "path";


// dotenv.config();


const app = express();
const PORT = process.env.PORT || 5000;



const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 1000,  // Increased from 100 to 1000 to avoid blocking legitimate requests
  message: 'Too many requests from this IP, please try again later',
  skip: (req) => {
    // Skip rate limiting for proxy endpoint (PDFs and other files)
    return req.path.includes('/api/debates/proxy') || req.path.includes('/api/media');
  }
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      frameSrc: ["'self'", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
      frameAncestors: ["'self'", "http://localhost:5173", "http://localhost:5174", "http://localhost:5175"]
    }
  }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Research Platform API is running',
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api', categoryRoutes);
app.use('/api', imageCategoryRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api', debatesRoutes);
app.use('/api/issues', issueRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, async () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   Research Platform API Server                        ║
║   Server running on: http://localhost:${PORT}           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                          ║
║   Health check: http://localhost:${PORT}/api/health    ║
╚═══════════════════════════════════════════════════════╝
  `);

  try {
    await runMigrations();
    console.log('✓ Server is ready to handle requests\n');
  } catch (error) {
    console.error('✗ Failed to run migrations. Server may not work correctly.');
    console.error('Error:', error.message);
  }
});

export default app;
