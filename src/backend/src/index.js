import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET is not set. Add it to .env and restart.');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 characters. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('WARNING: ANTHROPIC_API_KEY is not set — AI insights endpoint will return 500.');
}

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS — must be first so preflight OPTIONS never hits rate limiting or helmet ──
const allowedOrigins = [
  'https://vivify.au',
  'https://www.vivify.au',
  'https://enchanting-pika-203705.netlify.app',
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
};

// Handle preflight OPTIONS for every route before any other middleware
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));

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
  // Must be cross-origin or false — same-origin (helmet default) blocks API responses
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  noSniff: true,
}));

// X-XSS-Protection (not included in modern Helmet, add manually)
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
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).some(containsSqlInjection);
  }
  return false;
}

app.use((req, res, next) => {
  if (req.body && containsSqlInjection(req.body)) {
    return res.status(400).json({ error: 'Invalid characters in request' });
  }
  next();
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/streaks', streakRoutes);
app.use('/api/titles', titleRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/cron', cronRoutes);
app.use('/api/push', pushRoutes);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`LevelUp backend running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('FATAL: Failed to initialise database:', err);
    process.exit(1);
  });
