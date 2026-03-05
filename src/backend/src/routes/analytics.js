import { Router } from 'express';
import db from '../db.js';
import { verifyToken, requireSubscription } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken, requireSubscription);

router.get('/', (req, res, next) => {
  try {
    const userId = req.user.id;

    const since = new Date();
    since.setDate(since.getDate() - 29);
    const sinceStr = since.toISOString().slice(0, 10);

    const dailyXp = db.prepare(`
      SELECT completed_date as date,
             SUM(xp_earned) as xp,
             COUNT(*) as completions
      FROM habit_logs
      WHERE user_id = ? AND completed_date >= ?
      GROUP BY completed_date
      ORDER BY completed_date ASC
    `).all(userId, sinceStr);

    const dayOfWeek = db.prepare(`
      SELECT CAST(strftime('%w', completed_date) AS INTEGER) as dow,
             COUNT(*) as count
      FROM habit_logs
      WHERE user_id = ?
      GROUP BY dow
      ORDER BY dow ASC
    `).all(userId);

    const today = new Date();
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const thisWeekStr = thisWeekStart.toISOString().slice(0, 10);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekStr = lastWeekStart.toISOString().slice(0, 10);

    const thisWeek = db.prepare(`
      SELECT COALESCE(SUM(xp_earned), 0) as xp, COUNT(*) as completions
      FROM habit_logs WHERE user_id = ? AND completed_date >= ?
    `).get(userId, thisWeekStr);

    const lastWeek = db.prepare(`
      SELECT COALESCE(SUM(xp_earned), 0) as xp, COUNT(*) as completions
      FROM habit_logs WHERE user_id = ? AND completed_date >= ? AND completed_date < ?
    `).get(userId, lastWeekStr, thisWeekStr);

    res.json({
      daily_xp: dailyXp.map(r => ({ ...r, xp: Number(r.xp), completions: Number(r.completions) })),
      day_of_week: dayOfWeek.map(r => ({ ...r, count: Number(r.count) })),
      this_week: { xp: Number(thisWeek.xp), completions: Number(thisWeek.completions) },
      last_week: { xp: Number(lastWeek.xp), completions: Number(lastWeek.completions) },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
