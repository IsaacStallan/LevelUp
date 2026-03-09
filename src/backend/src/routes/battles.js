import { Router } from 'express';
import { randomBytes } from 'crypto';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const VALID_CATEGORIES = ['general', 'fitness', 'mindset', 'discipline'];
const VALID_DURATIONS = [7, 14, 30];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const anthropic = new Anthropic();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseHabits(json) {
  try { const arr = JSON.parse(json || '[]'); return Array.isArray(arr) ? arr : []; }
  catch { return []; }
}

function validateCustomHabits(habits) {
  if (!Array.isArray(habits) || habits.length < 1 || habits.length > 5) return false;
  return habits.every(h => h && typeof h.name === 'string' && h.name.trim().length > 0);
}

function sanitizeHabits(habits) {
  return habits.map(h => ({
    name: String(h.name).trim().slice(0, 200),
    icon: String(h.icon || '💪').slice(0, 4),
  }));
}

function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
}

function uploadToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err); else resolve(result);
    });
    stream.end(buffer);
  });
}

async function recalculateScore(battle, userId) {
  const isChallenger = battle.challenger_id === userId;
  const myHabits = parseHabits(isChallenger ? battle.opponent_assigned_habits : battle.challenger_assigned_habits);
  const today = todayStr();
  const { rows: logs } = await query(
    'SELECT habit_name, completed_date FROM battle_habit_logs WHERE battle_id = $1 AND user_id = $2',
    [battle.id, userId]
  );
  const startDate = new Date(battle.starts_at).toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' });
  const startMs = new Date(startDate + 'T00:00:00').getTime();
  const todayMs = new Date(today + 'T00:00:00').getTime();
  const elapsedDays = Math.min(Math.floor((todayMs - startMs) / 86400000) + 1, battle.duration_days);
  const logsByDate = {};
  for (const log of logs) {
    if (!logsByDate[log.completed_date]) logsByDate[log.completed_date] = new Set();
    logsByDate[log.completed_date].add(log.habit_name);
  }
  const habitNames = new Set(myHabits.map(h => h.name));
  let completedDays = 0;
  for (const names of Object.values(logsByDate)) {
    if ([...habitNames].every(n => names.has(n))) completedDays++;
  }
  const score = elapsedDays > 0 ? Math.round((completedDays / elapsedDays) * 100) : 0;
  const scoreField = isChallenger ? 'challenger_score' : 'opponent_score';
  await query(`UPDATE battles SET ${scoreField} = $1 WHERE id = $2`, [score, battle.id]);
  return score;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// POST /api/battles/create — authenticated
router.post('/create', verifyToken, async (req, res, next) => {
  try {
    const { habit_category = 'general', duration_days = 30, challenger_assigned_habits = [] } = req.body;
    if (!VALID_CATEGORIES.includes(habit_category))
      return res.status(400).json({ error: 'Invalid category' });
    if (!VALID_DURATIONS.includes(Number(duration_days)))
      return res.status(400).json({ error: 'Invalid duration. Must be 7, 14, or 30' });
    if (!validateCustomHabits(challenger_assigned_habits))
      return res.status(400).json({ error: 'Provide 1–5 habits with a name for each' });

    const sanitized = sanitizeHabits(challenger_assigned_habits);
    const invite_token = randomBytes(16).toString('hex');
    const { rows: [user] } = await query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const negotiation_deadline = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const { rows: [battle] } = await query(
      `INSERT INTO battles
         (challenger_id, challenger_username, habit_category, duration_days,
          invite_token, challenger_assigned_habits, negotiation_deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.user.id, user.username, habit_category, Number(duration_days),
       invite_token, JSON.stringify(sanitized), negotiation_deadline]
    );

    const invite_link = `https://vivify.au/battle/accept?token=${invite_token}`;
    res.status(201).json({ battle, invite_link });
  } catch (err) { next(err); }
});

// GET /api/battles/accept?token=TOKEN — public
router.get('/accept', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token required' });

    const { rows: [battle] } = await query(
      `SELECT id, challenger_id, challenger_username, habit_category, duration_days, status,
              challenger_assigned_habits, negotiation_status, negotiation_deadline
       FROM battles WHERE invite_token = $1`,
      [token]
    );
    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    res.json({ ...battle, challengerAssignedDetails: parseHabits(battle.challenger_assigned_habits) });
  } catch (err) { next(err); }
});

