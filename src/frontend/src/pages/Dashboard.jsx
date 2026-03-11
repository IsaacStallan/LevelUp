import { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useMode } from '../contexts/ModeContext.jsx';
import LevelUpOverlay from '../components/LevelUpOverlay.jsx';
import StageUpOverlay from '../components/StageUpOverlay.jsx';
import NavHeader from '../components/NavHeader.jsx';
import DailyChallenge from '../components/DailyChallenge.jsx';
import PlayerName from '../components/PlayerName.jsx';
import Avatar from '../components/Avatar.jsx';

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
function IdentityBar({ character, username, level, streak, xpTotal, rank, equippedTitle, isShadow, freezeTokens, onUseFreeze, freezing, hasWarlordPass }) {
  return (
    <div className="space-y-2 py-3 px-1">
      <div className="flex items-center justify-between gap-3">
        {/* Left: avatar + name + level */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar username={username} size={36} hasWarlordPass={hasWarlordPass} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <PlayerName
                name={username}
                hasWarlordPass={hasWarlordPass}
                className="text-sm font-bold truncate max-w-[96px]"
              />
              <span className="text-[10px] bg-purple-900/50 border border-purple-700/50 text-purple-300 px-1.5 py-0.5 rounded-full tabular-nums shrink-0">
                Lv.{level}
              </span>
            </div>
            {equippedTitle && (
              <p className={`text-[10px] leading-tight truncate mt-0.5 ${isShadow ? 'text-yellow-400' : 'text-gray-500'}`}>
                {equippedTitle}
              </p>
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
          <p className="text-sm font-bold text-yellow-300 tabular-nums">⚡{(xpTotal ?? 0).toLocaleString()}</p>
          {rank && <p className="text-[10px] text-gray-500 mt-0.5">#{rank} globally</p>}
        </div>
      </div>

      {/* Freeze token row — only shown when tokens exist */}
      {freezeTokens > 0 && (
        <div className="flex items-center justify-between gap-2 px-0.5">
          <span className="text-[11px] text-blue-300/70 tabular-nums">
            🧊 {freezeTokens} freeze token{freezeTokens !== 1 ? 's' : ''}
          </span>
          <button
            onClick={onUseFreeze}
            disabled={freezing}
            className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 border border-blue-800/50 hover:border-blue-700/60 px-2.5 py-1 rounded-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {freezing ? 'Freezing…' : 'Use Freeze'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── War Room theme helpers ────────────────────────────────────── */
const WAR_ROOM_THEMES = [
  { id: 'crimson', icon: '🔴', label: 'Crimson' },
  { id: 'void',    icon: '⚫', label: 'Void'    },
  { id: 'eclipse', icon: '🟣', label: 'Eclipse' },
  { id: 'inferno', icon: '🟠', label: 'Inferno' },
];

function getWarRoomBg(theme) {
  const bgs = {
    crimson: 'linear-gradient(135deg, rgba(20,0,0,0.55), rgba(10,2,2,0.65))',
    void:    'linear-gradient(135deg, rgba(0,0,2,0.92), rgba(2,2,8,0.96))',
    eclipse: 'linear-gradient(135deg, rgba(8,4,28,0.92), rgba(15,8,45,0.96))',
    inferno: 'linear-gradient(135deg, rgba(30,8,0,0.92), rgba(38,12,0,0.96))',
  };
  return bgs[theme] || bgs.crimson;
}

function WarRoomParticles({ theme }) {
  if (theme === 'void') {
    const particles = [
      { size: 64, top: '15%', left: '8%',  dur: '7s',  delay: '0s',  sx: '12px'  },
      { size: 90, top: '55%', left: '78%', dur: '9.5s', delay: '2.2s', sx: '-8px' },
      { size: 48, top: '75%', left: '42%', dur: '6.5s', delay: '4s',  sx: '6px'  },
    ];
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        {particles.map((p, i) => (
          <div key={i} className="void-smoke" style={{
            width: p.size, height: p.size,
            top: p.top, left: p.left,
            '--dur': p.dur, '--delay': p.delay, '--sx': p.sx,
          }} />
        ))}
      </div>
    );
  }
  if (theme === 'eclipse') {
    const stars = [
      { top: '12%', left: '18%', dur: '2.1s',  delay: '0s'    },
      { top: '28%', left: '72%', dur: '3.4s',  delay: '0.7s'  },
      { top: '55%', left: '33%', dur: '2.8s',  delay: '1.5s'  },
      { top: '78%', left: '62%', dur: '4.1s',  delay: '2.3s'  },
      { top: '45%', left: '86%', dur: '3.0s',  delay: '0.4s'  },
      { top: '22%', left: '52%', dur: '2.4s',  delay: '3.1s'  },
      { top: '68%', left: '14%', dur: '3.8s',  delay: '1.9s'  },
    ];
    return (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        {stars.map((s, i) => (
          <div key={i} className="eclipse-star" style={{
            top: s.top, left: s.left, '--dur': s.dur, '--delay': s.delay,
          }} />
        ))}
      </div>
    );
  }
  return null;
}

/* ─── Battle card (mini) ────────────────────────────────────────────── */
function parseHabitsJson(json) {
  try { return JSON.parse(json || '[]'); } catch { return []; }
}

function BattleMiniCard({ battle, userId, isShadow, className = '' }) {
  const isChallenger = battle.challenger_id === userId;
  const myScore    = isChallenger ? battle.challenger_score : battle.opponent_score;
  const theirScore = isChallenger ? battle.opponent_score  : battle.challenger_score;
  const theirName  = isChallenger ? battle.opponent_username : battle.challenger_username;
  const remaining  = Math.max(0, Math.ceil((new Date(battle.ends_at) - Date.now()) / 86400000));

  const theirHasWarlordPass = Boolean(isChallenger
    ? battle.opponent_has_warlord_pass
    : battle.challenger_has_warlord_pass);
  const myHasWarlordPass = Boolean(isChallenger
    ? battle.challenger_has_warlord_pass
    : battle.opponent_has_warlord_pass);

  // My assigned habits = what the OTHER person wrote for me
  const myHabits = isChallenger
    ? parseHabitsJson(battle.opponent_assigned_habits)
    : parseHabitsJson(battle.challenger_assigned_habits);

  return (
    <div
      className={`rounded-2xl border p-4 space-y-3 ${isShadow ? 'battle-card-glow-crimson' : 'battle-card-glow'} ${theirHasWarlordPass ? 'battle-opponent-warlord' : ''} ${className}`}
      style={{ background: 'linear-gradient(135deg, rgba(20,10,40,0.94), rgba(8,4,20,0.98))' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl battle-icon-pulse select-none">⚔️</span>
        <span className="text-[10px] text-gray-600 tabular-nums">{remaining}d left</span>
      </div>
      <p className="text-xs text-gray-400 truncate flex items-center gap-1">
        vs{' '}
        {theirHasWarlordPass && <span className="flame-flair" style={{ fontSize: '11px' }}>🔥</span>}
        <span className="text-gray-200 font-semibold">{theirName ?? '?'}</span>
      </p>
      <div className="flex items-end justify-between gap-2">
        <div className="text-left">
          <p className={`text-5xl font-black tabular-nums leading-none ${isShadow ? 'text-red-400' : 'text-purple-300'} ${myHasWarlordPass ? 'warlord-score-flicker' : ''}`}>
            {myScore}<span className="text-2xl">%</span>
          </p>
          <p className="text-[10px] text-gray-600 mt-1">you</p>
        </div>
        <div className="text-center pb-6">
          <span className="text-sm text-gray-700 font-black tracking-widest">VS</span>
        </div>
        <div className="text-right">
          <p className="text-5xl font-black tabular-nums text-gray-400 leading-none">
            {theirScore}<span className="text-2xl">%</span>
          </p>
          <p className="text-[10px] text-gray-600 mt-1">them</p>
        </div>
      </div>
      {myHabits.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-white/[0.04]">
          {myHabits.slice(0, 5).map((h, i) => (
            <span key={i} className="flex items-center gap-1 text-[10px] bg-white/[0.04] border border-white/[0.06] rounded-md px-1.5 py-0.5 text-gray-500">
              <span>{h.icon}</span>
              <span className="max-w-[5rem] truncate">{h.name}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Negotiation mini-card ─────────────────────────────────────────── */
function NegotiationMiniCard({ battle, userId, isShadow, onCancel }) {
  const isChallenger = battle.challenger_id === userId;
  const neg = battle.negotiation_status;
  const isCounterReceived = neg === 'countered' && isChallenger;
  const isCounterSent     = neg === 'countered' && !isChallenger;
  const theirName = isChallenger ? battle.opponent_username : battle.challenger_username;
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(isShadow ? 'Withdraw this duel challenge?' : 'Cancel this battle invitation?')) return;
    setCancelling(true);
    try {
      await client.delete(`/battles/${battle.id}/cancel`);
      onCancel();
    } catch { setCancelling(false); }
  }

  return (
    <Link to={`/battles/${battle.id}`} className="block">
      <div
        className={`rounded-xl border p-3 transition-all ${
          isCounterReceived
            ? 'border-amber-600/70 shadow-[0_0_14px_rgba(251,191,36,0.15)] hover:border-amber-500/80'
            : 'border-white/[0.06] hover:border-white/[0.12]'
        }`}
        style={{ background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base">⚔️</span>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-300 truncate">
                vs {theirName || (isChallenger ? 'Awaiting opponent…' : battle.challenger_username)}
              </p>
              <p className="text-[10px] text-gray-600">{battle.duration_days}d · {battle.habit_category}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isCounterReceived ? (
              <span className="text-[10px] font-bold text-amber-300 bg-amber-900/40 border border-amber-700/50 px-2 py-0.5 rounded-full whitespace-nowrap">🔄 RESPOND</span>
            ) : isCounterSent ? (
              <span className="text-[10px] text-gray-500 whitespace-nowrap">⚠️ Counter sent</span>
            ) : (
              <span className="text-[10px] text-gray-600 whitespace-nowrap">⏳ Awaiting</span>
            )}
            {isChallenger && (
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="text-[10px] text-red-500/70 hover:text-red-400 border border-red-900/40 hover:border-red-800/60 px-2 py-0.5 rounded-md transition-all disabled:opacity-40"
              >
                {cancelling ? '…' : isShadow ? 'Withdraw' : 'Cancel'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ─── Battles section ───────────────────────────────────────────────── */
function BattlesSection({ battles, userId, isShadow, onCancelBattle, shadowTheme, onSetTheme }) {
  const { hasWarlordPass } = useAuth();
  const active  = battles.filter(b => b.status === 'active');
  const pending = battles.filter(b => b.status === 'pending');
  const accentClass = isShadow ? 'text-red-500' : 'text-purple-400';
  const hasBattles = active.length > 0 || pending.length > 0;

  const sectionBg = isShadow ? getWarRoomBg(shadowTheme) : 'transparent';

  return (
    <section className="relative rounded-2xl transition-colors duration-500"
      style={{ background: sectionBg, padding: isShadow ? '14px 14px 10px' : '0' }}
    >
      {/* Ambient particles for void / eclipse themes */}
      {isShadow && <WarRoomParticles theme={shadowTheme} />}

      <div className="relative z-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xs font-bold uppercase tracking-widest ${accentClass}`}>
          {isShadow ? 'DUELS' : 'Battles'}
        </h2>
        <div className="flex items-center gap-2">
          {/* Theme picker — shown to all shadow mode users */}
          {isShadow && (
            <div className="flex items-center gap-0.5">
              {WAR_ROOM_THEMES.map(t => {
                const canSelect = hasWarlordPass || t.id === 'crimson';
                return (
                  <button
                    key={t.id}
                    title={canSelect ? t.label : `${t.label} — Warlord Pass required`}
                    onClick={() => canSelect && onSetTheme(t.id)}
                    className={`text-sm leading-none p-1 rounded-md transition-all ${
                      shadowTheme === t.id
                        ? 'bg-white/10 ring-1 ring-white/20 scale-110'
                        : 'opacity-40 hover:opacity-70'
                    } ${!canSelect ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {canSelect ? t.icon : '🔒'}
                  </button>
                );
              })}
            </div>
          )}
          <Link to="/battles" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            View all →
          </Link>
        </div>
      </div>

      {/* Light Mode teaser banner */}
      {!isShadow && (
        <div className="mb-3 rounded-xl border border-purple-800/30 bg-purple-950/20 px-3 py-2.5 flex items-start gap-2">
          <span className="text-base shrink-0 mt-0.5">🌑</span>
          <p className="text-xs text-purple-300/70 leading-relaxed">
            Shadow Mode unlocks Dominion Duels with exclusive battle language and features.{' '}
            <span className="text-purple-300 font-medium">7-day free trial available.</span>
          </p>
        </div>
      )}

      {hasBattles ? (
        <div className="space-y-4">
          {active.length > 0 && (
            <>
              {active.length === 1 ? (
                <BattleMiniCard battle={active[0]} userId={userId} isShadow={isShadow} className="w-full" />
              ) : active.length === 2 ? (
                <div className="grid grid-cols-2 gap-3">
                  {active.map(b => (
                    <BattleMiniCard key={b.id} battle={b} userId={userId} isShadow={isShadow} />
                  ))}
                </div>
              ) : (
                <div className="flex gap-4 overflow-x-auto pb-3 -mx-4 sm:-mx-8 px-4 sm:px-8 scrollbar-none">
                  {active.map(b => (
                    <BattleMiniCard key={b.id} battle={b} userId={userId} isShadow={isShadow} className="flex-shrink-0 w-60" />
                  ))}
                </div>
              )}
            </>
          )}

          {pending.length > 0 && (
            <div className="space-y-2">
              {pending.length > 0 && active.length > 0 && (
                <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">Negotiations</p>
              )}
              {pending.map(b => (
                <NegotiationMiniCard key={b.id} battle={b} userId={userId} isShadow={isShadow} onCancel={onCancelBattle} />
              ))}
            </div>
          )}

          <Link
            to="/battles"
            className={`flex items-center justify-center gap-2 py-2 rounded-xl border text-[11px] font-medium transition-colors ${
              isShadow
                ? 'border-red-900/30 text-red-500 hover:bg-red-950/20'
                : 'border-white/[0.06] text-purple-400 hover:bg-white/[0.03]'
            }`}
          >
            ⚔️ Issue New Duel
          </Link>
        </div>
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
      </div>{/* end relative z-10 */}
    </section>
  );
}

/* ─── Inline habit check row ────────────────────────────────────────── */
function HabitCheckRow({ habit, isShadow, onComplete }) {
  const [done, setDone] = useState(!!habit.completed_today);
  const [busy, setBusy] = useState(false);

  async function handleCheck() {
    if (done || busy) return;
    setDone(true); // optimistic — show checkmark immediately
    setBusy(true);
    const result = await onComplete(habit.id);
    if (!result) setDone(false); // revert on failure
    setBusy(false);
  }

  return (
    <button
      onClick={handleCheck}
      disabled={done || busy}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all ${
        done
          ? isShadow
            ? 'border-red-900/30 bg-red-950/10 cursor-default'
            : 'border-green-900/30 bg-green-950/10 cursor-default'
          : 'border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04] active:scale-[0.99]'
      }`}
    >
      {/* Checkbox */}
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
        done
          ? isShadow ? 'bg-red-700 border-red-600' : 'bg-green-600 border-green-500'
          : 'border-white/20 bg-transparent'
      }`}>
        {done && <svg viewBox="0 0 12 12" width="10" height="10" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        {busy && <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />}
      </div>

      {/* Icon + name */}
      <span className="text-base shrink-0 select-none">{habit.icon}</span>
      <span className={`text-sm font-medium truncate flex-1 ${done ? 'line-through opacity-50' : 'text-gray-200'}`}>
        {habit.name}
      </span>

      {/* Done badge */}
      {done && (
        <span className={`text-[10px] font-bold shrink-0 ${isShadow ? 'text-red-400' : 'text-green-400'}`}>
          {isShadow ? '✓ Done' : '✓'}
        </span>
      )}
    </button>
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
        <div className="space-y-1.5">
          {habits.filter(h => !h.completed_today).map(h => (
            <HabitCheckRow
              key={h.id}
              habit={h}
              isShadow={isShadow}
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
  const { user, updateUser, userStats, refreshStats, entitlements } = useAuth();
  const { mode, theme: shadowTheme, setTheme: handleSetTheme } = useMode();
  const isShadow = mode === 'SHADOW';
  const navigate = useNavigate();

  const [habits, setHabits] = useState([]);
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [xpFlash, setXpFlash] = useState(false);
  const [levelUp, setLevelUp] = useState(null);
  const [stageUp, setStageUp] = useState(null);
  const [toast, setToast]     = useState(null);
  const [freezing, setFreezing] = useState(false);
  const toastTimer            = useRef(null);
  const prevLevelRef = useRef(null);
  const xpFlashTimer = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [habitsRes, battlesRes] = await Promise.all([
        client.get('/habits'),
        client.get('/battles/mine').catch(() => ({ data: [] })),
      ]);
      setHabits(habitsRes.data);
      setBattles(battlesRes.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function showToast(msg) {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  // Seed prevLevelRef once userStats are loaded so we don't fire false level-ups
  useEffect(() => {
    if (prevLevelRef.current === null && userStats.level > 0) {
      prevLevelRef.current = userStats.level;
    }
  }, [userStats.level]);

  async function handleComplete(habitId) {
    // Optimistic update — mark complete immediately so the row disappears at once
    setHabits(prev => prev.map(h => h.id === habitId ? { ...h, completed_today: 1 } : h));

    try {
      const { data } = await client.post(`/habits/${habitId}/complete`);
      updateUser({ level: data.level });

      const prevLevel  = prevLevelRef.current ?? userStats.level;
      const didLevelUp = data.level > prevLevel;
      const prevChar   = getCharacter(prevLevel);
      const newChar    = getCharacter(data.level);
      const didStageUp = didLevelUp && prevChar.title !== newChar.title;

      prevLevelRef.current = data.level;
      refreshStats(); // single source of truth — updates level, xp, streak everywhere

      if (didLevelUp) {
        setTimeout(() => {
          setXpFlash(true);
          clearTimeout(xpFlashTimer.current);
          xpFlashTimer.current = setTimeout(() => setXpFlash(false), 1400);
          setTimeout(() => {
            if (didStageUp) setStageUp({ newStage: newChar, newLevel: data.level });
            else setLevelUp({ newLevel: data.level, character: newChar });
          }, 200);
        }, 600);
      }
      return data;
    } catch {
      // Revert optimistic update and notify user
      setHabits(prev => prev.map(h => h.id === habitId ? { ...h, completed_today: 0 } : h));
      showToast('Failed to save — tap to retry');
      return null;
    }
  }

  async function handleUseFreeze() {
    if (freezing) return;
    setFreezing(true);
    try {
      await client.post('/streaks/freeze');
      refreshStats(); // updates freezeTokens + streak in context
      showToast('🧊 Streak frozen for today!');
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to use freeze token');
    } finally {
      setFreezing(false);
    }
  }

  // Show victory bonus toast once after a duel win
  useEffect(() => {
    if (userStats.pendingVictoryBonus > 0) {
      setToast(`👑 Victory Bonus: +${userStats.pendingVictoryBonus} XP`);
      clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(null), 4500);
    }
  }, [userStats.pendingVictoryBonus]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentLevel = userStats.level || user?.level || 1;
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

      <NavHeader />

      {/* Error toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 pointer-events-none"
          style={{ transform: 'translateX(-50%)', animation: 'fadeInUp 150ms ease' }}>
          <div className={`bg-gray-900 text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg whitespace-nowrap ${
            toast?.startsWith('👑')
              ? 'border border-yellow-600/60 text-yellow-300'
              : 'border border-red-800/60 text-red-400'
          }`}>
            {toast}
          </div>
        </div>
      )}

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
              streak={userStats.streak}
              xpTotal={userStats.xp}
              rank={userStats.rank}
              equippedTitle={userStats.title}
              isShadow={isShadow}
              freezeTokens={userStats.freezeTokens}
              onUseFreeze={handleUseFreeze}
              freezing={freezing}
              hasWarlordPass={entitlements.hasWarlordPass}
            />

            {/* 2. Active Battles — hero section */}
            <BattlesSection battles={battles} userId={user?.id} isShadow={isShadow} onCancelBattle={fetchData} shadowTheme={shadowTheme} onSetTheme={handleSetTheme} />

            {/* 3. Today's Mission */}
            <MissionSection habits={habits} onComplete={handleComplete} isShadow={isShadow} />

            {/* 4. Standing */}
            <StandingSection rank={userStats.rank} onChallengeComplete={fetchData} isShadow={isShadow} />
          </>
        )}
      </main>
    </div>
  );
}
