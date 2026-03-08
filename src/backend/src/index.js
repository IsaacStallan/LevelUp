import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initDb } from './db.js';

import authRoutes from './routes/auth.js';
import habitRoutes from './routes/habits.js';
import gamificationRoutes from './routes/gamification.js';
import paymentRoutes from './routes/payments.js';
import leaderboardRoutes from './routes/leaderboard.js';
import analyticsRoutes from './routes/analytics.js';
import streakRoutes from './routes/streaks.js';
import titleRoutes from './routes/titles.js';
import challengeRoutes from './routes/challenges.js';
import cronRoutes from './routes/cron.js';
import pushRoutes from './routes/push.js';

// ── Startup environment validation ────────────────────────────────────────────
// Warn only — server must bind before Railway considers the deploy healthy.
const jwtSecret = (process.env.JWT_SECRET || '').trim();
if (!jwtSecret) {
  console.error('WARNING: JWT_SECRET is not set — auth routes will return 500.');
} else if (jwtSecret.length < 32) {
  console.error('WARNING: JWT_SECRET must be at least 32 characters — auth routes will return 500.');
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('WARNING: ANTHROPIC_API_KEY is not set — AI insights endpoint will return 500.');
}

const app = express();
const PORT = process.env.PORT || 3001;

// ── Health check — registered FIRST, before all middleware ────────────────────
// Railway pings this to determine if the deployment is healthy.
// It must respond even if CORS, rate limiting, or DB is broken.
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now(), v: 'v9-eaddrinuse-fix' }));

// ── CORS — raw inline, second only to health check ────────────────────────────
const ALLOWED_ORIGINS = new Set(
  [
    'https://vivify.au',
    'https://www.vivify.au',
    'https://enchanting-pika-203705.netlify.app',
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean)
);

app.use((req, res, next) => {
  const origin  = req.headers.origin;
  const allowed = !origin || ALLOWED_ORIGINS.has(origin);

  if (allowed && origin) {
    res.setHeader('Access-Control-Allow-Origin',      origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary',                             'Origin');
  }

  if (req.method === 'OPTIONS') {
    if (allowed) {
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,PUT,PATCH,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Cron-Secret');
      res.setHeader('Access-Control-Max-Age',       '86400');
    }
    return res.sendStatus(204);
  }

  next();
});

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'"],
      styleSrc:    ["'self'", "'unsafe-inline'"],
      imgSrc:      ["'self'", 'data:'],
      connectSrc:  ["'self'"],
      fontSrc:     ["'self'"],
      objectSrc:   ["'none'"],
      frameSrc:    ["'none'"],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  noSniff: true,
}));

app.use((_req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiterDefaults = { standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests, slow down' } };
app.use(rateLimit({ ...limiterDefaults, windowMs: 15 * 60 * 1000, max: 100 }));
const authLimiter = rateLimit({ ...limiterDefaults, windowMs: 15 * 60 * 1000, max: 10 });
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/login',    authLimiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10kb' }));

// ── SQL injection pattern detection ──────────────────────────────────────────
const SQL_PATTERNS = /--|\/\*|\*\/|xp_/i;
function containsSqlInjection(value) {
  if (typeof value === 'string') return SQL_PATTERNS.test(value);
  if (typeof value === 'object' && value !== null) return Object.values(value).some(containsSqlInjection);
  return false;
}
app.use((req, res, next) => {
  if (req.body && containsSqlInjection(req.body)) return res.status(400).json({ error: 'Invalid characters in request' });
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/habits',        habitRoutes);
app.use('/api/gamification',  gamificationRoutes);
app.use('/api/payments',      paymentRoutes);
app.use('/api/leaderboard',   leaderboardRoutes);
app.use('/api/analytics',     analyticsRoutes);
app.use('/api/streaks',       streakRoutes);
app.use('/api/titles',        titleRoutes);
app.use('/api/challenges',    challengeRoutes);
app.use('/api/cron',          cronRoutes);
app.use('/api/push',          pushRoutes);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ── Global crash guards — keep server alive even on unexpected throws ──────────
// EADDRINUSE must exit: if port is already in use the server never binds and
// Railway sees a "successful" (non-crashing) process that never accepts traffic.
process.on('uncaughtException', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[crash-guard] Port ${PORT} already in use — exiting so Railway can restart.`);
    process.exit(1);
  }
  console.error('[crash-guard] Uncaught exception (server still running):', err);
});
process.on('unhandledRejection', err => console.error('[crash-guard] Unhandled rejection (server still running):', err));

// ── DB init with retry — runs in background after server binds ────────────────
async function initDbWithRetry(attempts = 3, delayMs = 5000) {
  for (let i = 1; i <= attempts; i++) {
    console.log(`[db] Init attempt ${i}/${attempts}...`);
    try {
      await initDb();
      console.log('[db] Database ready.');
      return;
    } catch (err) {
      console.error(`[db] Attempt ${i} failed:`, err.message);
      if (i < attempts) {
        console.log(`[db] Retrying in ${delayMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  console.error('[db] All init attempts failed. DB routes will return errors until next restart.');
}

// ── Start — bind port FIRST, then init DB in background ──────────────────────
console.log(`[startup] Starting LevelUp backend...`);
console.log(`[startup] PORT=${process.env.PORT || 3001}, NODE_ENV=${process.env.NODE_ENV || 'unset'}`);
console.log(`[startup] DATABASE_URL present: ${!!process.env.DATABASE_URL}`);
console.log(`[startup] JWT_SECRET present: ${!!process.env.JWT_SECRET}`);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[startup] Server bound to 0.0.0.0:${PORT} — accepting requests.`);
  initDbWithRetry().catch(err => console.error('[db] initDbWithRetry threw unexpectedly:', err));
});
