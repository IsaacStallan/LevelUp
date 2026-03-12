import { Router } from 'express';
import webpush from 'web-push';
import { query } from '../db.js';
import { sendStreakRiskEmail } from '../emailService.js';

try {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL || 'admin@vivify.au'}`,
      process.env.VAPID_PUBLIC_KEY.trim(),
      process.env.VAPID_PRIVATE_KEY.trim()
    );
  }
} catch (e) {
  console.error('web-push VAPID init failed in cron (push notifications disabled):', e.message);
}

async function sendStreakPush(userId, mode, streak) {
  const { rows: subs } = await query(
    'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1',
    [userId]
  );
  if (!subs.length) return;

  const isShadow = mode === 'SHADOW';
  const payload = JSON.stringify({
    title: isShadow ? '⚔️ PROTOCOL INCOMPLETE' : '🔥 Streak at risk!',
    body: isShadow
      ? 'Your discipline is slipping. Execute before midnight.'
      : `Complete a habit before midnight to keep your ${streak}-day streak alive.`,
    url: '/dashboard',
  });

  await Promise.allSettled(subs.map(sub =>
    webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    )
  ));
}

const router = Router();

async function sendSuddenDeathPush(userId, title, body, url) {
  try {
    const { rows: subs } = await query(
      'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1', [userId]
    );
    if (!subs.length) return;
    const payload = JSON.stringify({ title, body, url });
    await Promise.allSettled(subs.map(sub =>
      webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload)
    ));
  } catch { /* non-fatal */ }
}

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
    // and haven't been notified today (email or push)
    const { rows: candidates } = await query(
      `SELECT u.id, u.email, u.username, u.mode,
              u.last_streak_email_sent, u.last_streak_push_sent
       FROM users u
       WHERE (u.last_streak_email_sent != $1 OR u.last_streak_push_sent != $1)
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
          const sends = [];
          if (user.last_streak_email_sent !== today) {
            sends.push(
              sendStreakRiskEmail(user.email, user.username, streak)
                .then(() => query('UPDATE users SET last_streak_email_sent = $1 WHERE id = $2', [today, user.id]))
            );
          }
          if (user.last_streak_push_sent !== today && process.env.VAPID_PUBLIC_KEY) {
            sends.push(
              sendStreakPush(user.id, user.mode || 'LIGHT', streak)
                .then(() => query('UPDATE users SET last_streak_push_sent = $1 WHERE id = $2', [today, user.id]))
            );
          }
          await Promise.allSettled(sends);
          sent++;
        } catch (err) {
          errors.push({ userId: user.id, error: err.message });
        }
      }
    }

    // Battle completion — regular expired battles (not already in sudden death)
    const { rows: expiredBattles } = await query(
      `SELECT * FROM battles WHERE status = 'active' AND sudden_death = false AND ends_at <= NOW()`
    );
    for (const b of expiredBattles) {
      // Both at 100% → trigger sudden death instead of completing
      if (b.opponent_id && b.challenger_score >= 100 && b.opponent_score >= 100) {
        const newEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await query(
          `UPDATE battles SET sudden_death = true, sudden_death_started_at = NOW(),
             ends_at = $1, challenger_score = 0, opponent_score = 0 WHERE id = $2`,
          [newEndsAt, b.id]
        );
        const title = '⚔️ SUDDEN DEATH';
        const msg = '⚔️ SUDDEN DEATH — both warriors are undefeated. One final day decides everything.';
        await Promise.allSettled([
          sendSuddenDeathPush(b.challenger_id, title, msg, `/battles/${b.id}`),
          sendSuddenDeathPush(b.opponent_id,   title, msg, `/battles/${b.id}`),
        ]);
        console.log('[cron] battle', b.id, '— SUDDEN DEATH triggered');
      } else {
        let winner_id = null;
        if (b.challenger_score > b.opponent_score) winner_id = b.challenger_id;
        else if (b.opponent_score > b.challenger_score) winner_id = b.opponent_id;
        await query(
          `UPDATE battles SET status = 'completed', winner_id = $1 WHERE id = $2`,
          [winner_id, b.id]
        );
        if (winner_id) {
          const xpBonus = 50 * b.duration_days;
          await query(
            `UPDATE users SET duel_wins = duel_wins + 1,
               challenge_xp = challenge_xp + $1,
               victory_bonus_pending = victory_bonus_pending + $1
             WHERE id = $2`,
            [xpBonus, winner_id]
          );
        }
      }
    }

    // Sudden death battles — handle expiry
    const { rows: expiredSuddenDeath } = await query(
      `SELECT * FROM battles WHERE status = 'active' AND sudden_death = true AND ends_at <= NOW()`
    );
    for (const b of expiredSuddenDeath) {
      let winner_id = null;
      if (b.challenger_score > b.opponent_score) winner_id = b.challenger_id;
      else if (b.opponent_score > b.challenger_score) winner_id = b.opponent_id;
      await query(
        `UPDATE battles SET status = 'completed', winner_id = $1 WHERE id = $2`,
        [winner_id, b.id]
      );
      const xpBonus = 50 * b.duration_days;
      if (winner_id) {
        await query(
          `UPDATE users SET duel_wins = duel_wins + 1,
             challenge_xp = challenge_xp + $1,
             victory_bonus_pending = victory_bonus_pending + $1
           WHERE id = $2`,
          [xpBonus, winner_id]
        );
        console.log('[cron] sudden death battle', b.id, 'won by', winner_id);
      } else if (b.challenger_id && b.opponent_id) {
        // Sudden death draw → both get 50% XP
        const halfXp = Math.floor(xpBonus / 2);
        await Promise.all([
          query(`UPDATE users SET challenge_xp = challenge_xp + $1, victory_bonus_pending = victory_bonus_pending + $1 WHERE id = $2`, [halfXp, b.challenger_id]),
          query(`UPDATE users SET challenge_xp = challenge_xp + $1, victory_bonus_pending = victory_bonus_pending + $1 WHERE id = $2`, [halfXp, b.opponent_id]),
        ]);
        console.log('[cron] sudden death battle', b.id, '— DRAW, each gets +', halfXp, 'XP');
      }
    }

    // Auto-forfeit battles where negotiation_deadline has passed without acceptance
    const { rows: expiredNegotiations } = await query(
      `SELECT * FROM battles
       WHERE status = 'pending'
         AND negotiation_deadline IS NOT NULL
         AND negotiation_deadline < NOW()
         AND negotiation_status NOT IN ('accepted', 'forfeited')`
    );
    for (const b of expiredNegotiations) {
      await query(
        `UPDATE battles SET negotiation_status = 'forfeited', status = 'completed' WHERE id = $1`,
        [b.id]
      );
    }

    res.json({
      checked: candidates.length,
      sent,
      errors,
      battles_closed: expiredBattles.length,
      sudden_death_triggered: expiredBattles.filter(b => b.opponent_id && b.challenger_score >= 100 && b.opponent_score >= 100).length,
      sudden_death_resolved: expiredSuddenDeath.length,
      negotiations_forfeited: expiredNegotiations.length,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
