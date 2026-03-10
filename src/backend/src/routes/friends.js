import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

// ── GET /api/friends/search?q=username ──────────────────────────────────────
router.get('/search', verifyToken, async (req, res, next) => {
  try {
    const { q = '' } = req.query;
    if (q.trim().length === 0) return res.json([]);

    const { rows } = await query(
      `SELECT
         u.id,
         u.username,
         u.equipped_title,
         (u.warlord_pass_status = 'active' AND (u.warlord_pass_expires_at IS NULL OR u.warlord_pass_expires_at > NOW())) AS has_warlord_pass,
         COALESCE(SUM(hl.xp_earned), 0) + COALESCE(u.challenge_xp, 0) AS total_xp,
         f.id   AS friendship_id,
         f.status AS friendship_status,
         f.requester_id
       FROM users u
       LEFT JOIN habit_logs hl ON hl.user_id = u.id
       LEFT JOIN friendships f
         ON (f.requester_id = $1 AND f.addressee_id = u.id)
         OR (f.addressee_id = $1 AND f.requester_id = u.id)
       WHERE u.username ILIKE $2
         AND u.id != $1
       GROUP BY u.id, f.id, f.status, f.requester_id
       LIMIT 10`,
      [req.user.id, `%${q.trim()}%`]
    );

    const result = rows.map(r => ({
      id:                r.id,
      username:          r.username,
      equipped_title:    r.equipped_title,
      has_warlord_pass:  r.has_warlord_pass,
      level:             xpToLevel(Number(r.total_xp)),
      friendship_id:     r.friendship_id,
      friendship_status: r.friendship_status ?? null,
      i_requested:       r.requester_id === req.user.id,
    }));

    res.json(result);
  } catch (err) { next(err); }
});

// ── POST /api/friends/request ────────────────────────────────────────────────
router.post('/request', verifyToken, async (req, res, next) => {
  try {
    const { addressee_id } = req.body;
    if (!addressee_id) return res.status(400).json({ error: 'addressee_id required' });
    if (addressee_id === req.user.id) return res.status(400).json({ error: 'Cannot add yourself' });

    const { rows: [existing] } = await query(
      `SELECT id, status FROM friendships
       WHERE (requester_id = $1 AND addressee_id = $2)
          OR (requester_id = $2 AND addressee_id = $1)`,
      [req.user.id, addressee_id]
    );
    if (existing) return res.status(409).json({ error: 'Request already exists', status: existing.status });

    const { rows: [friendship] } = await query(
      `INSERT INTO friendships (requester_id, addressee_id) VALUES ($1, $2) RETURNING *`,
      [req.user.id, addressee_id]
    );
    res.status(201).json(friendship);
  } catch (err) { next(err); }
});

// ── POST /api/friends/respond ────────────────────────────────────────────────
router.post('/respond', verifyToken, async (req, res, next) => {
  try {
    const { friendship_id, action } = req.body;
    if (!friendship_id || !['accept', 'decline'].includes(action))
      return res.status(400).json({ error: 'friendship_id and action (accept|decline) required' });

    const { rows: [fr] } = await query(
      `SELECT * FROM friendships WHERE id = $1 AND addressee_id = $2`,
      [friendship_id, req.user.id]
    );
    if (!fr) return res.status(404).json({ error: 'Request not found' });
    if (fr.status !== 'pending') return res.status(409).json({ error: 'Already responded' });

    if (action === 'accept') {
      const { rows: [updated] } = await query(
        `UPDATE friendships SET status = 'accepted' WHERE id = $1 RETURNING *`,
        [friendship_id]
      );
      return res.json(updated);
    } else {
      await query(`DELETE FROM friendships WHERE id = $1`, [friendship_id]);
      return res.json({ deleted: true });
    }
  } catch (err) { next(err); }
});

