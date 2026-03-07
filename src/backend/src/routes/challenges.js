import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();
router.use(verifyToken);

// Challenges seeded by day of week (0=Sun, 1=Mon, ..., 6=Sat)
const DAILY_CHALLENGES = [
  { day: 0, title: 'Reflect and Reset',        description: 'Complete at least 1 habit today.', xp_reward: 20, challenge_type: 'min_completions', target_value: 1 },
  { day: 1, title: 'Iron Monday',              description: 'Complete all habits before noon.', xp_reward: 50, challenge_type: 'all_before_noon', target_value: 0 },
  { day: 2, title: 'Double Down',              description: 'Complete at least 2 habits today.', xp_reward: 30, challenge_type: 'min_completions', target_value: 2 },
  { day: 3, title: 'Midweek Grind',            description: 'Maintain your streak — complete at least 1 habit.', xp_reward: 25, challenge_type: 'maintain_streak', target_value: 1 },
  { day: 4, title: 'Push Through',             description: 'Complete at least 1 habit — push through the Thursday slump.', xp_reward: 35, challenge_type: 'min_completions', target_value: 1 },
  { day: 5, title: 'Finish Strong',            description: 'Complete all your habits today. End the week right.', xp_reward: 50, challenge_type: 'all_habits', target_value: 0 },
  { day: 6, title: 'Weekend Warrior',          description: 'Complete any habit today. Consistency beats perfection.', xp_reward: 20, challenge_type: 'min_completions', target_value: 1 },
];

router.get('/today', async (req, res, next) => {
  try {
    const today  = new Date().toISOString().slice(0, 10);
    const dow    = new Date().getDay(); // 0-6
    const challenge = DAILY_CHALLENGES[dow];

    const { rows: [completion] } = await query(
      'SELECT id FROM challenge_completions WHERE user_id = $1 AND challenge_date = $2',
      [req.user.id, today]
    );

    res.json({ challenge, completed: !!completion });
  } catch (err) {
    next(err);
  }
});

router.post('/complete', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const dow   = new Date().getDay();
    const challenge = DAILY_CHALLENGES[dow];

    // Idempotent — do nothing if already completed
    const { rows: [existing] } = await query(
      'SELECT id FROM challenge_completions WHERE user_id = $1 AND challenge_date = $2',
      [req.user.id, today]
    );
    if (existing) return res.json({ already_completed: true, xp_earned: 0 });

    await query(
      'INSERT INTO challenge_completions (user_id, challenge_date, day_of_week, xp_earned) VALUES ($1, $2, $3, $4)',
      [req.user.id, today, dow, challenge.xp_reward]
    );

    await query(
      'UPDATE users SET challenge_xp = challenge_xp + $1 WHERE id = $2',
      [challenge.xp_reward, req.user.id]
    );

    const { rows: [userRow] } = await query(
      'SELECT challenge_xp FROM users WHERE id = $1', [req.user.id]
    );
    const { rows: [xpRow] } = await query(
      'SELECT COALESCE(SUM(xp_earned), 0)::int as habit_xp FROM habit_logs WHERE user_id = $1',
      [req.user.id]
    );

    const xp_total = Number(xpRow.habit_xp) + Number(userRow.challenge_xp);
    const level    = Math.min(Math.floor(xp_total / 100), 100);

    res.json({ xp_earned: challenge.xp_reward, xp_total, level });
  } catch (err) {
    next(err);
  }
});

export default router;
