import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const DB_PATH = process.env.DATABASE_PATH || './data/levelup.db';
mkdirSync(dirname(DB_PATH), { recursive: true });

const SQL = await initSqlJs();

const fileBuffer = existsSync(DB_PATH) ? readFileSync(DB_PATH) : null;
const sqlDb = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

function persist() {
  writeFileSync(DB_PATH, Buffer.from(sqlDb.export()));
}

// ── Compatibility wrapper — matches the better-sqlite3 API used in all routes ──
//
//   db.prepare(sql).get(...params)   → first row as object, or undefined
//   db.prepare(sql).all(...params)   → array of row objects
//   db.prepare(sql).run(...params)   → { lastInsertRowid }  (persists to disk)
//   db.exec(sql)                     → multi-statement exec  (persists to disk)
//   db.pragma(str)                   → PRAGMA helper

function prepare(sql) {
  return {
    get(...args) {
      const stmt = sqlDb.prepare(sql);
      if (args.length) stmt.bind(args);
      const row = stmt.step() ? stmt.getAsObject() : undefined;
      stmt.free();
      return row;
    },
    all(...args) {
      const stmt = sqlDb.prepare(sql);
      if (args.length) stmt.bind(args);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    },
    run(...args) {
      const stmt = sqlDb.prepare(sql);
      stmt.run(args.length ? args : undefined);
      stmt.free();
      const rowid = sqlDb.exec('SELECT last_insert_rowid()')[0]?.values[0][0] ?? 0;
      persist();
      return { lastInsertRowid: rowid };
    },
  };
}

function exec(sql) {
  sqlDb.exec(sql);
  persist();
}

function pragma(str) {
  // sql.js supports PRAGMA statements; WAL is a no-op for in-memory+export approach
  try { sqlDb.run(`PRAGMA ${str}`); } catch { /* ignore unsupported pragmas */ }
}

const db = { prepare, exec, pragma };

// ── Schema ────────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    username TEXT NOT NULL,
    freeze_tokens INTEGER NOT NULL DEFAULT 3,
    unlocked_titles TEXT NOT NULL DEFAULT '[]',
    equipped_title TEXT NOT NULL DEFAULT '',
    insights_used_today INTEGER NOT NULL DEFAULT 0,
    insights_last_reset TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    color TEXT DEFAULT '#7c3aed',
    icon TEXT DEFAULT '✅',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS habit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    completed_date TEXT NOT NULL,
    xp_earned INTEGER NOT NULL DEFAULT 10,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(habit_id, completed_date)
  );

  CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lemon_squeezy_id TEXT,
    status TEXT NOT NULL DEFAULT 'inactive',
    current_period_end TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS streak_freezes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    freeze_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, freeze_date)
  );
`);

// Migrate existing databases (safe — ignored if column already exists)
for (const m of [
  `ALTER TABLE users ADD COLUMN freeze_tokens INTEGER NOT NULL DEFAULT 3`,
  `ALTER TABLE users ADD COLUMN unlocked_titles TEXT NOT NULL DEFAULT '[]'`,
  `ALTER TABLE users ADD COLUMN equipped_title TEXT NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN insights_used_today INTEGER NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN insights_last_reset TEXT NOT NULL DEFAULT ''`,
]) {
  try { sqlDb.exec(m); } catch { /* column already exists */ }
}
persist();

export default db;
