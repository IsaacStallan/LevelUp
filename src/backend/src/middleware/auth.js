import jwt from 'jsonwebtoken';
import db from '../db.js';

export function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

export function requireSubscription(req, res, next) {
  const sub = db.prepare(
    `SELECT id FROM subscriptions
     WHERE user_id = ? AND status = 'active'
     AND (current_period_end IS NULL OR current_period_end > datetime('now'))
     LIMIT 1`
  ).get(req.user.id);

  if (!sub) {
    return res.status(403).json({ error: 'Active subscription required', code: 'SUBSCRIPTION_REQUIRED' });
  }
  next();
}
