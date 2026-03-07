import { Router } from 'express';
import { query } from '../db.js';
import { sendStreakRiskEmail } from '../emailService.js';

const router = Router();

// Protect with a shared secret so only Railway cron can trigger this
function requireCronSecret(req, res, next) {
  const secret = req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// GET /api/cron/streak-check
// Called by Railway cron at 8pm daily.
// Finds users with an active streak who haven't completed any habit today
// and haven't already received a streak-risk email today.
router.get('/streak-check', requireCronSecret, async (req, res, next) => {
  try {
    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Users who completed a habit yesterday (streak active) but not today,
    // and haven't been emailed today
    const { rows: candidates } = await query(
      `SELECT u.id, u.email, u.username, u.last_streak_email_sent
       FROM users u
       WHERE u.last_streak_email_sent != $1
         AND EXISTS (
           SELECT 1 FROM habit_logs hl
           WHERE hl.user_id = u.id AND hl.completed_date = $2
         )
         AND NOT EXISTS (
           SELECT 1 FROM habit_logs hl
           WHERE hl.user_id = u.id AND hl.completed_date = $1
         )`,
      [today, yesterday]
    );

    let sent = 0;
    const errors = [];

    for (const user of candidates) {
      // Compute current streak length
      const { rows: logs } = await query(
        `SELECT DISTINCT completed_date FROM habit_logs
         WHERE user_id = $1 ORDER BY completed_date DESC LIMIT 60`,
        [user.id]
      );

      let streak = 0;
      let check  = yesterday;
      for (const log of logs) {
        if (log.completed_date === check) {
          streak++;
          const d = new Date(check);
          d.setDate(d.getDate() - 1);
          check = d.toISOString().slice(0, 10);
        } else break;
      }

      if (streak > 0) {
        try {
          await sendStreakRiskEmail(user.email, user.username, streak);
          await query(
            'UPDATE users SET last_streak_email_sent = $1 WHERE id = $2',
            [today, user.id]
          );
          sent++;
        } catch (emailErr) {
          errors.push({ userId: user.id, error: emailErr.message });
        }
      }
    }

    res.json({ checked: candidates.length, sent, errors });
  } catch (err) {
    next(err);
  }
});

export default router;
