import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import XPBar from '../components/XPBar.jsx';
import HabitCard from '../components/HabitCard.jsx';
import LevelUpOverlay from '../components/LevelUpOverlay.jsx';
import StageUpOverlay from '../components/StageUpOverlay.jsx';
import NavHeader from '../components/NavHeader.jsx';

function getCharacter(level) {
  if (level >= 90) return { emoji: '⚡', title: 'Immortal' };
  if (level >= 70) return { emoji: '👑', title: 'Legend' };
  if (level >= 55) return { emoji: '💀', title: 'Shadow' };
  if (level >= 40) return { emoji: '🔥', title: 'Champion' };
  if (level >= 25) return { emoji: '🧙', title: 'Mage' };
  if (level >= 15) return { emoji: '🛡️', title: 'Knight' };
  if (level >= 8)  return { emoji: '⚔️', title: 'Warrior' };
  if (level >= 4)  return { emoji: '🗡️', title: 'Apprentice' };
  if (level >= 1)  return { emoji: '🧭', title: 'Wanderer' };
  return { emoji: '🌱', title: 'Seedling' };
}

export default function Dashboard() {
  const { user, updateUser, isSubscribed } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats]           = useState(null);
  const [habits, setHabits]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [xpFlash, setXpFlash]       = useState(false);
  const [levelUp, setLevelUp]       = useState(null);  // { newLevel, character }
  const [stageUp, setStageUp]       = useState(null);  // { newStage, newLevel }
  const prevLevelRef = useRef(null);
  const xpFlashTimer = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, habitsRes] = await Promise.all([
        client.get('/gamification/stats'),
        client.get('/habits'),
      ]);
      setStats(statsRes.data);
      prevLevelRef.current = statsRes.data.level;
      setHabits(habitsRes.data);
    } catch (err) {
      if (err.response?.status === 403) navigate('/upgrade');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function handleComplete(habitId) {
    try {
      const { data } = await client.post(`/habits/${habitId}/complete`);
      updateUser({ level: data.level });

      const prevLevel  = prevLevelRef.current ?? 0;
      const didLevelUp = data.level > prevLevel;
      const prevChar   = getCharacter(prevLevel);
      const newChar    = getCharacter(data.level);
      const didStageUp = didLevelUp && prevChar.title !== newChar.title;

      setStats(prev => prev ? {
        ...prev,
        xp_total: data.xp_total,
        level: data.level,
        xp_to_next_level: 100 - (data.xp_total % 100),
        current_streak: data.streak,
        habits_completed_today: prev.habits_completed_today + 1,
      } : prev);
      setHabits(prev => prev.map(h => h.id === habitId ? { ...h, completed_today: 1 } : h));

      if (didLevelUp) {
        prevLevelRef.current = data.level;
        setTimeout(() => {
          setXpFlash(true);
          clearTimeout(xpFlashTimer.current);
          xpFlashTimer.current = setTimeout(() => setXpFlash(false), 1400);
          setTimeout(() => {
            if (didStageUp) {
              setStageUp({ newStage: newChar, newLevel: data.level });
            } else {
              setLevelUp({ newLevel: data.level, character: newChar });
            }
          }, 200);
        }, 600);
      } else {
        prevLevelRef.current = data.level;
      }

      return data;
    } catch {
      return null;
    }
  }

  const currentLevel = stats?.level ?? user?.level ?? 1;
  const character    = getCharacter(currentLevel);

  return (
    <div className="page-enter min-h-screen">
      {/* Level-up overlay (same stage) */}
      <LevelUpOverlay
        show={!!levelUp}
        newLevel={levelUp?.newLevel ?? 1}
        character={levelUp?.character ?? character}
        onDismiss={() => setLevelUp(null)}
      />

      {/* Stage-up overlay (character name changes) — more dramatic */}
      <StageUpOverlay
        show={!!stageUp}
        newStage={stageUp?.newStage ?? character}
        newLevel={stageUp?.newLevel ?? 1}
        onDismiss={() => setStageUp(null)}
      />

      <NavHeader level={currentLevel} />

      {/* Background drift dots */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {[
          { size: 3, top: '18%', left: '8%',  dur: '14s', delay: '0s'   },
          { size: 2, top: '55%', left: '15%', dur: '18s', delay: '3s'   },
          { size: 4, top: '30%', left: '88%', dur: '12s', delay: '1.5s' },
          { size: 2, top: '72%', left: '78%', dur: '20s', delay: '5s'   },
          { size: 3, top: '85%', left: '40%', dur: '16s', delay: '2s'   },
          { size: 2, top: '12%', left: '60%', dur: '22s', delay: '7s'   },
        ].map((d, i) => (
          <div
            key={i}
            className="drift-dot"
            style={{
              width:  d.size + 'px',
              height: d.size + 'px',
              top:    d.top,
              left:   d.left,
              '--dur':   d.dur,
              '--delay': d.delay,
            }}
          />
        ))}
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="skeleton rounded-2xl h-36" />
            <div className="skeleton rounded-xl h-14" />
            <div className="skeleton rounded-xl h-14" />
            <div className="skeleton rounded-xl h-14" />
          </div>
        ) : (
          <>
            {/* Character + XP card */}
            <div className="card-glow glass-card rounded-2xl border border-white/[0.08] p-4 sm:p-6">
              {/* Mobile: character centred on top, XP + stats below.
                  Desktop: character on left, XP + stats on right. */}
              <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">

                {/* Character — centred on mobile, left-aligned on sm */}
                <div className="flex sm:flex-col items-center gap-3 sm:gap-0 sm:shrink-0">
                  <div className="text-[56px] sm:text-6xl leading-none">{character.emoji}</div>
                  <div className="sm:mt-1 text-center sm:text-center">
                    <p className="text-sm font-bold text-purple-400">{character.title}</p>
                    {stats?.equipped_title && (
                      <p className="text-[10px] text-yellow-400 mt-0.5">{stats.equipped_title}</p>
                    )}
                    <p className="text-[11px] text-gray-600 tabular-nums">Lv.{currentLevel}</p>
                  </div>
                </div>

                {/* XP bar + stats */}
                <div className="w-full sm:flex-1 space-y-3">
                  <XPBar
                    xp={stats?.xp_total ?? 0}
                    level={stats?.level ?? 0}
                    xp_to_next_level={stats?.xp_to_next_level ?? 100}
                    flash={xpFlash}
                  />
                  {/* Stats: 4 cols on all sizes */}
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    <StatPill label="Streak"  value={stats?.current_streak ?? 0}        icon="🔥" accent="fire" />
                    <StatPill label="Today"   value={stats?.habits_completed_today ?? 0} icon="✅" accent="green" />
                    <StatPill label="Total XP" value={stats?.xp_total ?? 0}              icon="⚡" accent="gold" />
                    <StatPill label="Freeze"  value={stats?.freeze_tokens ?? 0}          icon="🧊" accent={null} />
                  </div>
                  {/* Streak protect button — visible after 6pm with no completions and streak active */}
                  {(stats?.current_streak ?? 0) > 0 &&
                   (stats?.habits_completed_today ?? 0) === 0 &&
                   (stats?.freeze_tokens ?? 0) > 0 &&
                   new Date().getHours() >= 18 && (
                    <FreezeButton
                      tokens={stats.freeze_tokens}
                      onFreeze={async () => {
                        try {
                          const { data } = await client.post('/streaks/freeze');
                          setStats(prev => prev ? { ...prev, freeze_tokens: data.freeze_tokens } : prev);
                        } catch { /* ignore */ }
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Today's Habits */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base sm:text-lg font-semibold text-white">Today's Habits</h2>
                <Link to="/habits" className="text-sm text-purple-400 hover:text-purple-300">
                  Manage →
                </Link>
              </div>

              {habits.length === 0 ? (
                <div className="bg-gray-900 rounded-xl border border-gray-800 border-dashed p-8 text-center">
                  <p className="text-gray-500 mb-3 text-sm sm:text-base">No habits yet. Create your first quest!</p>
                  <Link
                    to="/habits"
                    className="inline-block bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Add Habit
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {habits.map(h => (
                    <HabitCard
                      key={h.id}
                      habit={h}
                      completedToday={!!h.completed_today}
                      onComplete={handleComplete}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Mobile upgrade nudge — only for non-subscribers on small screens */}
            {!isSubscribed && (
              <div className="sm:hidden">
                <Link
                  to="/upgrade"
                  className="block text-center text-sm text-purple-400 border border-purple-900/50 rounded-xl py-3 bg-purple-950/30 hover:bg-purple-950/50 transition-colors"
                >
                  ⚡ Upgrade to Pro — $7/mo
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function FreezeButton({ tokens, onFreeze }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function handle() {
    setBusy(true);
    await onFreeze();
    setDone(true);
    setBusy(false);
  }

  if (done) {
    return (
      <div className="text-xs text-center text-blue-400 bg-blue-950/30 border border-blue-800/40 rounded-lg py-2">
        🧊 Streak protected for today!
      </div>
    );
  }

  return (
    <button
      onClick={handle}
      disabled={busy}
      className="w-full text-xs font-medium text-blue-300 bg-blue-950/30 border border-blue-800/40 hover:bg-blue-950/50 rounded-lg py-2 transition-colors"
    >
      {busy ? '…' : `🧊 Protect streak (${tokens} token${tokens === 1 ? '' : 's'} left)`}
    </button>
  );
}

const ACCENT_MAP = {
  fire:  'stat-glow-fire',
  green: 'stat-glow-green',
  gold:  'stat-glow-gold',
};

function StatPill({ label, value, icon, accent }) {
  return (
    <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl px-2 py-2.5 text-center">
      <p className="text-[10px] text-gray-500 uppercase tracking-wide leading-tight">{label}</p>
      <p className={`text-sm font-bold mt-0.5 tabular-nums leading-tight ${accent ? ACCENT_MAP[accent] : 'text-white'}`}>
        {value}{icon ? <span className="ml-0.5">{icon}</span> : null}
      </p>
    </div>
  );
}
