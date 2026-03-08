import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { checkUnlocks } from '../titles.js';

const router = Router();
router.use(verifyToken);

const habitSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be blank').max(100),
  description: z.string().trim().max(300).optional().default(''),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#7c3aed'),
  icon: z.string().max(10).optional().default('✅'),
});

async function getCurrentStreak(userId) {
  const { rows: logs } = await query(
    `SELECT DISTINCT completed_date FROM habit_logs WHERE user_id = $1 ORDER BY completed_date DESC`,
    [userId]
  );
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  let check = today;
  for (const log of logs) {
    if (log.completed_date === check) {
      streak++;
      const d = new Date(check);
      d.setDate(d.getDate() - 1);
      check = d.toISOString().slice(0, 10);
    } else {
      break;
    }
  }
  return streak;
}

router.get('/', async (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { rows: habits } = await query(
      `SELECT h.*,
        CASE WHEN hl.id IS NOT NULL THEN 1 ELSE 0 END as completed_today
       FROM habits h
       LEFT JOIN habit_logs hl ON hl.habit_id = h.id AND hl.completed_date = $1
       WHERE h.user_id = $2 AND h.is_active = 1
       ORDER BY h.created_at ASC`,
      [today, req.user.id]
    );
    res.json(habits);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = habitSchema.parse(req.body);
    const { rows: [habit] } = await query(
      `INSERT INTO habits (user_id, name, description, color, icon)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, data.name, data.description, data.color, data.icon]
    );
    res.status(201).json(habit);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { rows: [habit] } = await query(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const data = habitSchema.partial().parse(req.body);
    const keys = Object.keys(data);
    const vals = Object.values(data);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const { rows: [updated] } = await query(
      `UPDATE habits SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`,
      [...vals, habit.id]
    );
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { rows: [habit] } = await query(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    await query('UPDATE habits SET is_active = 0 WHERE id = $1', [habit.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/complete', async (req, res, next) => {
  try {
    const { rows: [habit] } = await query(
      'SELECT * FROM habits WHERE id = $1 AND user_id = $2 AND is_active = 1',
      [req.params.id, req.user.id]
    );
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const today = new Date().toISOString().slice(0, 10);
    const { rows: [existing] } = await query(
      'SELECT id FROM habit_logs WHERE habit_id = $1 AND completed_date = $2',
      [habit.id, today]
    );
    if (existing) return res.status(409).json({ error: 'Already completed today' });

    const streakBeforeToday = await getCurrentStreak(req.user.id);
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const { rows: [hadYesterday] } = await query(
      'SELECT id FROM habit_logs WHERE user_id = $1 AND completed_date = $2',
      [req.user.id, yesterdayStr]
    );
    const newStreak = hadYesterday ? streakBeforeToday + 1 : 1;

    let xp = 10;
    if (newStreak >= 30) xp += 100;
    else if (newStreak >= 14) xp += 50;
    else if (newStreak >= 7) xp += 25;

    await query(
      'INSERT INTO habit_logs (habit_id, user_id, completed_date, xp_earned) VALUES ($1, $2, $3, $4)',
      [habit.id, req.user.id, today, xp]
    );

    // Battle scoring — recalculate avg daily completion rate for any active battles
    const { rows: activeBattles } = await query(
      `SELECT * FROM battles WHERE (challenger_id = $1 OR opponent_id = $1)
       AND status = 'active' AND ends_at > NOW()`,
      [req.user.id]
    );
    if (activeBattles.length > 0) {
      // Score = average daily completion rate since battle started
      // daily rate = (distinct habits completed that day / total active habits) * 100
      const { rows: [scoreRow] } = await query(
        `WITH daily AS (
           SELECT hl.completed_date,
                  COUNT(DISTINCT hl.habit_id)::float AS completed
           FROM habit_logs hl
           WHERE hl.user_id = $1
             AND hl.completed_date >= (
               SELECT MIN(starts_at)::date FROM battles
               WHERE (challenger_id = $1 OR opponent_id = $1) AND status = 'active'
             )
             AND hl.completed_date <= CURRENT_DATE
           GROUP BY hl.completed_date
         ),
         total AS (
           SELECT GREATEST(COUNT(*)::float, 1) AS cnt FROM habits WHERE user_id = $1 AND is_active = 1
         )
         SELECT COALESCE(ROUND(AVG((daily.completed / total.cnt) * 100))::int, 0) AS score
         FROM daily, total`,
        [req.user.id]
      );
      const newScore = scoreRow.score;
      for (const battle of activeBattles) {
        if (battle.challenger_id === req.user.id) {
          await query('UPDATE battles SET challenger_score = $1 WHERE id = $2', [newScore, battle.id]);
        } else {
          await query('UPDATE battles SET opponent_score = $1 WHERE id = $2', [newScore, battle.id]);
        }
      }
    }

    const { rows: [xpRow] } = await query(
      'SELECT COALESCE(SUM(xp_earned), 0)::int as total FROM habit_logs WHERE user_id = $1',
      [req.user.id]
    );
    const xp_total = Number(xpRow.total);
    const level = Math.min(Math.floor(xp_total / 100), 100);

    const { rows: [totalComp] } = await query(
      'SELECT COUNT(*)::int as total FROM habit_logs WHERE user_id = $1',
      [req.user.id]
    );
    const { rows: [userRow] } = await query(
      'SELECT unlocked_titles FROM users WHERE id = $1',
      [req.user.id]
    );
    const currentUnlocked = JSON.parse(userRow?.unlocked_titles || '[]');
    const newTitles = checkUnlocks(
      { total_completions: Number(totalComp.total), current_streak: newStreak, xp_total, level },
      currentUnlocked
    );
    if (newTitles.length > 0) {
      const merged = JSON.stringify([...currentUnlocked, ...newTitles]);
      await query('UPDATE users SET unlocked_titles = $1 WHERE id = $2', [merged, req.user.id]);
    }

    res.json({ xp_earned: xp, xp_total, level, streak: newStreak, new_titles: newTitles });
  } catch (err) {
    next(err);
  }
});

export default router;
