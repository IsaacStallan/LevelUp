import { Router } from 'express';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

router.get('/', (req, res, next) => {
  try {
    const weekly = req.query.period === 'weekly';
    let rows;

    if (weekly) {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      const sinceStr = since.toISOString().slice(0, 10);
      rows = db.prepare(`
        SELECT u.id, u.username, u.equipped_title,
               COALESCE(SUM(hl.xp_earned), 0) as xp_total,
               COUNT(hl.id) as completions
        FROM users u
        LEFT JOIN habit_logs hl ON hl.user_id = u.id AND hl.completed_date >= ?
        GROUP BY u.id
        ORDER BY xp_total DESC, completions DESC
        LIMIT 50
      `).all(sinceStr);
    } else {
      rows = db.prepare(`
        SELECT u.id, u.username, u.equipped_title,
               COALESCE(SUM(hl.xp_earned), 0) as xp_total,
               COUNT(hl.id) as completions
        FROM users u
        LEFT JOIN habit_logs hl ON hl.user_id = u.id
        GROUP BY u.id
        ORDER BY xp_total DESC, completions DESC
        LIMIT 50
      `).all();
    }

    const data = rows.map((row, i) => ({
      rank: i + 1,
      id: row.id,
      username: row.username,
      equipped_title: row.equipped_title || '',
      xp_total: Number(row.xp_total),
      level: Math.min(Math.floor(Number(row.xp_total) / 100), 100),
      completions: Number(row.completions),
      isCurrentUser: row.id === req.user.id,
    }));

    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
