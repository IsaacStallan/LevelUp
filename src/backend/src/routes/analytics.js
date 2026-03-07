import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { query } from '../db.js';
import { verifyToken, requireSubscription } from '../middleware/auth.js';

// 10 AI insight requests / hour per IP — prevents account-farming attacks
const insightsIpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, slow down' },
});

const router = Router();
router.use(verifyToken);

const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

async function habitCurrentStreak(habitId) {
  const { rows: logs } = await query(
    `SELECT completed_date FROM habit_logs WHERE habit_id = $1 ORDER BY completed_date DESC`,
    [habitId]
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
    } else break;
  }
  return streak;
}

async function habitBestStreak(habitId) {
  const { rows } = await query(
    `SELECT DISTINCT completed_date FROM habit_logs WHERE habit_id = $1 ORDER BY completed_date ASC`,
    [habitId]
  );
  const dates = rows.map(r => r.completed_date);
  let best = 0, cur = 0, prev = null;
  for (const date of dates) {
    if (prev) {
      const p = new Date(prev);
      p.setDate(p.getDate() + 1);
      cur = p.toISOString().slice(0, 10) === date ? cur + 1 : 1;
    } else {
      cur = 1;
    }
    if (cur > best) best = cur;
    prev = date;
  }
  return best;
}

// ── GET / ─────────────────────────────────────────────────────────────────────
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const since = new Date();
    since.setDate(since.getDate() - 29);
    const sinceStr = since.toISOString().slice(0, 10);

    const { rows: dailyXpRaw } = await query(`
      SELECT completed_date as date, SUM(xp_earned)::int as xp, COUNT(*)::int as completions
      FROM habit_logs WHERE user_id = $1 AND completed_date::DATE >= $2::DATE
      GROUP BY completed_date ORDER BY completed_date ASC
    `, [userId, sinceStr]);

    const { rows: dayOfWeekRaw } = await query(`
      SELECT EXTRACT(DOW FROM completed_date::DATE)::INTEGER as dow, COUNT(*)::int as count
      FROM habit_logs WHERE user_id = $1 GROUP BY dow ORDER BY dow ASC
    `, [userId]);

    const today = new Date();
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    const thisWeekStr = thisWeekStart.toISOString().slice(0, 10);
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekStr = lastWeekStart.toISOString().slice(0, 10);

    const { rows: [thisWeek] } = await query(`
      SELECT COALESCE(SUM(xp_earned), 0)::int as xp, COUNT(*)::int as completions
      FROM habit_logs WHERE user_id = $1 AND completed_date::DATE >= $2::DATE
    `, [userId, thisWeekStr]);

    const { rows: [lastWeek] } = await query(`
      SELECT COALESCE(SUM(xp_earned), 0)::int as xp, COUNT(*)::int as completions
      FROM habit_logs WHERE user_id = $1 AND completed_date::DATE >= $2::DATE AND completed_date::DATE < $3::DATE
    `, [userId, lastWeekStr, thisWeekStr]);

    const { rows: habitRows } = await query(
      `SELECT id, name, color, icon FROM habits WHERE user_id = $1 AND is_active = 1`,
      [userId]
    );

    const habits = await Promise.all(habitRows.map(async h => {
      const { rows: [all] } = await query(
        `SELECT COUNT(*)::int as c, COALESCE(SUM(xp_earned), 0)::int as xp FROM habit_logs WHERE habit_id = $1`,
        [h.id]
      );
      const { rows: [last30] } = await query(
        `SELECT COUNT(*)::int as c FROM habit_logs WHERE habit_id = $1 AND completed_date::DATE >= $2::DATE`,
        [h.id, sinceStr]
      );
      return {
        id: h.id, name: h.name, color: h.color, icon: h.icon,
        total_completions:    Number(all.c),
        total_xp:             Number(all.xp),
        completions_30d:      Number(last30.c),
        completion_rate_30d:  Math.round((Number(last30.c) / 30) * 100),
        current_streak:       await habitCurrentStreak(h.id),
        best_streak:          await habitBestStreak(h.id),
      };
    }));

    res.json({
      daily_xp:    dailyXpRaw.map(r => ({ ...r, xp: Number(r.xp), completions: Number(r.completions) })),
      day_of_week: dayOfWeekRaw.map(r => ({ ...r, count: Number(r.count) })),
      this_week:   { xp: Number(thisWeek.xp), completions: Number(thisWeek.completions) },
      last_week:   { xp: Number(lastWeek.xp), completions: Number(lastWeek.completions) },
      habits,
    });
  } catch (err) {
    next(err);
  }
});

