import { Router } from 'express';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

router.get('/tokens', (req, res, next) => {
  try {
    const user = db.prepare('SELECT freeze_tokens FROM users WHERE id = ?').get(req.user.id);
    res.json({ freeze_tokens: user?.freeze_tokens ?? 0 });
  } catch (err) {
    next(err);
  }
});

router.post('/freeze', (req, res, next) => {
  try {
    const user = db.prepare('SELECT freeze_tokens FROM users WHERE id = ?').get(req.user.id);
    if (!user || user.freeze_tokens < 1) {
      return res.status(400).json({ error: 'No freeze tokens remaining' });
    }

    const today = new Date().toISOString().slice(0, 10);
    const existing = db.prepare(
      'SELECT id FROM streak_freezes WHERE user_id = ? AND freeze_date = ?'
    ).get(req.user.id, today);

    if (existing) {
      return res.status(409).json({ error: 'Streak already protected today' });
    }

    db.prepare('INSERT INTO streak_freezes (user_id, freeze_date) VALUES (?, ?)').run(req.user.id, today);
    db.prepare('UPDATE users SET freeze_tokens = freeze_tokens - 1 WHERE id = ?').run(req.user.id);

    const updated = db.prepare('SELECT freeze_tokens FROM users WHERE id = ?').get(req.user.id);
    res.json({ success: true, freeze_tokens: updated.freeze_tokens });
  } catch (err) {
    next(err);
  }
});

export default router;
