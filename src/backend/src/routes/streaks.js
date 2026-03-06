import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

router.get('/tokens', async (req, res, next) => {
  try {
    const { rows: [user] } = await query(
      'SELECT freeze_tokens FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ freeze_tokens: user?.freeze_tokens ?? 0 });
  } catch (err) {
    next(err);
  }
});

router.post('/freeze', async (req, res, next) => {
  try {
    const { rows: [user] } = await query(
      'SELECT freeze_tokens FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!user || user.freeze_tokens < 1) {
      return res.status(400).json({ error: 'No freeze tokens remaining' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const { rows: [existing] } = await query(
      'SELECT id FROM streak_freezes WHERE user_id = $1 AND freeze_date = $2',
      [req.user.id, today]
    );
    if (existing) return res.status(409).json({ error: 'Streak already protected today' });

    await query(
      'INSERT INTO streak_freezes (user_id, freeze_date) VALUES ($1, $2)',
      [req.user.id, today]
    );
    await query(
      'UPDATE users SET freeze_tokens = freeze_tokens - 1 WHERE id = $1',
      [req.user.id]
    );

    const { rows: [updated] } = await query(
      'SELECT freeze_tokens FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json({ success: true, freeze_tokens: updated.freeze_tokens });
  } catch (err) {
    next(err);
  }
});

export default router;
