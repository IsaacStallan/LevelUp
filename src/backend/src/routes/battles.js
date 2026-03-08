import { Router } from 'express';
import { randomBytes } from 'crypto';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

const VALID_CATEGORIES = ['general', 'fitness', 'mindset', 'discipline'];
const VALID_DURATIONS = [7, 14, 30];

// POST /api/battles/create — authenticated
router.post('/create', verifyToken, async (req, res, next) => {
  try {
    const { habit_category = 'general', duration_days = 30 } = req.body;
    if (!VALID_CATEGORIES.includes(habit_category))
      return res.status(400).json({ error: 'Invalid category' });
    if (!VALID_DURATIONS.includes(Number(duration_days)))
      return res.status(400).json({ error: 'Invalid duration. Must be 7, 14, or 30' });

    const invite_token = randomBytes(16).toString('hex');
    const { rows: [user] } = await query('SELECT username FROM users WHERE id = $1', [req.user.id]);

    const { rows: [battle] } = await query(
      `INSERT INTO battles (challenger_id, challenger_username, habit_category, duration_days, invite_token)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, user.username, habit_category, Number(duration_days), invite_token]
    );

    const invite_link = `https://vivify.au/battle/accept?token=${invite_token}`;
    res.status(201).json({ battle, invite_link });
  } catch (err) {
    next(err);
  }
});

// GET /api/battles/accept?token=TOKEN — public (no auth)
router.get('/accept', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const { rows: [battle] } = await query(
      `SELECT id, challenger_username, habit_category, duration_days, status
       FROM battles WHERE invite_token = $1`,
      [token]
    );
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    res.json(battle);
  } catch (err) {
    next(err);
  }
});

// POST /api/battles/accept — authenticated
router.post('/accept', verifyToken, async (req, res, next) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const { rows: [battle] } = await query(
      'SELECT * FROM battles WHERE invite_token = $1',
      [token]
    );
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'pending') return res.status(409).json({ error: 'Battle already accepted' });
    if (battle.challenger_id === req.user.id)
      return res.status(400).json({ error: 'Cannot battle yourself' });

    const { rows: [user] } = await query('SELECT username FROM users WHERE id = $1', [req.user.id]);

    const starts_at = new Date();
    const ends_at = new Date(starts_at);
    ends_at.setDate(ends_at.getDate() + battle.duration_days);

    const { rows: [updated] } = await query(
      `UPDATE battles
       SET opponent_id = $1, opponent_username = $2, status = 'active', starts_at = $3, ends_at = $4
       WHERE id = $5 RETURNING *`,
      [req.user.id, user.username, starts_at, ends_at, battle.id]
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /api/battles/mine — authenticated
router.get('/mine', verifyToken, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM battles
       WHERE challenger_id = $1 OR opponent_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/battles/:id — authenticated
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const { rows: [battle] } = await query(
      `SELECT * FROM battles WHERE id = $1 AND (challenger_id = $2 OR opponent_id = $2)`,
      [req.params.id, req.user.id]
    );
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    res.json(battle);
  } catch (err) {
    next(err);
  }
});

export default router;
