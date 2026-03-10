import { Router } from 'express';
import { query } from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { TITLES } from '../titles.js';

const router = Router();
router.use(verifyToken);

function isPassActive(user) {
  return user.warlord_pass_status === 'active' &&
    (!user.warlord_pass_expires_at || new Date(user.warlord_pass_expires_at) > new Date());
}

router.get('/', async (req, res, next) => {
  try {
    const { rows: [user] } = await query(
      `SELECT unlocked_titles, equipped_title, warlord_pass_status, warlord_pass_expires_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    const hasWarlordPass = isPassActive(user);
    let unlocked = JSON.parse(user?.unlocked_titles || '[]');
    let equipped = user?.equipped_title || '';

    // Auto-unlock shadow titles for pass holders (fulfil the empty promise)
    if (hasWarlordPass) {
      const shadowIds = TITLES.filter(t => t.shadow).map(t => t.id);
      const newUnlocks = shadowIds.filter(id => !unlocked.includes(id));
      if (newUnlocks.length > 0) {
        unlocked = [...unlocked, ...newUnlocks];
        await query('UPDATE users SET unlocked_titles = $1 WHERE id = $2',
          [JSON.stringify(unlocked), req.user.id]);
        // Auto-equip "The Unseen" on first activation if nothing is equipped
        if (!equipped) {
          equipped = '👁️ The Unseen';
          await query('UPDATE users SET equipped_title = $1 WHERE id = $2',
            [equipped, req.user.id]);
        }
      }
    }

    res.json({
      titles: TITLES.map(t => ({
        ...t,
        unlocked: unlocked.includes(t.id),
        requiresWarlordPass: !!t.shadow,
      })),
      equipped_title: equipped,
      hasWarlordPass,
    });
  } catch (err) {
    next(err);
  }
});

router.post('/equip/:titleId', async (req, res, next) => {
  try {
    const { titleId } = req.params;
    const { rows: [user] } = await query(
      'SELECT unlocked_titles, warlord_pass_status, warlord_pass_expires_at FROM users WHERE id = $1',
      [req.user.id]
    );
    const unlocked = JSON.parse(user?.unlocked_titles || '[]');
    if (!unlocked.includes(titleId)) return res.status(403).json({ error: 'Title not unlocked' });

    const title = TITLES.find(t => t.id === titleId);
    if (!title) return res.status(404).json({ error: 'Title not found' });

    if (title.shadow && !isPassActive(user)) {
      return res.status(403).json({ error: 'Warlord Pass required to equip this title' });
    }

    await query('UPDATE users SET equipped_title = $1 WHERE id = $2', [title.name, req.user.id]);
    res.json({ equipped_title: title.name });
  } catch (err) {
    next(err);
  }
});

router.delete('/equip', async (req, res, next) => {
  try {
    await query("UPDATE users SET equipped_title = '' WHERE id = $1", [req.user.id]);
    res.json({ equipped_title: '' });
  } catch (err) {
    next(err);
  }
});

export default router;
