import { Router } from 'express';
import webpush from 'web-push';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@vivify.au'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// POST /api/push/subscribe
router.post('/subscribe', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }
    await query(`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (endpoint) DO UPDATE SET user_id = $1, p256dh = $3, auth = $4
    `, [userId, endpoint, keys.p256dh, keys.auth]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/push/unsubscribe
router.delete('/unsubscribe', async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
    await query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [endpoint, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/push/test
router.post('/test', async (req, res, next) => {
  try {
    if (!process.env.VAPID_PUBLIC_KEY) {
      return res.status(500).json({ error: 'VAPID keys not configured' });
    }
    const userId = req.user.id;
    const { rows: subs } = await query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );
    if (!subs.length) return res.status(404).json({ error: 'No subscriptions found' });
    const payload = JSON.stringify({
      title: '🔥 Vivify',
      body: 'Push notifications are working!',
      url: '/dashboard',
    });
    const results = await Promise.allSettled(subs.map(sub =>
      webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
    ));
    const sent = results.filter(r => r.status === 'fulfilled').length;
    res.json({ sent, total: subs.length });
  } catch (err) {
    next(err);
  }
});

export default router;
