import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { checkUnlocks } from '../titles.js';

const router = Router();
router.use(verifyToken);

const habitSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(300).optional().default(''),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().default('#7c3aed'),
  icon: z.string().max(10).optional().default('✅'),
});

function getCurrentStreak(userId) {
  const logs = db.prepare(
    `SELECT DISTINCT completed_date FROM habit_logs
     WHERE user_id = ? ORDER BY completed_date DESC`
  ).all(userId);

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

router.get('/', (req, res, next) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const habits = db.prepare(
      `SELECT h.*,
        CASE WHEN hl.id IS NOT NULL THEN 1 ELSE 0 END as completed_today
       FROM habits h
       LEFT JOIN habit_logs hl ON hl.habit_id = h.id AND hl.completed_date = ?
       WHERE h.user_id = ? AND h.is_active = 1
       ORDER BY h.created_at ASC`
    ).all(today, req.user.id);
    res.json(habits);
  } catch (err) {
    next(err);
  }
});

router.post('/', (req, res, next) => {
  try {
    const data = habitSchema.parse(req.body);
    const result = db.prepare(
      'INSERT INTO habits (user_id, name, description, color, icon) VALUES (?, ?, ?, ?, ?)'
    ).run(req.user.id, data.name, data.description, data.color, data.icon);
    const habit = db.prepare('SELECT * FROM habits WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(habit);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

router.put('/:id', (req, res, next) => {
  try {
    const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const data = habitSchema.partial().parse(req.body);
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), habit.id];
    db.prepare(`UPDATE habits SET ${fields} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM habits WHERE id = ?').get(habit.id);
    res.json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) return res.status(400).json({ error: err.errors[0].message });
    next(err);
  }
});

router.delete('/:id', (req, res, next) => {
  try {
    const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!habit) return res.status(404).json({ error: 'Habit not found' });
    db.prepare('UPDATE habits SET is_active = 0 WHERE id = ?').run(habit.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/complete', (req, res, next) => {
  try {
    const habit = db.prepare('SELECT * FROM habits WHERE id = ? AND user_id = ? AND is_active = 1').get(req.params.id, req.user.id);
    if (!habit) return res.status(404).json({ error: 'Habit not found' });

    const today = new Date().toISOString().slice(0, 10);
    const existing = db.prepare(
      'SELECT id FROM habit_logs WHERE habit_id = ? AND completed_date = ?'
    ).get(habit.id, today);

    if (existing) {
      return res.status(409).json({ error: 'Already completed today' });
    }

    // Calculate streak before logging (today's streak after this completion)
    const streakBeforeToday = getCurrentStreak(req.user.id);
    // After this completion the streak becomes streakBeforeToday + 1 (if yesterday was logged) or 1
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);
    const hadYesterday = db.prepare(
      'SELECT id FROM habit_logs WHERE user_id = ? AND completed_date = ?'
    ).get(req.user.id, yesterdayStr);

    const newStreak = hadYesterday ? streakBeforeToday + 1 : 1;

    let xp = 10;
    if (newStreak >= 30) xp += 100;
    else if (newStreak >= 14) xp += 50;
    else if (newStreak >= 7) xp += 25;

    db.prepare(
      'INSERT INTO habit_logs (habit_id, user_id, completed_date, xp_earned) VALUES (?, ?, ?, ?)'
    ).run(habit.id, req.user.id, today, xp);

    const xpRow = db.prepare('SELECT COALESCE(SUM(xp_earned), 0) as total FROM habit_logs WHERE user_id = ?').get(req.user.id);
    const xp_total = Number(xpRow.total);
    const level = Math.min(Math.floor(xp_total / 100), 100);

    const totalComp = db.prepare('SELECT COUNT(*) as total FROM habit_logs WHERE user_id = ?').get(req.user.id);
    const userRow = db.prepare('SELECT unlocked_titles FROM users WHERE id = ?').get(req.user.id);
    const currentUnlocked = JSON.parse(userRow?.unlocked_titles || '[]');
    const newTitles = checkUnlocks(
      { total_completions: Number(totalComp.total), current_streak: newStreak, xp_total, level },
      currentUnlocked
    );
    if (newTitles.length > 0) {
      const merged = JSON.stringify([...currentUnlocked, ...newTitles]);
      db.prepare('UPDATE users SET unlocked_titles = ? WHERE id = ?').run(merged, req.user.id);
    }

    res.json({ xp_earned: xp, xp_total, level, streak: newStreak, new_titles: newTitles });
  } catch (err) {
    next(err);
  }
});

export default router;
