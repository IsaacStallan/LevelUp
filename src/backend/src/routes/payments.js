import { Router } from 'express';
import { createHmac } from 'crypto';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';

const router = Router();

router.get('/status', verifyToken, async (req, res, next) => {
  try {
    const { rows: [user] } = await query(
      `SELECT warlord_pass_status, warlord_pass_expires_at, freeze_tokens, battle_forfeit_tokens
       FROM users WHERE id = $1`,
      [req.user.id]
    );
    const warlordPass = user?.warlord_pass_status === 'active' &&
      (!user.warlord_pass_expires_at || new Date(user.warlord_pass_expires_at) > new Date());
    res.json({
      warlordPass,
      warlordPassExpires: user?.warlord_pass_expires_at || null,
      freezeTokens: user?.freeze_tokens ?? 0,
      forfeitTokens: user?.battle_forfeit_tokens ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/webhook', async (req, res) => {
  // ── Log arrival before anything else ──────────────────────────────────────
  console.log('[webhook] arrived — headers:', {
    'x-signature': req.headers['x-signature'] ? 'present' : 'MISSING',
    'content-type': req.headers['content-type'],
  });

  const secret    = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  const signature = req.headers['x-signature'];

  if (!secret) {
    console.error('[webhook] LEMON_SQUEEZY_WEBHOOK_SECRET env var is not set');
    return res.status(400).json({ error: 'Webhook secret not configured' });
  }
  if (!signature) {
    console.error('[webhook] x-signature header missing');
    return res.status(400).json({ error: 'Missing signature' });
  }

  const body   = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
  const digest = createHmac('sha256', secret).update(body).digest('hex');

  console.log('[webhook] signature check — expected:', digest, 'got:', signature, 'match:', digest === signature);

  if (digest !== signature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let payload;
  try {
    payload = JSON.parse(body.toString());
  } catch {
    console.error('[webhook] Failed to parse JSON body');
    return res.status(400).json({ error: 'Invalid JSON payload' });
  }

  // ── Log the full structure so we can see exactly what LS sends ────────────
  console.log('[webhook] full payload:', JSON.stringify(payload, null, 2));

  const eventName  = payload.meta?.event_name;
  // Lemon Squeezy sends custom data under meta.custom_data (not data.attributes.custom_data)
  const customData = payload.meta?.custom_data ?? payload.data?.attributes?.custom_data ?? {};
  const productType = customData.product_type;
  const attrs      = payload.data?.attributes;
  const lsId       = payload.data?.id;
  const userEmail  = attrs?.user_email;

  console.log('[webhook] parsed — event:', eventName, '| email:', userEmail, '| product_type:', productType, '| custom_data:', customData);

  if (!userEmail || !eventName) {
    console.error('[webhook] Missing required fields — userEmail:', userEmail, 'eventName:', eventName);
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { rows: [user] } = await query('SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)', [userEmail]);
    console.log('[webhook] user lookup for', userEmail, '→', user ? `found id=${user.id}` : 'NOT FOUND');
    if (!user) return res.status(200).json({ received: true });

    switch (eventName) {
      case 'order_created': {
        const amountCents = attrs?.total ? Math.round(Number(attrs.total) * 100) : null;

        // Fallback: infer product_type from variant/product name if custom_data is missing
        const resolvedProductType = productType
          || inferProductType(attrs?.variant_name, attrs?.product_name);

        console.log('[webhook] order_created — resolvedProductType:', resolvedProductType, 'amount_cents:', amountCents);

        await query(
          `INSERT INTO purchases (user_id, product_type, lemon_squeezy_order_id, amount_cents)
           VALUES ($1, $2, $3, $4)`,
          [user.id, resolvedProductType || 'unknown', lsId, amountCents]
        );

        if (resolvedProductType === 'freeze_pack_3') {
          const r = await query('UPDATE users SET freeze_tokens = freeze_tokens + 3 WHERE id = $1 RETURNING freeze_tokens', [user.id]);
          console.log('[webhook] freeze_pack_3 applied — new freeze_tokens:', r.rows[0]?.freeze_tokens);
        } else if (resolvedProductType === 'freeze_pack_10') {
          const r = await query('UPDATE users SET freeze_tokens = freeze_tokens + 10 WHERE id = $1 RETURNING freeze_tokens', [user.id]);
          console.log('[webhook] freeze_pack_10 applied — new freeze_tokens:', r.rows[0]?.freeze_tokens);
        } else if (resolvedProductType === 'battle_forfeit') {
          const r = await query('UPDATE users SET battle_forfeit_tokens = battle_forfeit_tokens + 1 WHERE id = $1 RETURNING battle_forfeit_tokens', [user.id]);
          console.log('[webhook] battle_forfeit applied — new forfeit_tokens:', r.rows[0]?.battle_forfeit_tokens);
        } else {
          console.log('[webhook] order_created — no entitlement action for product_type:', resolvedProductType);
        }
        break;
      }

      case 'subscription_created':
      case 'subscription_updated': {
        const status    = attrs?.status === 'active' ? 'active' : (attrs?.status || 'inactive');
        const expiresAt = attrs?.renews_at || attrs?.ends_at || null;

        // Fallback: if no product_type, treat subscription events as warlord_pass
        const resolvedProductType = productType
          || inferProductType(attrs?.variant_name, attrs?.product_name)
          || 'warlord_pass';

        console.log('[webhook]', eventName, '— resolvedProductType:', resolvedProductType, 'status:', status, 'expiresAt:', expiresAt);

        if (resolvedProductType === 'warlord_pass') {
          if (status === 'active') {
            const { rows: [existing] } = await query(
              `SELECT warlord_pass_status FROM users WHERE id = $1`, [user.id]
            );
            const isFirstActivation = existing?.warlord_pass_status !== 'active';
            console.log('[webhook] warlord_pass activation — isFirst:', isFirstActivation);
            if (isFirstActivation) {
              const r = await query(
                `UPDATE users SET warlord_pass_status = 'active', warlord_pass_expires_at = $1,
                 freeze_tokens = freeze_tokens + 5 WHERE id = $2
                 RETURNING warlord_pass_status, warlord_pass_expires_at, freeze_tokens`,
                [expiresAt, user.id]
              );
              console.log('[webhook] warlord_pass first activation result:', r.rows[0]);
            } else {
              const r = await query(
                `UPDATE users SET warlord_pass_status = 'active', warlord_pass_expires_at = $1 WHERE id = $2
                 RETURNING warlord_pass_status, warlord_pass_expires_at`,
                [expiresAt, user.id]
              );
              console.log('[webhook] warlord_pass renewal result:', r.rows[0]);
            }
          } else {
            const r = await query(
              `UPDATE users SET warlord_pass_status = $1, warlord_pass_expires_at = $2 WHERE id = $3
               RETURNING warlord_pass_status`,
              [status, expiresAt, user.id]
            );
            console.log('[webhook] warlord_pass status update result:', r.rows[0]);
          }

          // Keep legacy subscriptions table in sync
          const { rows: [existingSub] } = await query(
            'SELECT id FROM subscriptions WHERE user_id = $1', [user.id]
          );
          if (existingSub) {
            await query(
              `UPDATE subscriptions SET lemon_squeezy_id = $1, status = $2, current_period_end = $3 WHERE user_id = $4`,
              [lsId, status, expiresAt, user.id]
            );
          } else {
            await query(
              `INSERT INTO subscriptions (user_id, lemon_squeezy_id, status, current_period_end) VALUES ($1, $2, $3, $4)`,
              [user.id, lsId, status, expiresAt]
            );
          }
        }
        break;
      }

      case 'subscription_cancelled':
        await query(`UPDATE users SET warlord_pass_status = 'cancelled' WHERE id = $1`, [user.id]);
        await query(`UPDATE subscriptions SET status = 'cancelled' WHERE user_id = $1`, [user.id]);
        console.log('[webhook] subscription_cancelled applied for user', user.id);
        break;

      case 'subscription_expired':
        await query(`UPDATE users SET warlord_pass_status = 'expired' WHERE id = $1`, [user.id]);
        await query(`UPDATE subscriptions SET status = 'expired' WHERE user_id = $1`, [user.id]);
        console.log('[webhook] subscription_expired applied for user', user.id);
        break;

      default:
        console.log('[webhook] unhandled event_name:', eventName);
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook] handler error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// ── Fallback: infer product_type from Lemon Squeezy variant/product names ───
function inferProductType(variantName = '', productName = '') {
  const s = `${variantName} ${productName}`.toLowerCase();
  if (s.includes('warlord')) return 'warlord_pass';
  if (s.includes('freeze') && s.includes('10')) return 'freeze_pack_10';
  if (s.includes('freeze') && s.includes('3')) return 'freeze_pack_3';
  if (s.includes('forfeit')) return 'battle_forfeit';
  if (s.includes('extension')) return 'duel_extension';
  return null;
}

// ── Manual activation endpoint (for fixing affected users) ───────────────────
// POST /api/payments/manual-activate-warlord
// Header: x-cron-secret: <CRON_SECRET>
// Body: { email: string }
router.post('/manual-activate-warlord', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers['x-cron-secret'] !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });

  try {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { rows: [user] } = await query(
      `UPDATE users
       SET warlord_pass_status = 'active',
           warlord_pass_expires_at = $1,
           freeze_tokens = CASE WHEN warlord_pass_status != 'active' THEN freeze_tokens + 5 ELSE freeze_tokens END
       WHERE LOWER(email) = LOWER($2)
       RETURNING id, email, warlord_pass_status, warlord_pass_expires_at, freeze_tokens`,
      [expiresAt, email]
    );

    if (!user) return res.status(404).json({ error: 'User not found' });

    // Upsert subscriptions table
    const { rows: [existingSub] } = await query('SELECT id FROM subscriptions WHERE user_id = $1', [user.id]);
    if (existingSub) {
      await query(
        `UPDATE subscriptions SET status = 'active', current_period_end = $1 WHERE user_id = $2`,
        [expiresAt, user.id]
      );
    } else {
      await query(
        `INSERT INTO subscriptions (user_id, status, current_period_end) VALUES ($1, 'active', $2)`,
        [user.id, expiresAt]
      );
    }

    console.log('[manual-activate-warlord] activated for', user.email, 'expires', expiresAt);
    res.json({ ok: true, user });
  } catch (err) {
    console.error('[manual-activate-warlord] error:', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
