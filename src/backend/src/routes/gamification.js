import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().slice(0, 10);

    const { rows: [xpRow] } = await query(
      `SELECT COALESCE(SUM(xp_earned), 0)::int as xp_total FROM habit_logs WHERE user_id = $1`,
      [userId]
    );
    const xp_total = Number(xpRow.xp_total);
    const level = Math.min(Math.floor(xp_total / 100), 100);
    const xp_to_next_level = 100 - (xp_total % 100);

    const { rows: [totalRow] } = await query(
      'SELECT COUNT(*)::int as total FROM habit_logs WHERE user_id = $1',
      [userId]
    );

    const { rows: [todayRow] } = await query(
      `SELECT COUNT(DISTINCT habit_id)::int as count FROM habit_logs WHERE user_id = $1 AND completed_date = $2`,
      [userId, today]
    );

    const { rows: logs } = await query(
      `SELECT DISTINCT completed_date FROM habit_logs WHERE user_id = $1 ORDER BY completed_date DESC`,
      [userId]
    );

    let current_streak = 0;
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

    let longest_streak = 0;
    let tempStreak = 0;
    let prev = null;
    const allDates = logs.map(l => l.completed_date).reverse();
    for (const date of allDates) {
      if (prev) {
        const prevD = new Date(prev);
        prevD.setDate(prevD.getDate() + 1);
        tempStreak = prevD.toISOString().slice(0, 10) === date ? tempStreak + 1 : 1;
      } else {
        tempStreak = 1;
      }
      if (tempStreak > longest_streak) longest_streak = tempStreak;
      prev = date;
    }

    const { rows: [userRow] } = await query(
      'SELECT equipped_title, freeze_tokens, challenge_xp FROM users WHERE id = $1',
      [userId]
    );

    const challengeXp  = Number(userRow?.challenge_xp ?? 0);
    const xp_combined  = xp_total + challengeXp;
    const levelFinal   = Math.min(Math.floor(xp_combined / 100), 100);
    const xpToNext     = 100 - (xp_combined % 100);

    res.json({
      xp_total: xp_combined,
      level: levelFinal,
      xp_to_next_level: xpToNext,
      current_streak,
      longest_streak,
      habits_completed_today: Number(todayRow.count),
      total_completions: Number(totalRow.total),
      equipped_title: userRow?.equipped_title || '',
      freeze_tokens: userRow?.freeze_tokens ?? 0,
    });
    return;
  } catch (err) {
    next(err);
  }
});

export default router;
