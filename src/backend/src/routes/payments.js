import { Router } from 'express';
import { createHmac } from 'crypto';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.get('/status', verifyToken, (req, res, next) => {
  try {
    const sub = db.prepare(
      'SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(req.user.id);
    res.json({ subscription: sub || null });
  } catch (err) {
    next(err);
  }
});

router.post('/webhook', (req, res) => {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  const signature = req.headers['x-signature'];

  if (!secret || !signature) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
  const digest = createHmac('sha256', secret).update(body).digest('hex');

  if (digest !== signature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(body.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  const eventName = payload.meta?.event_name;
  const attrs = payload.data?.attributes;
  const lsId = payload.data?.id;
  const userEmail = attrs?.user_email;

  if (!userEmail || !eventName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(userEmail);
  if (!user) {
    // User not found — acknowledge to avoid LS retries
    return res.status(200).json({ received: true });
  }

  const periodEnd = attrs?.ends_at || attrs?.renews_at || null;

  switch (eventName) {
    case 'subscription_created':
    case 'subscription_updated': {
      const status = attrs?.status === 'active' ? 'active' : attrs?.status || 'inactive';
      const existing = db.prepare('SELECT id FROM subscriptions WHERE user_id = ?').get(user.id);
      if (existing) {
        db.prepare(
          `UPDATE subscriptions SET lemon_squeezy_id = ?, status = ?, current_period_end = ? WHERE user_id = ?`
        ).run(lsId, status, periodEnd, user.id);
      } else {
        db.prepare(
          `INSERT INTO subscriptions (user_id, lemon_squeezy_id, status, current_period_end) VALUES (?, ?, ?, ?)`
        ).run(user.id, lsId, status, periodEnd);
      }
      break;
    }
    case 'subscription_cancelled':
      db.prepare(`UPDATE subscriptions SET status = 'cancelled' WHERE user_id = ?`).run(user.id);
      break;
    case 'subscription_expired':
      db.prepare(`UPDATE subscriptions SET status = 'expired' WHERE user_id = ?`).run(user.id);
      break;
    default:
      break;
  }

  res.status(200).json({ received: true });
});

export default router;
