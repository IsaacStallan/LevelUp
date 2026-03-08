import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useMode } from '../contexts/ModeContext.jsx';
import HabitCard from '../components/HabitCard.jsx';
import LevelUpOverlay from '../components/LevelUpOverlay.jsx';
import StageUpOverlay from '../components/StageUpOverlay.jsx';
import NavHeader from '../components/NavHeader.jsx';
import DailyChallenge from '../components/DailyChallenge.jsx';

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

/* ─── Identity Bar ─────────────────────────────────────────────────── */
function IdentityBar({ character, username, level, streak, xpTotal, rank, equippedTitle }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 px-1">
      {/* Left: character + name + level */}
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-3xl leading-none select-none">{character.emoji}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-white truncate max-w-[96px]">{username}</span>
            <span className="text-[10px] bg-purple-900/50 border border-purple-700/50 text-purple-300 px-1.5 py-0.5 rounded-full tabular-nums shrink-0">
              Lv.{level}
            </span>
          </div>
          {equippedTitle && (
            <p className="text-[10px] text-yellow-400 leading-tight truncate mt-0.5">{equippedTitle}</p>
          )}
        </div>
      </div>

      {/* Center: streak — glowing amber pill */}
      <div
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full shrink-0 streak-pill"
        style={{
          background: 'rgba(251,146,60,0.12)',
          border: '1px solid rgba(251,146,60,0.35)',
          boxShadow: streak > 0 ? '0 0 12px rgba(251,146,60,0.25), 0 0 4px rgba(251,146,60,0.1)' : 'none',
        }}
      >
        <span className="text-base leading-none">🔥</span>
        <span className="text-sm font-black text-amber-300 tabular-nums">{streak}</span>
        <span className="text-[11px] font-semibold text-amber-500/80">
          {streak === 1 ? 'day' : 'day streak'}
        </span>
      </div>

      {/* Right: XP + rank */}
      <div className="text-right shrink-0">
        <p className="text-sm font-bold text-yellow-300 tabular-nums">⚡{xpTotal.toLocaleString()}</p>
        {rank && <p className="text-[10px] text-gray-500 mt-0.5">#{rank} globally</p>}
      </div>
    </div>
  );
}