// POST /api/battles/accept-assigned — opponent accepts + writes habits for challenger
router.post('/accept-assigned', verifyToken, async (req, res, next) => {
  try {
    const { token, opponent_assigned_habits = [] } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });
    if (!validateCustomHabits(opponent_assigned_habits))
      return res.status(400).json({ error: 'Provide 1–5 habits with a name for each' });

    const { rows: [battle] } = await query('SELECT * FROM battles WHERE invite_token = $1', [token]);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'pending') return res.status(409).json({ error: 'Battle already accepted' });
    if (battle.challenger_id === req.user.id) return res.status(400).json({ error: 'Cannot battle yourself' });
    if (battle.negotiation_status === 'forfeited') return res.status(409).json({ error: 'Battle was forfeited' });

    const sanitized = sanitizeHabits(opponent_assigned_habits);
    const { rows: [user] } = await query('SELECT username FROM users WHERE id = $1', [req.user.id]);
    const starts_at = new Date();
    const ends_at = new Date(starts_at);
    ends_at.setDate(ends_at.getDate() + battle.duration_days);

    const { rows: [updated] } = await query(
      `UPDATE battles SET opponent_id = $1, opponent_username = $2,
           status = 'active', starts_at = $3, ends_at = $4,
           negotiation_status = 'accepted', opponent_assigned_habits = $5
       WHERE id = $6 RETURNING *`,
      [req.user.id, user.username, starts_at, ends_at, JSON.stringify(sanitized), battle.id]
    );
    res.json(updated);
  } catch (err) { next(err); }
});

// POST /api/battles/forfeit
router.post('/forfeit', verifyToken, async (req, res, next) => {
  try {
    const { battle_id } = req.body;
    if (!battle_id) return res.status(400).json({ error: 'battle_id required' });

    const { rows: [battle] } = await query(
      'SELECT * FROM battles WHERE id = $1 AND (challenger_id = $2 OR opponent_id = $2)',
      [battle_id, req.user.id]
    );
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'pending') return res.status(409).json({ error: 'Only pending battles can be forfeited' });

    const { rows: [updated] } = await query(
      `UPDATE battles SET negotiation_status = 'forfeited', status = 'completed' WHERE id = $1 RETURNING *`,
      [battle.id]
    );
    res.json(updated);
  } catch (err) { next(err); }
});

