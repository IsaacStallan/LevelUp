import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NavHeader from '../components/NavHeader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useMode } from '../contexts/ModeContext.jsx';
import client from '../api/client.js';

const CATEGORIES = [
  { value: 'general',    label: 'General',     icon: '⚡' },
  { value: 'fitness',    label: 'Fitness',      icon: '💪' },
  { value: 'mindset',    label: 'Mindset',      icon: '🧠' },
  { value: 'discipline', label: 'Discipline',   icon: '🔥' },
];
const DURATIONS = [7, 14, 30];
const EMOJI_OPTIONS = ['💪', '🧊', '📚', '🏃', '🥗', '💧', '🧘', '😤'];
const HABIT_PLACEHOLDERS = [
  '100 pushups before breakfast',
  'No phone until noon',
  'Cold shower every morning',
  '10 minutes of reading',
  '30-minute walk',
];

function parseHabitsJson(json) {
  try { return JSON.parse(json || '[]'); } catch { return []; }
}

function daysRemaining(ends_at) {
  if (!ends_at) return null;
  const diff = new Date(ends_at) - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function daysElapsed(starts_at, duration_days) {
  if (!starts_at) return 0;
  const elapsed = Math.floor((Date.now() - new Date(starts_at)) / 86400000);
  return Math.min(elapsed, duration_days);
}

function NegStatusBadge({ battle, userId }) {
  const isChallenger = battle.challenger_id === userId;
  const neg = battle.negotiation_status;
  const status = battle.status;
  if (status === 'completed') {
    if (neg === 'forfeited') return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 border border-gray-700 text-gray-500">Forfeited</span>;
    if (!battle.winner_id) return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 border border-gray-700 text-gray-400">Draw</span>;
    if (battle.winner_id === userId) return <span className="px-2 py-0.5 rounded-full text-xs bg-purple-900/60 border border-purple-600 text-purple-200">👑 Won</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs bg-red-900/40 border border-red-800/60 text-red-400">Lost</span>;
  }
  if (status === 'active') return <span className="px-2 py-0.5 rounded-full text-xs bg-green-900/40 border border-green-700/50 text-green-300">Active</span>;
  if (neg === 'countered' && isChallenger)
    return <span className="px-2 py-0.5 rounded-full text-xs bg-amber-900/50 border border-amber-600 text-amber-300">🔄 Counter received</span>;
  if (neg === 'countered' && !isChallenger)
    return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 border border-gray-700 text-gray-400">⚠️ Counter sent</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-900/40 border border-yellow-700/50 text-yellow-300">⏳ Awaiting</span>;
}

function BattleCard({ battle, userId, isShadow }) {
  const isChallenger = battle.challenger_id === userId;
  const myScore    = isChallenger ? battle.challenger_score : battle.opponent_score;
  const theirScore = isChallenger ? battle.opponent_score   : battle.challenger_score;
  const myName     = isChallenger ? battle.challenger_username : battle.opponent_username;
  const theirName  = isChallenger ? battle.opponent_username   : battle.challenger_username;
  const remaining  = daysRemaining(battle.ends_at);
  const elapsed    = daysElapsed(battle.starts_at, battle.duration_days);
  const progress   = Math.round((elapsed / battle.duration_days) * 100);
  const cat        = CATEGORIES.find(c => c.value === battle.habit_category);

  const isCounterReceived = battle.status === 'pending' && battle.negotiation_status === 'countered' && isChallenger;
  const isCounterSent     = battle.status === 'pending' && battle.negotiation_status === 'countered' && !isChallenger;
  const isAwaiting        = battle.status === 'pending' && battle.negotiation_status === 'pending';

  // Custom habits the challenger wrote for opponent (what they must do)
  const gauntletForThem = parseHabitsJson(isChallenger
    ? battle.challenger_assigned_habits
    : battle.opponent_assigned_habits);
  const gauntletForThemIcons = gauntletForThem
    .map(h => typeof h === 'object' ? h.icon : null)
    .filter(Boolean);

  const borderClass = isCounterReceived
    ? 'border-amber-600/70 shadow-[0_0_18px_rgba(251,191,36,0.18)]'
    : 'border-white/[0.08]';

  return (
    <Link to={`/battles/${battle.id}`} className="block">
      <div
        className={`rounded-2xl border p-4 space-y-3 transition-all hover:border-white/20 ${borderClass}`}
        style={{ background: 'linear-gradient(135deg, rgba(20,10,40,0.8) 0%, rgba(10,10,30,0.9) 100%)', backdropFilter: 'blur(12px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            {cat?.icon} {cat?.label} · {battle.duration_days}d
          </span>
          <NegStatusBadge battle={battle} userId={userId} />
        </div>

        {/* Negotiation banners */}
        {isCounterReceived && (
          <div className="rounded-lg bg-amber-900/20 border border-amber-700/40 px-3 py-2 text-center">
            <p className="text-xs font-semibold text-amber-300">🔄 Counter proposal received</p>
            <p className="text-[10px] text-amber-500 mt-0.5">Tap to view and respond</p>
          </div>
        )}
        {isCounterSent && (
          <p className="text-xs text-gray-500 text-center">⚠️ Counter sent — awaiting their response</p>
        )}
        {isAwaiting && (
          <p className="text-xs text-gray-500 text-center">⏳ Awaiting opponent to accept the gauntlet</p>
        )}

        {/* VS scoreboard (only for active/completed) */}
        {battle.status !== 'pending' && (
          <div className="flex items-center gap-3">
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-500 truncate mb-1">
                {myName} {battle.winner_id === userId && battle.status === 'completed' ? '👑' : '(you)'}
              </p>
              <p className={`text-3xl font-bold tabular-nums ${isShadow ? 'text-red-400' : 'text-purple-300'}`}>{myScore}%</p>
            </div>
            <span className={`text-sm font-black tracking-widest ${isShadow ? 'text-red-600' : 'text-gray-600'}`}>VS</span>
            <div className="flex-1 text-center">
              <p className="text-xs text-gray-500 truncate mb-1">
                {theirName || '?'}
                {battle.winner_id === (isChallenger ? battle.opponent_id : battle.challenger_id) && battle.status === 'completed' ? ' 👑' : ''}
              </p>
              <p className="text-3xl font-bold tabular-nums text-gray-400">{theirScore}%</p>
            </div>
          </div>
        )}

        {/* Gauntlet habit icons */}
        {gauntletForThemIcons.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-gray-600 uppercase tracking-widest">Their gauntlet</span>
            <div className="flex gap-0.5">
              {gauntletForThemIcons.map((icon, i) => <span key={i} className="text-xs">{icon}</span>)}
            </div>
          </div>
        )}

        {/* Progress bar */}
        {battle.status === 'active' && (
          <div className="space-y-1">
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isShadow ? 'bg-red-600' : 'bg-purple-600'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-600 text-right">{remaining}d remaining</p>
          </div>
        )}

        {battle.status === 'completed' && (
          <p className="text-[10px] text-gray-600 text-right">Finished</p>
        )}
      </div>
    </Link>
  );
}

/* ── CreateBattleModal — 2 steps: category+duration → write habits ────── */
function CreateBattleModal({ onClose, onCreated, isShadow }) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('general');
  const [duration, setDuration] = useState(30);
  const [customHabits, setCustomHabits] = useState([
    { name: '', icon: '💪' },
    { name: '', icon: '💧' },
    { name: '', icon: '📚' },
  ]);
  const [pickerIdx, setPickerIdx] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  function updateHabit(idx, field, val) {
    setCustomHabits(prev => prev.map((h, i) => i === idx ? { ...h, [field]: val } : h));
  }
  function addHabit() {
    if (customHabits.length < 5) setCustomHabits(prev => [...prev, { name: '', icon: '💪' }]);
  }
  function removeHabit(idx) {
    if (customHabits.length > 1) setCustomHabits(prev => prev.filter((_, i) => i !== idx));
  }

  const validHabits = customHabits.filter(h => h.name.trim().length > 0);

  async function handleCreate() {
    if (validHabits.length === 0) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await client.post('/battles/create', {
        habit_category: category,
        duration_days: duration,
        challenger_assigned_habits: validHabits,
      });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create battle');
    } finally {
      setLoading(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(result.invite_link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const shareText = isShadow
    ? `Their sentence is written. 48 hours to accept: ${result?.invite_link}`
    : `I've set your daily habits. Accept the challenge: ${result?.invite_link}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] p-6 space-y-5 max-h-[92vh] overflow-y-auto"
        style={{ background: 'rgba(12,8,30,0.97)' }}>

        {/* Step 1: Category + Duration */}
        {!result && step === 1 && (
          <>
            <div>
              <h2 className={`text-xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
                {isShadow ? '⚔️ Issue a Duel' : '⚔️ Create a Battle'}
              </h2>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mt-1">Step 1 of 2</p>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-400">{isShadow ? 'Arena' : 'Category'}</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(c => (
                  <button key={c.value} onClick={() => setCategory(c.value)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                      category === c.value
                        ? isShadow ? 'border-red-600 bg-red-900/30 text-red-300' : 'border-purple-600 bg-purple-900/30 text-purple-300'
                        : 'border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >{c.icon} {c.label}</button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-400">Duration</p>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button key={d} onClick={() => setDuration(d)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      duration === d
                        ? isShadow ? 'border-red-600 bg-red-900/30 text-red-300' : 'border-purple-600 bg-purple-900/30 text-purple-300'
                        : 'border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >{d}d</button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-all">Cancel</button>
              <button onClick={() => setStep(2)}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  isShadow ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'
                }`}
              >Next →</button>
            </div>
          </>
        )}

        {/* Step 2: Write custom habits for opponent */}
        {!result && step === 2 && (
          <>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Step 2 of 2</p>
              <h2 className={`text-xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
                {isShadow ? '🗡️ Write Their Punishment' : '🎯 Set Their Habits'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isShadow ? 'Write their punishment. Make it brutal.' : 'Choose habits for your opponent to complete each day.'}
              </p>
            </div>

            <div className="space-y-2.5">
              {customHabits.map((h, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {/* Emoji picker */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setPickerIdx(pickerIdx === idx ? null : idx)}
                      className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-xl hover:border-white/25 transition-all"
                    >{h.icon}</button>
                    {pickerIdx === idx && (
                      <div className="absolute left-0 top-full mt-1 p-1.5 rounded-xl border border-white/10 z-10 grid grid-cols-4 gap-1"
                        style={{ background: 'rgba(15,8,35,0.98)' }}>
                        {EMOJI_OPTIONS.map(e => (
                          <button key={e}
                            onClick={() => { updateHabit(idx, 'icon', e); setPickerIdx(null); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-lg transition-colors"
                          >{e}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Text input */}
                  <input
                    type="text"
                    value={h.name}
                    onChange={e => updateHabit(idx, 'name', e.target.value)}
                    placeholder={HABIT_PLACEHOLDERS[idx % HABIT_PLACEHOLDERS.length]}
                    maxLength={120}
                    className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-white/25 transition-all"
                  />
                  {/* Remove */}
                  {customHabits.length > 1 && (
                    <button onClick={() => removeHabit(idx)}
                      className="w-7 h-7 flex items-center justify-center text-gray-700 hover:text-red-500 transition-colors shrink-0 text-lg">×</button>
                  )}
                </div>
              ))}
            </div>

            {customHabits.length < 5 && (
              <button onClick={addHabit}
                className="w-full py-2 text-sm text-gray-600 hover:text-gray-400 border border-dashed border-white/[0.07] rounded-xl transition-all">
                + Add another
              </button>
            )}

            <p className={`text-xs text-center ${validHabits.length === 0 ? 'text-gray-600' : 'text-green-500'}`}>
              {validHabits.length} habit{validHabits.length !== 1 ? 's' : ''} written
            </p>

            {error && <p className="text-xs text-red-400 text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-all">← Back</button>
              <button onClick={handleCreate} disabled={loading || validHabits.length === 0}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 ${
                  isShadow ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'
                }`}
              >{loading ? 'Creating…' : isShadow ? '⚔️ Issue Duel' : '🔗 Generate Link'}</button>
            </div>
          </>
        )}

        {/* Result: Invite Link */}
        {result && (
          <>
            <h2 className={`text-xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
              {isShadow ? '⚔️ Duel Issued!' : '⚔️ Challenge Created!'}
            </h2>
            <p className="text-sm text-gray-400">
              {isShadow ? "Their sentence is written. They have 48 hours to accept and write yours back." : 'Share this link. Your opponent has 48 hours to respond.'}
            </p>
            <div className={`rounded-xl p-3 border text-xs break-all font-mono text-gray-300 ${isShadow ? 'bg-red-950/30 border-red-800/40' : 'bg-purple-950/30 border-purple-800/40'}`}>
              {result.invite_link}
            </div>
            <div className="text-xs text-gray-500 italic leading-relaxed">"{shareText}"</div>
            <div className="flex gap-3">
              <button onClick={copyLink}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  copied ? 'bg-green-700 text-white'
                  : isShadow ? 'bg-red-700 hover:bg-red-600 text-white'
                  : 'bg-purple-700 hover:bg-purple-600 text-white'
                }`}
              >{copied ? '✓ Copied!' : 'Copy Link'}</button>
              <button onClick={() => { onCreated(); onClose(); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-all"
              >Done</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BattlesPage() {
  const { user } = useAuth();
  const { mode } = useMode();
  const isShadow = mode === 'SHADOW';
  const navigate = useNavigate();

  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [xpTotal, setXpTotal] = useState(0);

  const fetchBattles = useCallback(async () => {
    try {
      const { data } = await client.get('/battles/mine');
      setBattles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBattles();
    client.get('/gamification/stats').then(({ data }) => setXpTotal(data.xp_total || 0)).catch(() => {});
  }, [fetchBattles]);

  const level   = Math.min(Math.floor(xpTotal / 100), 100);
  const active  = battles.filter(b => b.status === 'active');
  const pending = battles.filter(b => b.status === 'pending');
  const past    = battles.filter(b => b.status === 'completed');

  // Sort pending: counter-received first
  const sortedPending = [...pending].sort((a, b) => {
    const aIsCounter = a.negotiation_status === 'countered' && a.challenger_id === user?.id;
    const bIsCounter = b.negotiation_status === 'countered' && b.challenger_id === user?.id;
    return (bIsCounter ? 1 : 0) - (aIsCounter ? 1 : 0);
  });

  return (
    <div className="min-h-screen">
      <NavHeader level={level} />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
              {isShadow ? 'DOMINION DUELS' : '⚔️ Battles'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isShadow ? 'Assign punishments. Crush opposition.' : 'Challenge friends to a habit gauntlet.'}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
              isShadow ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >{isShadow ? '⚔️ Issue Duel' : '+ Create Battle'}</button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading…</div>
        ) : battles.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] p-8 text-center space-y-3"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-4xl">⚔️</p>
            <p className="text-gray-300 font-medium">{isShadow ? 'No duels yet. Issue the first.' : 'No battles yet.'}</p>
            <p className="text-sm text-gray-500">
              {isShadow ? 'Create a duel and assign their punishment.' : 'Create a battle and send the invite link to a friend.'}
            </p>
          </div>
        ) : (
          <>
            {active.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Active</h2>
                {active.map(b => <BattleCard key={b.id} battle={b} userId={user?.id} isShadow={isShadow} />)}
              </section>
            )}
            {sortedPending.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Negotiations</h2>
                {sortedPending.map(b => <BattleCard key={b.id} battle={b} userId={user?.id} isShadow={isShadow} />)}
              </section>
            )}
            {past.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Past</h2>
                {past.map(b => <BattleCard key={b.id} battle={b} userId={user?.id} isShadow={isShadow} />)}
              </section>
            )}
          </>
        )}
      </main>

      {showCreate && (
        <CreateBattleModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchBattles}
          isShadow={isShadow}
        />
      )}
    </div>
  );
}