/* ─── Battle card (mini) ────────────────────────────────────────────── */
function BattleMiniCard({ battle, userId, isShadow }) {
  const isChallenger = battle.challenger_id === userId;
  const myScore    = isChallenger ? battle.challenger_score : battle.opponent_score;
  const theirScore = isChallenger ? battle.opponent_score  : battle.challenger_score;
  const theirName  = isChallenger ? battle.opponent_username : battle.challenger_username;
  const remaining  = Math.max(0, Math.ceil((new Date(battle.ends_at) - Date.now()) / 86400000));

  return (
    <div
      className={`flex-shrink-0 w-60 rounded-2xl border p-4 space-y-3 ${isShadow ? 'battle-card-glow-crimson' : 'battle-card-glow'}`}
      style={{ background: 'linear-gradient(135deg, rgba(20,10,40,0.94), rgba(8,4,20,0.98))' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl battle-icon-pulse select-none">⚔️</span>
        <span className="text-[10px] text-gray-600 tabular-nums">{remaining}d left</span>
      </div>
      <p className="text-xs text-gray-400 truncate">vs <span className="text-gray-200 font-semibold">{theirName ?? '?'}</span></p>
      <div className="flex items-end justify-between gap-2">
        <div className="text-left">
          <p className={`text-4xl font-black tabular-nums leading-none ${isShadow ? 'text-red-400' : 'text-purple-300'}`}>
            {myScore}<span className="text-xl">%</span>
          </p>
          <p className="text-[10px] text-gray-600 mt-1">you</p>
        </div>
        <div className="text-center pb-5">
          <span className="text-xs text-gray-700 font-black tracking-widest">VS</span>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black tabular-nums text-gray-400 leading-none">
            {theirScore}<span className="text-xl">%</span>
          </p>
          <p className="text-[10px] text-gray-600 mt-1">them</p>
        </div>
      </div>
    </div>
  );
}

/* ─── Battles section ───────────────────────────────────────────────── */
function BattlesSection({ battles, userId, isShadow }) {
  const active = battles.filter(b => b.status === 'active');
  const accentClass = isShadow ? 'text-red-500' : 'text-purple-400';

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xs font-bold uppercase tracking-widest ${accentClass}`}>
          {isShadow ? 'ACTIVE DUELS' : 'Active Battles'}
        </h2>
        <Link to="/battles" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
          View all →
        </Link>
      </div>

      {active.length > 0 ? (
        <>
          <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 sm:-mx-8 px-4 sm:px-8 scrollbar-none">
            {active.map(b => (
              <BattleMiniCard key={b.id} battle={b} userId={userId} isShadow={isShadow} />
            ))}
          </div>
          <Link
            to="/battles"
            className={`mt-2.5 flex items-center justify-center gap-2 py-2 rounded-xl border text-[11px] font-medium transition-colors ${
              isShadow
                ? 'border-red-900/30 text-red-500 hover:bg-red-950/20'
                : 'border-white/[0.06] text-purple-400 hover:bg-white/[0.03]'
            }`}
          >
            ⚔️ Issue New Duel
          </Link>
        </>
      ) : (
        <div
          className={`rounded-2xl border p-6 text-center space-y-3 ${
            isShadow ? 'border-red-900/30' : 'border-white/[0.06]'
          }`}
          style={{ background: isShadow ? 'rgba(20,0,0,0.4)' : 'rgba(255,255,255,0.015)' }}
        >
          <p className="text-3xl select-none">⚔️</p>
          <p className={`text-sm font-semibold ${isShadow ? 'text-red-400' : 'text-gray-300'}`}>
            {isShadow ? 'NO ACTIVE DUELS. FIND AN OPPONENT.' : 'No active battles yet.'}
          </p>
          <Link
            to="/battles"
            className={`inline-block px-6 py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95 ${
              isShadow ? 'duel-cta-crimson' : 'duel-cta-purple'
            }`}
          >
            {isShadow ? '⚔️ FIND AN OPPONENT' : '⚔️ Issue Duel'}
          </Link>
        </div>
      )}
    </section>
  );
}

/* ─── Mission section ───────────────────────────────────────────────── */
function MissionSection({ habits, onComplete, isShadow }) {
  const total     = habits.length;
  const completed = habits.filter(h => h.completed_today).length;
  const allDone   = total > 0 && completed === total;
  const progress  = total > 0 ? Math.round((completed / total) * 100) : 0;
  const accentClass = isShadow ? 'text-red-500' : 'text-purple-400';

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className={`text-xs font-bold uppercase tracking-widest ${accentClass}`}>
            {isShadow ? 'DAILY PROTOCOL' : "Today's Mission"}
          </h2>
          {total > 0 && (
            <span className="text-xs text-gray-600 tabular-nums">{completed}/{total}</span>
          )}
        </div>
        <Link to="/habits" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
          Manage →
        </Link>
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1 rounded-full bg-white/[0.05] mb-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              allDone ? 'bg-green-500' : isShadow ? 'bg-red-600' : 'bg-purple-600'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {allDone ? (
        <div
          className={`rounded-xl border p-4 text-center ${
            isShadow ? 'border-red-900/30 bg-red-950/10' : 'border-green-900/30 bg-green-950/10'
          }`}
        >
          <p className={`font-bold text-sm ${isShadow ? 'text-red-400' : 'text-green-400'}`}>
            {isShadow ? '⚔️ DOMINION MAINTAINED' : '✅ MISSION COMPLETE'}
          </p>
        </div>
      ) : total === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.07] p-6 text-center">
          <p className="text-gray-500 text-sm mb-3">No habits tracked yet</p>
          <Link to="/habits" className="text-sm text-purple-400 hover:text-purple-300">
            Add your first →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {habits.map(h => (
            <HabitCard
              key={h.id}
              habit={h}
              completedToday={!!h.completed_today}
              onComplete={onComplete}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─── Standing section ──────────────────────────────────────────────── */
function StandingSection({ rank, onChallengeComplete, isShadow }) {
  const accentClass = isShadow ? 'text-red-500' : 'text-purple-400';
  return (
    <section>
      <h2 className={`text-xs font-bold uppercase tracking-widest mb-4 ${accentClass}`}>
        Standing
      </h2>
      <div className="grid grid-cols-2 gap-3 items-start">
        {/* Rank card */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 text-center">
          <p className="text-[9px] text-gray-600 uppercase tracking-widest mb-1.5">Global Rank</p>
          {rank ? (
            <p className={`text-3xl font-black tabular-nums ${isShadow ? 'text-red-400' : 'text-white'}`}>
              #{rank}
            </p>
          ) : (
            <p className="text-2xl text-gray-700">—</p>
          )}
          <Link to="/leaderboard" className="text-[9px] text-gray-600 hover:text-gray-400 mt-1 block transition-colors">
            View board →
          </Link>
        </div>

        {/* Daily challenge */}
        <DailyChallenge onComplete={onChallengeComplete} />
      </div>
    </section>
  );
}

/* ─── Main page ─────────────────────────────────────────────────────── */
export default function Dashboard() {
  const { user, updateUser } = useAuth();
  const { mode } = useMode();
  const isShadow = mode === 'SHADOW';
  const navigate = useNavigate();

  const [stats, setStats]   = useState(null);
  const [habits, setHabits] = useState([]);
  const [battles, setBattles] = useState([]);
  const [rank, setRank]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [xpFlash, setXpFlash] = useState(false);
  const [levelUp, setLevelUp] = useState(null);
  const [stageUp, setStageUp] = useState(null);
  const prevLevelRef = useRef(null);
  const xpFlashTimer = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, habitsRes, battlesRes, lbRes] = await Promise.all([
        client.get('/gamification/stats'),
        client.get('/habits'),
        client.get('/battles/mine').catch(() => ({ data: [] })),
        client.get('/leaderboard').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      prevLevelRef.current = statsRes.data.level;
      setHabits(habitsRes.data);
      setBattles(battlesRes.data);
      setRank(lbRes.data.find(e => e.isCurrentUser)?.rank ?? null);
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
            if (didStageUp) setStageUp({ newStage: newChar, newLevel: data.level });
            else setLevelUp({ newLevel: data.level, character: newChar });
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
      <LevelUpOverlay
        show={!!levelUp}
        newLevel={levelUp?.newLevel ?? 1}
        character={levelUp?.character ?? character}
        onDismiss={() => setLevelUp(null)}
      />
      <StageUpOverlay
        show={!!stageUp}
        newStage={stageUp?.newStage ?? character}
        newLevel={stageUp?.newLevel ?? 1}
        onDismiss={() => setStageUp(null)}
      />

      <NavHeader level={currentLevel} />

      {/* Drift dots */}
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden z-0">
        {[
          { size: 3, top: '18%', left: '8%',  dur: '14s', delay: '0s'   },
          { size: 2, top: '55%', left: '15%', dur: '18s', delay: '3s'   },
          { size: 4, top: '30%', left: '88%', dur: '12s', delay: '1.5s' },
          { size: 2, top: '72%', left: '78%', dur: '20s', delay: '5s'   },
          { size: 3, top: '85%', left: '40%', dur: '16s', delay: '2s'   },
          { size: 2, top: '12%', left: '60%', dur: '22s', delay: '7s'   },
        ].map((d, i) => (
          <div key={i} className="drift-dot" style={{
            width: d.size + 'px', height: d.size + 'px',
            top: d.top, left: d.left, '--dur': d.dur, '--delay': d.delay,
          }} />
        ))}
      </div>

      <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-8 py-5 sm:py-8 space-y-8">
        {loading ? (
          <div className="space-y-4">
            <div className="skeleton rounded-xl h-10" />
            <div className="skeleton rounded-2xl h-40" />
            <div className="skeleton rounded-xl h-14" />
            <div className="skeleton rounded-xl h-14" />
          </div>
        ) : (
          <>
            {/* 1. Player Identity Bar */}
            <IdentityBar
              character={character}
              username={user?.username ?? ''}
              level={currentLevel}
              streak={stats?.current_streak ?? 0}
              xpTotal={stats?.xp_total ?? 0}
              rank={rank}
              equippedTitle={stats?.equipped_title}
            />

            {/* 2. Active Battles — hero section */}
            <BattlesSection battles={battles} userId={user?.id} isShadow={isShadow} />

            {/* 3. Today's Mission */}
            <MissionSection habits={habits} onComplete={handleComplete} isShadow={isShadow} />

            {/* 4. Standing */}
            <StandingSection rank={rank} onChallengeComplete={fetchData} isShadow={isShadow} />
          </>
        )}
      </main>
    </div>
  );
}
