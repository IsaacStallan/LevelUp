import jwt from 'jsonwebtoken';
import { query } from '../db.js';

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

export async function requireSubscription(req, res, next) {
  try {
    const { rows: [sub] } = await query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       AND (current_period_end IS NULL OR current_period_end > NOW())
       LIMIT 1`,
      [req.user.id]
    );
    if (!sub) {
      return res.status(403).json({ error: 'Active subscription required', code: 'SUBSCRIPTION_REQUIRED' });
    }
    next();
  } catch (err) {
    next(err);
  }
}
