import express, { Application, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getDb } from './config/firebase.js';
import authRoutes from './routes/auth.routes.js';
import adminRoutes from './routes/admin.routes.js';

const app: Application = express();

// Security headers (allowing data: URIs for 2FA QR code rendering)
const helmetMiddleware = (typeof helmet === 'function' ? helmet : (helmet as any).default) as any;
app.use(
  helmetMiddleware({
    contentSecurityPolicy: {
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", "'unsafe-inline'"],
        'style-src': ["'self'", "'unsafe-inline'", 'https:'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'", 'https:', 'http:'],
      },
    },
  })
);

// CORS configuration supporting local dev and Vercel deployments
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.endsWith('.vercel.app')
      ) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

// Body and cookie parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check routes
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    message: 'Secure Auth API is operational',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/health/db', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const testDocRef = db.collection('_health_check').doc('connectivity');
    await testDocRef.set({
      lastChecked: new Date().toISOString(),
      status: 'healthy',
    });

    const docSnapshot = await testDocRef.get();

    res.status(200).json({
      status: 'ok',
      database: 'Firestore connected successfully',
      data: docSnapshot.data(),
    });
  } catch (error: any) {
    console.error('[DB HEALTH CHECK ERROR]', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to Cloud Firestore',
      details: error.message,
    });
  }
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Admin routes (RBAC protected)
app.use('/api/admin', adminRoutes);

// Serve built React frontend if available (enables unified single-URL hosting on Vercel & Render)
const localPublic = path.resolve(process.cwd(), 'public');
const parentDist = path.resolve(process.cwd(), '../frontend/dist');
const frontendDist = fs.existsSync(path.join(localPublic, 'index.html')) ? localPublic : parentDist;

if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get(/^(?!\/api).*/, (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

export default app; 