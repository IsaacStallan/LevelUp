import { Router } from 'express';
import { createHmac } from 'crypto';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.get('/status', verifyToken, async (req, res, next) => {
  try {
    const { rows: [sub] } = await query(
      'SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.user.id]
    );
    res.json({ subscription: sub || null });
  } catch (err) {
    next(err);
  }
});

router.post('/webhook', async (req, res) => {
  const secret    = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  const signature = req.headers['x-signature'];

  if (!secret || !signature) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  const body   = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
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

  const eventName  = payload.meta?.event_name;
  const attrs      = payload.data?.attributes;
  const lsId       = payload.data?.id;
  const userEmail  = attrs?.user_email;

  if (!userEmail || !eventName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { rows: [user] } = await query(
      'SELECT id FROM users WHERE email = $1',
      [userEmail]
    );
    if (!user) return res.status(200).json({ received: true });

    const periodEnd = attrs?.ends_at || attrs?.renews_at || null;

    switch (eventName) {
      case 'order_created': {
        const { rows: [existing] } = await query(
          'SELECT id FROM subscriptions WHERE user_id = $1',
          [user.id]
        );
        if (existing) {
          await query(
            `UPDATE subscriptions SET lemon_squeezy_id = $1, status = 'active', current_period_end = $2 WHERE user_id = $3`,
            [lsId, periodEnd, user.id]
          );
        } else {
          await query(
            `INSERT INTO subscriptions (user_id, lemon_squeezy_id, status, current_period_end) VALUES ($1, $2, 'active', $3)`,
            [user.id, lsId, periodEnd]
          );
        }
        break;
      }
      case 'subscription_created':
      case 'subscription_updated': {
        const status = attrs?.status === 'active' ? 'active' : attrs?.status || 'inactive';
        const { rows: [existing] } = await query(
          'SELECT id FROM subscriptions WHERE user_id = $1',
          [user.id]
        );
        if (existing) {
          await query(
            `UPDATE subscriptions SET lemon_squeezy_id = $1, status = $2, current_period_end = $3 WHERE user_id = $4`,
            [lsId, status, periodEnd, user.id]
          );
        } else {
          await query(
            `INSERT INTO subscriptions (user_id, lemon_squeezy_id, status, current_period_end) VALUES ($1, $2, $3, $4)`,
            [user.id, lsId, status, periodEnd]
          );
        }
        break;
      }
      case 'subscription_cancelled':
        await query(`UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1`, [user.id]);
        break;
      case 'subscription_expired':
        await query(`UPDATE subscriptions SET status = 'expired' WHERE user_id = $1`, [user.id]);
        break;
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