// GET /api/battles/mine — authenticated
router.get('/mine', verifyToken, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM battles WHERE challenger_id = $1 OR opponent_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/battles/:id/complete-habit — log today's habit completion (no photo)
router.post('/:id/complete-habit', verifyToken, async (req, res, next) => {
  try {
    const { habit_name } = req.body;
    if (!habit_name) return res.status(400).json({ error: 'habit_name required' });

    const { rows: [battle] } = await query(
      'SELECT * FROM battles WHERE id = $1 AND (challenger_id = $2 OR opponent_id = $2)',
      [req.params.id, req.user.id]
    );
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'active') return res.status(400).json({ error: 'Battle is not active' });

    const isChallenger = battle.challenger_id === req.user.id;
    const myHabits = parseHabits(isChallenger ? battle.opponent_assigned_habits : battle.challenger_assigned_habits);
    if (!myHabits.find(h => h.name === habit_name))
      return res.status(400).json({ error: 'Habit not in your assigned list' });

    const today = todayStr();
    await query(
      `INSERT INTO battle_habit_logs (battle_id, user_id, habit_name, completed_date)
       VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
      [battle.id, req.user.id, habit_name, today]
    );
    const score = await recalculateScore(battle, req.user.id);
    res.json({ ok: true, score, completedToday: true });
  } catch (err) { next(err); }
});

// POST /api/battles/:id/submit-proof — multipart photo upload + AI verification
router.post('/:id/submit-proof', verifyToken, upload.single('photo'), async (req, res, next) => {
  try {
    const { habit_name } = req.body;
    if (!habit_name) return res.status(400).json({ error: 'habit_name required' });
    if (!req.file)   return res.status(400).json({ error: 'photo required' });

    const { rows: [battle] } = await query(
      'SELECT * FROM battles WHERE id = $1 AND (challenger_id = $2 OR opponent_id = $2)',
      [req.params.id, req.user.id]
    );
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'active') return res.status(400).json({ error: 'Battle is not active' });

    const isChallenger = battle.challenger_id === req.user.id;
    const myHabits = parseHabits(isChallenger ? battle.opponent_assigned_habits : battle.challenger_assigned_habits);
    if (!myHabits.find(h => h.name === habit_name))
      return res.status(400).json({ error: 'Habit not in your assigned list' });

    const today = todayStr();
    const { rows: [existing] } = await query(
      'SELECT id FROM battle_proofs WHERE battle_id = $1 AND user_id = $2 AND habit_name = $3 AND completed_date = $4',
      [battle.id, req.user.id, habit_name, today]
    );
    if (existing) return res.status(409).json({ error: 'Proof already submitted for today' });

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(req.file.buffer, {
      folder: `battle-proofs/${battle.id}`,
      resource_type: 'image',
    });
    const photo_url = uploadResult.secure_url;

    // Call Claude Vision to verify
    let aiVerified = null, aiConfidence = null, aiReasoning = null;
    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: photo_url } },
            { type: 'text', text: `Does this photo show evidence of someone completing this habit: "${habit_name}"? Respond with JSON only: { "verified": boolean, "confidence": number (0-1), "reasoning": string (max 20 words) }` },
          ],
        }],
      });
      const raw = message.content[0].text.trim();
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const json = JSON.parse(match[0]);
        aiVerified   = Boolean(json.verified);
        aiConfidence = Number(json.confidence) || 0;
        aiReasoning  = String(json.reasoning || '').slice(0, 200);
      }
    } catch { /* AI failed — leave as null, falls to pending opponent review */ }

    const finalVerified = aiVerified === true && aiConfidence > 0.75;

    const { rows: [proof] } = await query(
      `INSERT INTO battle_proofs
         (battle_id, user_id, habit_name, completed_date, photo_url,
          ai_verified, ai_confidence, ai_reasoning, final_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [battle.id, req.user.id, habit_name, today, photo_url,
       aiVerified, aiConfidence, aiReasoning, finalVerified]
    );

    if (finalVerified) {
      await query(
        `INSERT INTO battle_habit_logs (battle_id, user_id, habit_name, completed_date, photo_storage_path)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        [battle.id, req.user.id, habit_name, today, photo_url]
      );
      await recalculateScore(battle, req.user.id);
    }

    res.json({
      aiVerified,
      confidence: aiConfidence,
      reasoning: aiReasoning,
      pendingOpponentReview: !finalVerified,
      proofId: proof.id,
    });
  } catch (err) { next(err); }
});

// GET /api/battles/:id/proofs — all proofs for this battle
router.get('/:id/proofs', verifyToken, async (req, res, next) => {
  try {
    const { rows: [battle] } = await query(
      'SELECT * FROM battles WHERE id = $1 AND (challenger_id = $2 OR opponent_id = $2)',
      [req.params.id, req.user.id]
    );
    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    const { rows: proofs } = await query(
      `SELECT bp.*, u.username,
              CASE WHEN bp.user_id = $2 THEN 'me' ELSE 'them' END as side
       FROM battle_proofs bp
       JOIN users u ON u.id = bp.user_id
       WHERE bp.battle_id = $1
       ORDER BY bp.created_at DESC`,
      [battle.id, req.user.id]
    );
    res.json(proofs);
  } catch (err) { next(err); }
});

// POST /api/battles/:id/verify-proof — opponent verifies or disputes a proof
router.post('/:id/verify-proof', verifyToken, async (req, res, next) => {
  try {
    const { proof_id, verified } = req.body;
    if (proof_id == null || verified == null)
      return res.status(400).json({ error: 'proof_id and verified required' });

    const { rows: [battle] } = await query(
      'SELECT * FROM battles WHERE id = $1 AND (challenger_id = $2 OR opponent_id = $2)',
      [req.params.id, req.user.id]
    );
    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    const { rows: [proof] } = await query(
      'SELECT * FROM battle_proofs WHERE id = $1 AND battle_id = $2',
      [proof_id, battle.id]
    );
    if (!proof) return res.status(404).json({ error: 'Proof not found' });
    if (proof.user_id === req.user.id) return res.status(400).json({ error: 'Cannot verify your own proof' });

    const finalVerified = Boolean(verified);
    await query(
      `UPDATE battle_proofs SET opponent_verified = $1, final_verified = $2, disputed_at = $3 WHERE id = $4`,
      [finalVerified, finalVerified, finalVerified ? null : new Date(), proof.id]
    );

    if (finalVerified) {
      await query(
        `INSERT INTO battle_habit_logs (battle_id, user_id, habit_name, completed_date, photo_storage_path)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        [battle.id, proof.user_id, proof.habit_name, proof.completed_date, proof.photo_url]
      );
      await recalculateScore(battle, proof.user_id);
    }

    res.json({ ok: true, finalVerified });
  } catch (err) { next(err); }
});

// GET /api/battles/:id/progress — both sides' habit progress
router.get('/:id/progress', verifyToken, async (req, res, next) => {
  try {
    const { rows: [battle] } = await query(
      'SELECT * FROM battles WHERE id = $1 AND (challenger_id = $2 OR opponent_id = $2)',
      [req.params.id, req.user.id]
    );
    if (!battle) return res.status(404).json({ error: 'Battle not found' });

    const challengerHabits = parseHabits(battle.opponent_assigned_habits);
    const opponentHabits   = parseHabits(battle.challenger_assigned_habits);

    const [cLogs, oLogs] = await Promise.all([
      query('SELECT habit_name, completed_date FROM battle_habit_logs WHERE battle_id = $1 AND user_id = $2',
        [battle.id, battle.challenger_id]),
      battle.opponent_id
        ? query('SELECT habit_name, completed_date FROM battle_habit_logs WHERE battle_id = $1 AND user_id = $2',
            [battle.id, battle.opponent_id])
        : { rows: [] },
    ]);

    function buildProgress(habits, logs) {
      return habits.map(h => ({
        ...h,
        completedDates: logs.filter(l => l.habit_name === h.name).map(l => l.completed_date),
      }));
    }

    const today = todayStr();
    const daysElapsed = battle.starts_at
      ? Math.min(
          Math.floor((new Date(today + 'T00:00:00') - new Date(new Date(battle.starts_at).toLocaleDateString('en-CA', { timeZone: 'Australia/Sydney' }) + 'T00:00:00')) / 86400000) + 1,
          battle.duration_days
        )
      : 0;

    res.json({
      challenger: { userId: battle.challenger_id, username: battle.challenger_username, habits: buildProgress(challengerHabits, cLogs.rows), score: battle.challenger_score },
      opponent:   { userId: battle.opponent_id,   username: battle.opponent_username,   habits: buildProgress(opponentHabits,   oLogs.rows), score: battle.opponent_score },
      today, daysElapsed, totalDays: battle.duration_days,
    });
  } catch (err) { next(err); }
});

// GET /api/battles/:id — enriched battle details
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const { rows: [battle] } = await query(
      'SELECT * FROM battles WHERE id = $1 AND (challenger_id = $2 OR opponent_id = $2)',
      [req.params.id, req.user.id]
    );
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    res.json({
      ...battle,
      challengerAssignedDetails: parseHabits(battle.challenger_assigned_habits),
      opponentAssignedDetails:   parseHabits(battle.opponent_assigned_habits),
    });
  } catch (err) { next(err); }
});

export default router;
