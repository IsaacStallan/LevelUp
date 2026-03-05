import { Router } from 'express';
import db from '../db.js';
import { verifyToken } from '../middleware/auth.js';
import { TITLES } from '../titles.js';

const router = Router();
router.use(verifyToken);

router.get('/', (req, res, next) => {
  try {
    const user = db.prepare('SELECT unlocked_titles, equipped_title FROM users WHERE id = ?').get(req.user.id);
    const unlocked = JSON.parse(user?.unlocked_titles || '[]');
    res.json({
      titles: TITLES.map(t => ({ ...t, unlocked: unlocked.includes(t.id) })),
      equipped_title: user?.equipped_title || '',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/equip/:titleId', (req, res, next) => {
  try {
    const { titleId } = req.params;
    const user = db.prepare('SELECT unlocked_titles FROM users WHERE id = ?').get(req.user.id);
    const unlocked = JSON.parse(user?.unlocked_titles || '[]');

    if (!unlocked.includes(titleId)) {
      return res.status(403).json({ error: 'Title not unlocked' });
    }
    const title = TITLES.find(t => t.id === titleId);
    if (!title) return res.status(404).json({ error: 'Title not found' });

    db.prepare('UPDATE users SET equipped_title = ? WHERE id = ?').run(title.name, req.user.id);
    res.json({ equipped_title: title.name });
  } catch (err) {
    next(err);
  }
});

router.delete('/equip', (req, res, next) => {
  try {
    db.prepare("UPDATE users SET equipped_title = '' WHERE id = ?").run(req.user.id);
    res.json({ equipped_title: '' });
  } catch (err) {
    next(err);
  }
});

export default router;
