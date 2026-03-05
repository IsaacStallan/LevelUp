# LevelUp — Technical Specification

## 1. Domain Model

### User
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | autoincrement |
| email | TEXT UNIQUE | validated |
| password_hash | TEXT | bcrypt |
| username | TEXT | display name |
| created_at | TEXT | ISO8601 |

### Habit
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | |
| user_id | INTEGER FK | → users |
| name | TEXT | required |
| description | TEXT | optional |
| color | TEXT | hex color |
| icon | TEXT | emoji |
| is_active | INTEGER | 0/1, soft delete |
| created_at | TEXT | |

### HabitLog
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | |
| habit_id | INTEGER FK | → habits |
| user_id | INTEGER FK | → users |
| completed_date | TEXT | YYYY-MM-DD |
| xp_earned | INTEGER | 10 base + bonuses |
| created_at | TEXT | |
| UNIQUE | (habit_id, completed_date) | prevent duplicates |

### Subscription
| Field | Type | Notes |
|-------|------|-------|
| id | INTEGER PK | |
| user_id | INTEGER FK | → users |
| lemon_squeezy_id | TEXT | LS subscription ID |
| status | TEXT | active/cancelled/expired |
| current_period_end | TEXT | ISO8601 |
| created_at | TEXT | |

---

## 2. API Routes

### Auth — /api/auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | No | Create account, return JWT |
| POST | /login | No | Validate credentials, return JWT |
| GET | /me | JWT | Current user profile + stats |

### Habits — /api/habits
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | JWT + Sub | List active habits |
| POST | / | JWT + Sub | Create habit |
| PUT | /:id | JWT + Sub | Update habit |
| DELETE | /:id | JWT + Sub | Soft delete |
| POST | /:id/complete | JWT + Sub | Log completion, award XP |

### Gamification — /api/gamification
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /stats | JWT | XP, level, streak, completions |

### Payments — /api/payments
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /status | JWT | Subscription status |
| POST | /webhook | Sig | Lemon Squeezy webhook |

---

## 3. XP & Leveling Formula

- **Base XP per completion**: 10
- **Streak bonuses** (cumulative on milestone days):
  - 7-day streak: +25 XP
  - 14-day streak: +50 XP
  - 30-day streak: +100 XP
- **Level formula**: `level = Math.min(Math.floor(xp_total / 100), 100)`
- **XP to next level**: `100 - (xp_total % 100)`

## 4. Character Progression
- Level 1–10: 🌱 Seedling
- Level 11–25: ⚔️ Warrior
- Level 26–50: 🧙 Mage
- Level 51–75: 🦅 Champion
- Level 76–100: 👑 Legend

---

## 5. Frontend Page Map
```
/ (Dashboard)       — stats, today's habits, character
/habits             — CRUD habit management
/login              — auth
/register           — auth
/upgrade            — Lemon Squeezy paywall
```

---

## 6. Lemon Squeezy Integration
1. User clicks "Upgrade" → redirected to LS checkout with pre-filled email
2. LS sends webhook to `POST /api/payments/webhook`
3. Backend verifies HMAC-SHA256 signature
4. Events handled:
   - `subscription_created` → insert subscription record, status=active
   - `subscription_updated` → update status + period end
   - `subscription_cancelled` → status=cancelled
   - `subscription_expired` → status=expired
5. `requireSubscription` middleware checks `subscriptions` table for active row

---

## 7. Environment Variables

### Backend (.env)
```
PORT=3001
JWT_SECRET=your-secret-here
LEMON_SQUEEZY_WEBHOOK_SECRET=your-webhook-secret
DATABASE_PATH=./data/levelup.db
```

### Frontend (.env)
```
VITE_LEMON_SQUEEZY_CHECKOUT_URL=https://your-store.lemonsqueezy.com/checkout/...
```
