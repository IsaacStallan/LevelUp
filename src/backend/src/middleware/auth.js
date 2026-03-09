import jwt from 'jsonwebtoken';
import { query } from '../db.js';

export function verifyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

export async function requireSubscription(req, res, next) {
  try {
    const { rows: [sub] } = await query(
      `SELECT id FROM subscriptions
       WHERE user_id = $1 AND status = 'active'
       AND (current_period_end IS NULL OR current_period_end > NOW())
       LIMIT 1`,
      [req.user.id]
    );
    if (!sub) {
      return res.status(403).json({ error: 'Active subscription required', code: 'SUBSCRIPTION_REQUIRED' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireWarlordPass(req, res, next) {
  try {
    const { rows: [user] } = await query(
      `SELECT warlord_pass_status, warlord_pass_expires_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    const active = user?.warlord_pass_status === 'active' &&
      (!user.warlord_pass_expires_at || new Date(user.warlord_pass_expires_at) > new Date());
    if (!active) {
      return res.status(403).json({ error: 'Warlord Pass required', code: 'WARLORD_PASS_REQUIRED' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireShadowAccess(req, res, next) {
  try {
    const { rows: [user] } = await query(
      `SELECT warlord_pass_status, warlord_pass_expires_at, shadow_mode_trial_started_at FROM users WHERE id = $1`,
      [req.user.id]
    );
    const warlordActive = user?.warlord_pass_status === 'active' &&
      (!user.warlord_pass_expires_at || new Date(user.warlord_pass_expires_at) > new Date());
    if (warlordActive) return next();

    if (user?.shadow_mode_trial_started_at) {
      const trialEnd = new Date(user.shadow_mode_trial_started_at);
      trialEnd.setDate(trialEnd.getDate() + 7);
      if (new Date() < trialEnd) return next();
    }

    return res.status(403).json({ error: 'Shadow access required', code: 'SHADOW_ACCESS_REQUIRED' });
  } catch (err) {
    next(err);
  }
}