// ── DELETE /api/friends/:id ──────────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res, next) => {
  try {
    const { rows: [fr] } = await query(
      `SELECT id FROM friendships
       WHERE id = $1 AND (requester_id = $2 OR addressee_id = $2)`,
      [req.params.id, req.user.id]
    );
    if (!fr) return res.status(404).json({ error: 'Not found' });
    await query(`DELETE FROM friendships WHERE id = $1`, [req.params.id]);
    res.json({ deleted: true });
  } catch (err) { next(err); }
});

// ── GET /api/friends — accepted friends with stats ───────────────────────────
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         f.id AS friendship_id,
         u.id,
         u.username,
         u.equipped_title,
         (u.warlord_pass_status = 'active' AND (u.warlord_pass_expires_at IS NULL OR u.warlord_pass_expires_at > NOW())) AS has_warlord_pass,
         COALESCE(SUM(hl.xp_earned), 0) + COALESCE(u.challenge_xp, 0) AS total_xp,
         u.duel_wins,
         EXISTS (
           SELECT 1 FROM habit_logs hl2
           WHERE hl2.user_id = u.id
             AND hl2.completed_date = TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
         ) AS active_today
       FROM friendships f
       JOIN users u ON u.id = CASE
           WHEN f.requester_id = $1 THEN f.addressee_id
           ELSE f.requester_id
         END
       LEFT JOIN habit_logs hl ON hl.user_id = u.id
       WHERE (f.requester_id = $1 OR f.addressee_id = $1)
         AND f.status = 'accepted'
       GROUP BY f.id, u.id
       ORDER BY u.username`,
      [req.user.id]
    );

    // Attach rank from leaderboard subquery
    const { rows: ranks } = await query(
      `SELECT user_id, rank FROM (
         SELECT user_id, RANK() OVER (ORDER BY SUM(xp_earned) DESC) AS rank
         FROM habit_logs GROUP BY user_id
       ) r`
    );
    const rankMap = Object.fromEntries(ranks.map(r => [r.user_id, Number(r.rank)]));

    const friends = rows.map(r => ({
      friendship_id:    r.friendship_id,
      id:               r.id,
      username:         r.username,
      equipped_title:   r.equipped_title,
      has_warlord_pass: r.has_warlord_pass,
      level:            xpToLevel(Number(r.total_xp)),
      duel_wins:        r.duel_wins,
      rank:             rankMap[r.id] ?? null,
      active_today:     r.active_today,
    }));

    res.json(friends);
  } catch (err) { next(err); }
});

// ── GET /api/friends/requests — incoming pending requests ────────────────────
router.get('/requests', verifyToken, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT
         f.id AS friendship_id,
         u.id,
         u.username,
         u.equipped_title,
         (u.warlord_pass_status = 'active' AND (u.warlord_pass_expires_at IS NULL OR u.warlord_pass_expires_at > NOW())) AS has_warlord_pass,
         COALESCE(SUM(hl.xp_earned), 0) + COALESCE(u.challenge_xp, 0) AS total_xp,
         f.created_at
       FROM friendships f
       JOIN users u ON u.id = f.requester_id
       LEFT JOIN habit_logs hl ON hl.user_id = u.id
       WHERE f.addressee_id = $1 AND f.status = 'pending'
       GROUP BY f.id, u.id
       ORDER BY f.created_at DESC`,
      [req.user.id]
    );

    res.json(rows.map(r => ({
      friendship_id:    r.friendship_id,
      id:               r.id,
      username:         r.username,
      equipped_title:   r.equipped_title,
      has_warlord_pass: r.has_warlord_pass,
      level:            xpToLevel(Number(r.total_xp)),
    })));
  } catch (err) { next(err); }
});

// ── helpers ──────────────────────────────────────────────────────────────────
function xpToLevel(xp) {
  if (xp >= 100000) return 100;
  if (xp >= 50000)  return 90;
  if (xp >= 25000)  return 80;
  if (xp >= 12000)  return 70;
  if (xp >= 6000)   return 60;
  if (xp >= 3000)   return 50;
  if (xp >= 1500)   return 40;
  if (xp >= 750)    return 30;
  if (xp >= 350)    return 20;
  if (xp >= 150)    return 10;
  if (xp >= 50)     return 5;
  return 1;
}

export default router;
