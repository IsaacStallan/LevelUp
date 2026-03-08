import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const query = (text, params) => pool.query(text, params);

export async function initDb() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      username TEXT NOT NULL,
      freeze_tokens INTEGER NOT NULL DEFAULT 3,
      unlocked_titles TEXT NOT NULL DEFAULT '[]',
      equipped_title TEXT NOT NULL DEFAULT '',
      insights_used_today INTEGER NOT NULL DEFAULT 0,
      insights_last_reset TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS habits (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#7c3aed',
      icon TEXT DEFAULT '✅',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS habit_logs (
      id SERIAL PRIMARY KEY,
      habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      completed_date TEXT NOT NULL,
      xp_earned INTEGER NOT NULL DEFAULT 10,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(habit_id, completed_date)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lemon_squeezy_id TEXT,
      status TEXT NOT NULL DEFAULT 'inactive',
      current_period_end TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS streak_freezes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      freeze_date TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, freeze_date)
    )
  `);

  // ── New columns added post-launch (idempotent) ──────────────────────────────
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS challenge_xp INTEGER NOT NULL DEFAULT 0`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_streak_email_sent TEXT NOT NULL DEFAULT ''`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'LIGHT'`);
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS last_streak_push_sent TEXT NOT NULL DEFAULT ''`);

  // ── Push subscriptions ──────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── Daily challenges (seeded via route constants — table for completion tracking) ──
  await query(`
    CREATE TABLE IF NOT EXISTS challenge_completions (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      challenge_date TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      xp_earned INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id, challenge_date)
    )
  `);

  // ── Habit Battles ────────────────────────────────────────────────────────────
  await query(`
    CREATE TABLE IF NOT EXISTS battles (
      id SERIAL PRIMARY KEY,
      challenger_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      opponent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      challenger_username TEXT NOT NULL,
      opponent_username TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      habit_category TEXT NOT NULL DEFAULT 'general',
      duration_days INTEGER NOT NULL DEFAULT 30,
      challenger_score INTEGER NOT NULL DEFAULT 0,
      opponent_score INTEGER NOT NULL DEFAULT 0,
      winner_id INTEGER REFERENCES users(id),
      invite_token TEXT UNIQUE NOT NULL,
      starts_at TIMESTAMPTZ,
      ends_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}
