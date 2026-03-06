import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

const registerSchema = z.object({
  email:    z.string().email().max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(100, 'Password too long'),
  username: z.string().min(2, 'Username must be at least 2 characters').max(30, 'Username must be 30 characters or fewer'),
}).strict();

const loginSchema = z.object({
  email:    z.string().email().max(255),
  password: z.string().min(1).max(100),
}).strict();

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function getUserStats(userId) {
  const xpRow = db.prepare(
    `SELECT COALESCE(SUM(xp_earned), 0) as xp_total FROM habit_logs WHERE user_id = ?`
  ).get(userId);
  const xp_total = xpRow.xp_total;
  const level = Math.min(Math.floor(xp_total / 100), 100);
  const xp_to_next_level = 100 - (xp_total % 100);

  // Calculate current streak (consecutive days with ≥1 completion)
  const logs = db.prepare(
    `SELECT DISTINCT completed_date FROM habit_logs
     WHERE user_id = ? ORDER BY completed_date DESC`
  ).all(userId);

  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  let check = today;

  for (const log of logs) {
    if (log.completed_date === check) {
      streak++;
      const d = new Date(check);
      d.setDate(d.getDate() - 1);
      check = d.toISOString().slice(0, 10);
    } else {
      break;
    }
  }

  const sub = db.prepare(
    `SELECT status FROM subscriptions WHERE user_id = ? AND status = 'active' LIMIT 1`
  ).get(userId);

  return { xp_total, level, xp_to_next_level, current_streak: streak, subscription_status: sub ? 'active' : 'inactive' };
}

router.post('/register', (req, res, next) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = bcrypt.hashSync(data.password, 12);
    const result = db.prepare(
      'INSERT INTO users (email, password_hash, username) VALUES (?, ?, ?)'
    ).run(data.email, password_hash, data.username);

    const user = db.prepare('SELECT id, email, username, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    const stats = getUserStats(user.id);
    const token = signToken(user);

    res.status(201).json({ token, user: { ...user, ...stats } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

router.post('/login', (req, res, next) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email);
    if (!user || !bcrypt.compareSync(data.password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const stats = getUserStats(user.id);
    const token = signToken(user);
    const { password_hash: _, ...safeUser } = user;

    res.json({ token, user: { ...safeUser, ...stats } });
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

router.get('/me', verifyToken, (req, res, next) => {
  try {
    const user = db.prepare('SELECT id, email, username, created_at FROM users WHERE id = ?').get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const stats = getUserStats(user.id);
    res.json({ ...user, ...stats });
  } catch (err) {
    next(err);
  }
});

export default router;
