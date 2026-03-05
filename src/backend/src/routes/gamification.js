import { Router } from 'express';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

router.get('/stats', (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const xpRow = db.prepare(
      `SELECT COALESCE(SUM(xp_earned), 0) as xp_total FROM habit_logs WHERE user_id = ?`
    ).get(userId);
    const xp_total = xpRow.xp_total;
    const level = Math.min(Math.floor(xp_total / 100), 100);
    const xp_to_next_level = 100 - (xp_total % 100);

    const totalRow = db.prepare(
      'SELECT COUNT(*) as total FROM habit_logs WHERE user_id = ?'
    ).get(userId);

    const todayRow = db.prepare(
      `SELECT COUNT(DISTINCT habit_id) as count FROM habit_logs WHERE user_id = ? AND completed_date = ?`
    ).get(userId, today);

    // Current streak
    const logs = db.prepare(
      `SELECT DISTINCT completed_date FROM habit_logs WHERE user_id = ? ORDER BY completed_date DESC`
    ).all(userId);

    let current_streak = 0;
    let longest_streak = 0;
    let tempStreak = 0;
    let check = today;

    for (const log of logs) {
      if (log.completed_date === check) {
        current_streak++;
        const d = new Date(check);
        d.setDate(d.getDate() - 1);
        check = d.toISOString().slice(0, 10);
      } else {
        break;
      }
    }

    // Longest streak calculation
    const allDates = logs.map(l => l.completed_date).reverse();
    let prev = null;
    for (const date of allDates) {
      if (prev) {
        const prevD = new Date(prev);
        prevD.setDate(prevD.getDate() + 1);
        if (prevD.toISOString().slice(0, 10) === date) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      } else {
        tempStreak = 1;
      }
      if (tempStreak > longest_streak) longest_streak = tempStreak;
      prev = date;
    }

    res.json({
      xp_total,
      level,
      xp_to_next_level,
      current_streak,
      longest_streak,
      habits_completed_today: todayRow.count,
      total_completions: totalRow.total,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
