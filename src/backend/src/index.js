import express from 'express';
import cors from 'cors';
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
import battlesRoutes from './routes/battles.js';

const PORT = process.env.PORT || 3001;

// Global crash guards — keep process alive for non-fatal errors
process.on('uncaughtException', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[crash-guard] Port ${PORT} already in use — exiting.`);
    process.exit(1);
  }
  console.error('[crash-guard] Uncaught exception (server still running):', err);
});
process.on('unhandledRejection', err =>
  console.error('[crash-guard] Unhandled rejection (server still running):', err)
);

const app = express();

app.use(cors({
  origin: [
    'https://vivify.au',
    'https://www.vivify.au',
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  credentials: true,
}));
app.use(express.json());

// Health check registered FIRST — always responds even if DB is not ready
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now(), v: 'v11', port: PORT, pid: process.pid });
});

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
app.use('/api/battles', battlesRoutes);

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
  console.error('[db] All init attempts failed. DB routes will error until next restart.');
}

console.log(`[startup] PORT=${PORT} NODE_ENV=${process.env.NODE_ENV || 'unset'}`);
console.log(`[startup] DATABASE_URL present: ${!!process.env.DATABASE_URL}`);
console.log(`[startup] JWT_SECRET present: ${!!process.env.JWT_SECRET}`);

// Bind port FIRST, then init DB in background
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[startup] Server bound to 0.0.0.0:${PORT} — accepting requests.`);
  initDbWithRetry().catch(err =>
    console.error('[db] initDbWithRetry threw unexpectedly:', err)
  );
});
