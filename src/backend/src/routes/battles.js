import { Router } from 'express';
import { randomBytes } from 'crypto';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import Anthropic from '@anthropic-ai/sdk';
import webpush from 'web-push';

const router = Router();

const VALID_CATEGORIES = ['general', 'fitness', 'mindset', 'discipline'];
const VALID_DURATIONS = [7, 14, 30];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

try {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(
      `mailto:${process.env.VAPID_EMAIL || 'admin@vivify.au'}`,
      process.env.VAPID_PUBLIC_KEY.trim(),
      process.env.VAPID_PRIVATE_KEY.trim()
    );
  }
} catch (e) {
  console.error('web-push VAPID init failed in battles:', e.message);
}

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

async function sendPush(userId, title, body, url) {
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

async function recalculateScore(battle, userId) {
  const isChallenger = battle.challenger_id === userId;
  const myHabits = parseHabits(isChallenger ? battle.opponent_assigned_habits : battle.challenger_assigned_habits);
  const totalHabits = myHabits.length;

  const startRef = battle.sudden_death && battle.sudden_death_started_at
    ? new Date(battle.sudden_death_started_at)
    : new Date(battle.starts_at);
  const maxDays = battle.sudden_death ? 1 : battle.duration_days;
  const elapsed = Math.max(1, Math.ceil((new Date() - startRef) / (1000 * 60 * 60 * 24)));
  const elapsedDays = Math.min(elapsed, maxDays);

  // Count distinct verified habits per day
  // (final_verified IS NOT FALSE = includes null=pending and true=verified, excludes false=rejected)
  const proofParams = [battle.id, userId];
  let dateFilter = '';
  if (battle.sudden_death && battle.sudden_death_started_at) {
    dateFilter = 'AND created_at > $3';
    proofParams.push(battle.sudden_death_started_at);
  }
  const { rows: dailyCounts } = await query(
    `SELECT completed_date::text AS day, COUNT(DISTINCT habit_name) AS completed_count
     FROM battle_proofs
     WHERE battle_id = $1 AND user_id = $2 AND (final_verified IS NOT FALSE) ${dateFilter}
     GROUP BY completed_date`,
    proofParams
  );

  // Build a map of day → completed_count
  const countByDay = {};
  for (const row of dailyCounts) {
    countByDay[row.day] = Number(row.completed_count);
  }

  // For each elapsed calendar day, compute daily % (0 if no submissions that day)
  let dailyPctSum = 0;
  for (let d = 0; d < elapsedDays; d++) {
    const day = new Date(startRef);
    day.setUTCDate(day.getUTCDate() + d);
    const dayStr = day.toISOString().slice(0, 10); // YYYY-MM-DD
    const completed = countByDay[dayStr] ?? 0;
    dailyPctSum += totalHabits > 0 ? (completed / totalHabits) * 100 : 0;
  }

  const score = elapsedDays > 0 ? Math.round(dailyPctSum / elapsedDays) : 0;
  const scoreField = isChallenger ? 'challenger_score' : 'opponent_score';
  console.log('[recalculateScore] battleId=%d userId=%d isChallenger=%s suddenDeath=%s startRef=%s elapsedDays=%d totalHabits=%d dailyCounts=%j score=%d',
    battle.id, userId, isChallenger, battle.sudden_death, startRef.toISOString(), elapsedDays,
    totalHabits, dailyCounts, score);
  await query(`UPDATE battles SET ${scoreField} = $1 WHERE id = $2`, [score, battle.id]);
  return score;
}

// ── Battle completion helper ────────────────────────────────────────────────────
async function completeBattle(battle) {
  const xpBonus = 50 * battle.duration_days;

  // Sudden death: both at 100% and not already in sudden death → trigger it
  if (!battle.sudden_death && battle.opponent_id &&
      battle.challenger_score >= 100 && battle.opponent_score >= 100) {
    const newEndsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await query(
      `UPDATE battles SET sudden_death = true, sudden_death_started_at = NOW(),
         ends_at = $1, challenger_score = 0, opponent_score = 0 WHERE id = $2`,
      [newEndsAt, battle.id]
    );
    const title = '⚔️ SUDDEN DEATH';
    const msg = '⚔️ SUDDEN DEATH — both warriors are undefeated. One final day decides everything.';
    await Promise.all([
      sendPush(battle.challenger_id, title, msg, `/battles/${battle.id}`),
      sendPush(battle.opponent_id,   title, msg, `/battles/${battle.id}`),
    ]);
    console.log('[completeBattle] battle', battle.id, '— SUDDEN DEATH triggered, ends_at extended to', newEndsAt);
    return null;
  }

  // Normal completion (including post-sudden-death)
  let winnerId = null;
  if (battle.challenger_score !== battle.opponent_score) {
    winnerId = battle.challenger_score > battle.opponent_score
      ? battle.challenger_id
      : battle.opponent_id;
  }
  await query(
    `UPDATE battles SET status = 'completed', winner_id = $1 WHERE id = $2`,
    [winnerId, battle.id]
  );
  if (winnerId) {
    await query(
      `UPDATE users SET duel_wins = duel_wins + 1,
         challenge_xp = challenge_xp + $1,
         victory_bonus_pending = victory_bonus_pending + $1
       WHERE id = $2`,
      [xpBonus, winnerId]
    );
    console.log('[completeBattle] battle', battle.id, 'won by', winnerId, '— +', xpBonus, 'XP');
  } else if (battle.sudden_death && battle.challenger_id && battle.opponent_id) {
    // Sudden death draw: both get 50% XP
    const halfXp = Math.floor(xpBonus / 2);
    await Promise.all([
      query(`UPDATE users SET challenge_xp = challenge_xp + $1, victory_bonus_pending = victory_bonus_pending + $1 WHERE id = $2`, [halfXp, battle.challenger_id]),
      query(`UPDATE users SET challenge_xp = challenge_xp + $1, victory_bonus_pending = victory_bonus_pending + $1 WHERE id = $2`, [halfXp, battle.opponent_id]),
    ]);
    console.log('[completeBattle] battle', battle.id, '— sudden death DRAW, each gets +', halfXp, 'XP');
  }
  return winnerId;
}

// ── Routes ─────────────────────────────────────────────────────────────────────

// POST /api/battles/create — authenticated
router.post('/create', verifyToken, async (req, res, next) => {
  try {
    const {
      habit_category = 'general',
      duration_days = 30,
      challenger_assigned_habits = [],
      opponent_id = null,
    } = req.body;

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

    const isDirect = Boolean(opponent_id && opponent_id !== req.user.id);
    let opponentUsername = null;
    if (isDirect) {
      const { rows: [opp] } = await query('SELECT username FROM users WHERE id = $1', [opponent_id]);
      if (!opp) return res.status(404).json({ error: 'Opponent not found' });
      opponentUsername = opp.username;
    }

    const { rows: [battle] } = await query(
      `INSERT INTO battles
         (challenger_id, challenger_username, opponent_id, opponent_username,
          habit_category, duration_days, invite_token,
          challenger_assigned_habits, negotiation_deadline,
          direct_challenge, opponent_notified)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10) RETURNING *`,
      [req.user.id, user.username,
       isDirect ? opponent_id : null,
       opponentUsername,
       habit_category, Number(duration_days),
       invite_token, JSON.stringify(sanitized), negotiation_deadline,
       isDirect]
    );

    const invite_link = `https://vivify.au/battle/accept?token=${invite_token}`;
    res.status(201).json({ battle, invite_link, direct_challenge: isDirect });
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

// POST /api/battles/:id/forfeit-token — use a forfeit token to concede an active battle
router.post('/:id/forfeit-token', verifyToken, async (req, res, next) => {
  try {
    const { rows: [battle] } = await query(
      'SELECT * FROM battles WHERE id = $1 AND (challenger_id = $2 OR opponent_id = $2)',
      [req.params.id, req.user.id]
    );
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'active') return res.status(409).json({ error: 'Battle is not active' });

    const { rows: [user] } = await query(
      'SELECT battle_forfeit_tokens FROM users WHERE id = $1', [req.user.id]
    );
    if (!user || user.battle_forfeit_tokens < 1) {
      return res.status(400).json({ error: 'No forfeit tokens remaining' });
    }

    const opponentId = battle.challenger_id === req.user.id
      ? battle.opponent_id
      : battle.challenger_id;

    const { rows: [updated] } = await query(
      `UPDATE battles SET status = 'completed', winner_id = $1 WHERE id = $2 RETURNING *`,
      [opponentId, battle.id]
    );

    // Award duel win + XP bonus to the opponent (winner)
    const xpBonus = 50 * battle.duration_days;
    await query(
      `UPDATE users SET duel_wins = duel_wins + 1,
         challenge_xp = challenge_xp + $1,
         victory_bonus_pending = victory_bonus_pending + $1
       WHERE id = $2`,
      [xpBonus, opponentId]
    );

    await query(
      'UPDATE users SET battle_forfeit_tokens = battle_forfeit_tokens - 1 WHERE id = $1',
      [req.user.id]
    );

    const { rows: [updatedUser] } = await query(
      'SELECT battle_forfeit_tokens FROM users WHERE id = $1', [req.user.id]
    );

    console.log('[forfeit-token] battle', battle.id, 'forfeited by user', req.user.id, '— remaining tokens:', updatedUser.battle_forfeit_tokens);
    res.json({ battle: updated, forfeitTokensRemaining: updatedUser.battle_forfeit_tokens });
  } catch (err) { next(err); }
});

// POST /api/battles/:id/extend — use a duel extension to add 3 days to ends_at
router.post('/:id/extend', verifyToken, async (req, res, next) => {
  try {
    const { rows: [battle] } = await query(
      'SELECT * FROM battles WHERE id = $1 AND (challenger_id = $2 OR opponent_id = $2)',
      [req.params.id, req.user.id]
    );
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'active') return res.status(409).json({ error: 'Battle is not active' });

    const { rows: [user] } = await query(
      'SELECT duel_extensions FROM users WHERE id = $1', [req.user.id]
    );
    if (!user || user.duel_extensions < 1) {
      return res.status(400).json({ error: 'No duel extensions remaining' });
    }

    const newEndsAt = new Date(battle.ends_at);
    newEndsAt.setDate(newEndsAt.getDate() + 3);

    const { rows: [updated] } = await query(
      `UPDATE battles SET ends_at = $1 WHERE id = $2 RETURNING *`,
      [newEndsAt, battle.id]
    );

    await query(
      'UPDATE users SET duel_extensions = duel_extensions - 1 WHERE id = $1',
      [req.user.id]
    );

    const { rows: [updatedUser] } = await query(
      'SELECT duel_extensions FROM users WHERE id = $1', [req.user.id]
    );

    console.log('[extend] battle', battle.id, 'extended by user', req.user.id, 'to', newEndsAt, '— remaining extensions:', updatedUser.duel_extensions);
    res.json({ battle: updated, duelExtensionsRemaining: updatedUser.duel_extensions });
  } catch (err) { next(err); }
});

// GET /api/battles/mine — authenticated
router.get('/mine', verifyToken, async (req, res, next) => {
  try {
    // Auto-complete any expired active battles — wrapped so a failure never blocks the list
    try {
      const { rows: expired } = await query(
        `SELECT * FROM battles
         WHERE (challenger_id = $1 OR opponent_id = $1)
           AND status = 'active' AND ends_at < NOW()`,
        [req.user.id]
      );
      for (const battle of expired) {
        await completeBattle(battle);
      }
    } catch (completionErr) {
      console.error('[GET /mine] auto-complete error:', completionErr.message, completionErr.stack);
    }

    const { rows } = await query(
      `SELECT b.*,
        (c.warlord_pass_status = 'active' AND (c.warlord_pass_expires_at IS NULL OR c.warlord_pass_expires_at > NOW()))::boolean AS challenger_has_warlord_pass,
        (o.warlord_pass_status = 'active' AND (o.warlord_pass_expires_at IS NULL OR o.warlord_pass_expires_at > NOW()))::boolean AS opponent_has_warlord_pass
       FROM battles b
       LEFT JOIN users c ON c.id = b.challenger_id
       LEFT JOIN users o ON o.id = b.opponent_id
       WHERE b.challenger_id = $1 OR b.opponent_id = $1 ORDER BY b.created_at DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('[GET /mine] fatal error:', err.message, err.stack);
    next(err);
  }
});

// POST /api/battles/:id/complete-habit — disabled; photo proof required
router.post('/:id/complete-habit', verifyToken, (req, res) => {
  res.status(400).json({ error: 'Photo proof required. Use /submit-proof instead.' });
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
          Math.max(1, Math.ceil((new Date() - new Date(battle.starts_at)) / (1000 * 60 * 60 * 24))),
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

// GET /api/battles/admin/list — all battles (admin only)
// NOTE: must stay before GET /:id to avoid route conflict
router.get('/admin/list', async (req, res, next) => {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const { rows } = await query(
      `SELECT b.id, b.challenger_id, b.opponent_id,
              c.username AS challenger_username, o.username AS opponent_username,
              b.status, b.created_at
       FROM battles b
       LEFT JOIN users c ON c.id = b.challenger_id
       LEFT JOIN users o ON o.id = b.opponent_id
       ORDER BY b.created_at DESC`
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// GET /api/battles/:id — enriched battle details
router.get('/:id', verifyToken, async (req, res, next) => {
  try {
    const { rows: [battle] } = await query(
      `SELECT b.*,
        (c.warlord_pass_status = 'active' AND (c.warlord_pass_expires_at IS NULL OR c.warlord_pass_expires_at > NOW()))::boolean AS challenger_has_warlord_pass,
        (o.warlord_pass_status = 'active' AND (o.warlord_pass_expires_at IS NULL OR o.warlord_pass_expires_at > NOW()))::boolean AS opponent_has_warlord_pass
       FROM battles b
       LEFT JOIN users c ON c.id = b.challenger_id
       LEFT JOIN users o ON o.id = b.opponent_id
       WHERE b.id = $1 AND (b.challenger_id = $2 OR b.opponent_id = $2)`,
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

// DELETE /api/battles/:id/cancel — challenger cancels a pending invite (free, no token)
router.delete('/:id/cancel', verifyToken, async (req, res, next) => {
  try {
    const { rows: [battle] } = await query(
      'SELECT * FROM battles WHERE id = $1 AND challenger_id = $2',
      [req.params.id, req.user.id]
    );
    if (!battle) return res.status(404).json({ error: 'Battle not found or you are not the challenger' });
    if (battle.status !== 'pending') return res.status(409).json({ error: 'Can only cancel pending battles' });

    await query('DELETE FROM battle_habit_logs WHERE battle_id = $1', [battle.id]);
    await query('DELETE FROM battle_proofs WHERE battle_id = $1', [battle.id]);
    await query('DELETE FROM battles WHERE id = $1', [battle.id]);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── Admin: delete battle by ID ──────────────────────────────────────────────
router.delete('/admin/:id', async (req, res, next) => {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const battleId = Number(req.params.id);
  if (!Number.isInteger(battleId) || battleId <= 0) {
    return res.status(400).json({ error: 'Invalid battle ID' });
  }
  try {
    await query('DELETE FROM battle_habit_logs WHERE battle_id = $1', [battleId]);
    await query('DELETE FROM battle_proofs WHERE battle_id = $1', [battleId]);
    const { rowCount } = await query('DELETE FROM battles WHERE id = $1', [battleId]);
    if (rowCount === 0) return res.status(404).json({ error: 'Battle not found' });
    res.json({ ok: true, deleted: battleId });
  } catch (err) { next(err); }
});

// POST /api/battles/admin/:id/recalculate — force score recalculation for a specific battle
router.post('/admin/:id/recalculate', async (req, res, next) => {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const battleId = Number(req.params.id);
  if (!Number.isInteger(battleId) || battleId <= 0) {
    return res.status(400).json({ error: 'Invalid battle ID' });
  }
  try {
    const { rows: [battle] } = await query('SELECT * FROM battles WHERE id = $1', [battleId]);
    if (!battle) return res.status(404).json({ error: 'Battle not found' });
    if (battle.status !== 'active') return res.status(400).json({ error: 'Battle is not active' });

    const [challengerScore, opponentScore] = await Promise.all([
      recalculateScore(battle, battle.challenger_id),
      battle.opponent_id ? recalculateScore(battle, battle.opponent_id) : Promise.resolve(null),
    ]);
    res.json({ ok: true, battleId, challengerScore, opponentScore });
  } catch (err) { next(err); }
});

export default router;