// ── POST /insights ─────────────────────────────────────────────────────────────
router.post('/insights', insightsIpLimiter, requireSubscription, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today  = new Date().toISOString().slice(0, 10);

    const { rows: [userRow] } = await query(
      'SELECT insights_used_today, insights_last_reset FROM users WHERE id = $1',
      [userId]
    );
    const usedToday = userRow?.insights_last_reset === today ? (userRow?.insights_used_today ?? 0) : 0;
    if (usedToday >= 3) return res.status(429).json({ error: 'Daily limit reached', remaining: 0 });

    const sinceStr = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

    const { rows: [xpRow] } = await query(
      `SELECT COALESCE(SUM(xp_earned), 0)::int as t FROM habit_logs WHERE user_id = $1`,
      [userId]
    );
    const xp_total = Number(xpRow.t);
    const level    = Math.min(Math.floor(xp_total / 100), 100);

    const { rows: allLogs } = await query(
      `SELECT DISTINCT completed_date FROM habit_logs WHERE user_id = $1 ORDER BY completed_date DESC`,
      [userId]
    );
    let current_streak = 0, checkDate = today;
    for (const l of allLogs) {
      if (l.completed_date === checkDate) {
        current_streak++;
        const d = new Date(checkDate);
        d.setDate(d.getDate() - 1);
        checkDate = d.toISOString().slice(0, 10);
      } else break;
    }

    const { rows: dowRows } = await query(
      `SELECT EXTRACT(DOW FROM completed_date::DATE)::INTEGER as dow, COUNT(*)::int as c
       FROM habit_logs WHERE user_id = $1 GROUP BY dow ORDER BY c DESC`,
      [userId]
    );
    const bestDay  = dowRows[0]                    ? DOW_NAMES[dowRows[0].dow]                    : 'N/A';
    const worstDay = dowRows[dowRows.length - 1]   ? DOW_NAMES[dowRows[dowRows.length - 1].dow]   : 'N/A';

    const twStr = new Date(new Date().setDate(new Date().getDate() - new Date().getDay())).toISOString().slice(0, 10);
    const lwStr = new Date(new Date(twStr).setDate(new Date(twStr).getDate() - 7)).toISOString().slice(0, 10);
    const { rows: [twRow] } = await query(
      `SELECT COALESCE(SUM(xp_earned), 0)::int as x FROM habit_logs WHERE user_id = $1 AND completed_date::DATE >= $2::DATE`,
      [userId, twStr]
    );
    const { rows: [lwRow] } = await query(
      `SELECT COALESCE(SUM(xp_earned), 0)::int as x FROM habit_logs WHERE user_id = $1 AND completed_date::DATE >= $2::DATE AND completed_date::DATE < $3::DATE`,
      [userId, lwStr, twStr]
    );
    const thisWXp = Number(twRow.x);
    const lastWXp = Number(lwRow.x);

    const { rows: [totalRow] } = await query(
      `SELECT COUNT(*)::int as c FROM habit_logs WHERE user_id = $1`,
      [userId]
    );
    const totalComp = Number(totalRow.c);

    const { rows: habitRows } = await query(
      `SELECT id, name FROM habits WHERE user_id = $1 AND is_active = 1`,
      [userId]
    );
    const habitData = await Promise.all(habitRows.map(async h => {
      const { rows: [row] } = await query(
        `SELECT COUNT(*)::int as c FROM habit_logs WHERE habit_id = $1 AND completed_date::DATE >= $2::DATE`,
        [h.id, sinceStr]
      );
      return { name: h.name, completion_rate_30d: Math.round((Number(row.c) / 30) * 100) };
    }));
    const avgRate = habitData.length
      ? Math.round(habitData.reduce((s, h) => s + h.completion_rate_30d, 0) / habitData.length)
      : 0;

    const stats = {
      level, xp_total, current_streak, total_completions: totalComp,
      habits_count: habitRows.length, this_week_xp: thisWXp, last_week_xp: lastWXp,
      avg_completion_rate_30d: avgRate, best_day: bestDay, worst_day: worstDay,
      habits: habitData,
    };

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on server' });
    }

    const prompt = `You are a habit coach. Analyze this user's habit data and return ONLY valid JSON with this exact structure: { "strengths": [string, string], "warnings": [string, string], "recommendations": [string, string, string], "overallScore": number, "scoreLabel": string }. Data: ${JSON.stringify(stats)}. Be specific, personal and actionable. overallScore is 0-100. scoreLabel must be exactly one of these based on overallScore: "Just Getting Started" (0-20), "Finding Your Feet" (21-40), "Building Momentum" (41-60), "On a Roll" (61-80), "Unstoppable" (81-100).`;

    let apiRes;
    try {
      apiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key':         process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type':      'application/json',
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 500,
          messages:   [{ role: 'user', content: prompt }],
        }),
      });
    } catch (fetchErr) {
      console.error('Claude API network error:', fetchErr);
      return res.status(502).json({ error: 'Could not reach Claude API', detail: fetchErr.message });
    }

    if (!apiRes.ok) {
      const errBody = await apiRes.text();
      console.error('Claude API error — status:', apiRes.status, 'body:', errBody);
      let parsed;
      try { parsed = JSON.parse(errBody); } catch { parsed = null; }
      const isNoCredits = errBody.includes('credit balance') || errBody.includes('billing');
      return res.status(502).json({
        error: isNoCredits
          ? 'AI credits exhausted — add credits at console.anthropic.com'
          : 'AI service unavailable',
        detail: parsed?.error?.message ?? errBody,
      });
    }

    const apiData = await apiRes.json();
    const text    = apiData.content?.[0]?.text ?? '';
    let insights;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      insights = JSON.parse(match ? match[0] : text);
    } catch {
      return res.status(502).json({ error: 'Failed to parse AI response' });
    }

    const newUsed = usedToday + 1;
    await query(
      'UPDATE users SET insights_used_today = $1, insights_last_reset = $2 WHERE id = $3',
      [newUsed, today, userId]
    );

    res.json({ ...insights, remaining: 3 - newUsed });
  } catch (err) {
    next(err);
  }
});

export default router;
