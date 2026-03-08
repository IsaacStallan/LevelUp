import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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

function StatusBadge({ status, winner_id, userId }) {
  if (status === 'pending') {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-900/40 border border-yellow-700/50 text-yellow-300">Pending</span>;
  }
  if (status === 'active') {
    return <span className="px-2 py-0.5 rounded-full text-xs bg-green-900/40 border border-green-700/50 text-green-300">Active</span>;
  }
  if (status === 'completed') {
    if (!winner_id) return <span className="px-2 py-0.5 rounded-full text-xs bg-gray-800 border border-gray-700 text-gray-400">Draw</span>;
    if (winner_id === userId) return <span className="px-2 py-0.5 rounded-full text-xs bg-purple-900/60 border border-purple-600 text-purple-200">👑 Won</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs bg-red-900/40 border border-red-800/60 text-red-400">Lost</span>;
  }
  return null;
}

function BattleCard({ battle, userId, isShadow }) {
  const isChallenger = battle.challenger_id === userId;
  const myScore = isChallenger ? battle.challenger_score : battle.opponent_score;
  const theirScore = isChallenger ? battle.opponent_score : battle.challenger_score;
  const myName = isChallenger ? battle.challenger_username : battle.opponent_username;
  const theirName = isChallenger ? battle.opponent_username : battle.challenger_username;
  const remaining = daysRemaining(battle.ends_at);
  const elapsed = daysElapsed(battle.starts_at, battle.duration_days);
  const progress = Math.round((elapsed / battle.duration_days) * 100);
  const cat = CATEGORIES.find(c => c.value === battle.habit_category);
  const isWinner = battle.winner_id === userId;

  return (
    <div className="rounded-2xl border border-white/[0.08] p-4 space-y-3"
      style={{ background: 'linear-gradient(135deg, rgba(20,10,40,0.8) 0%, rgba(10,10,30,0.9) 100%)', backdropFilter: 'blur(12px)' }}>

      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-500 flex items-center gap-1">
          {cat?.icon} {cat?.label} · {battle.duration_days}d
        </span>
        <StatusBadge status={battle.status} winner_id={battle.winner_id} userId={userId} />
      </div>

      {/* VS scoreboard */}
      <div className="flex items-center gap-3">
        {/* My side */}
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-500 truncate mb-1">{myName} {isWinner && battle.status === 'completed' ? '👑' : '(you)'}</p>
          <p className={`text-3xl font-bold tabular-nums ${isShadow ? 'text-red-400' : 'text-purple-300'}`}>{myScore}%</p>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center shrink-0">
          <span className={`text-sm font-black tracking-widest ${isShadow ? 'text-red-600' : 'text-gray-600'}`}>VS</span>
        </div>

        {/* Their side */}
        <div className="flex-1 text-center">
          <p className="text-xs text-gray-500 truncate mb-1">
            {theirName || (battle.status === 'pending' ? 'Awaiting…' : '?')}
            {battle.winner_id === (isChallenger ? battle.opponent_id : battle.challenger_id) && battle.status === 'completed' ? ' 👑' : ''}
          </p>
          <p className="text-3xl font-bold tabular-nums text-gray-400">{theirScore}%</p>
        </div>
      </div>

      {/* Progress bar */}
      {battle.status !== 'pending' && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isShadow ? 'bg-red-600' : 'bg-purple-600'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-600 text-right">
            {battle.status === 'active' ? `${remaining}d remaining` : 'Finished'}
          </p>
        </div>
      )}

      {battle.status === 'pending' && (
        <p className="text-xs text-gray-500 text-center">Waiting for opponent to accept</p>
      )}
    </div>
  );
}

function CreateBattleModal({ onClose, onCreated, isShadow }) {
  const [category, setCategory] = useState('general');
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setLoading(true);
    try {
      const { data } = await client.post('/battles/create', { habit_category: category, duration_days: duration });
      setResult(data);
    } catch (err) {
      console.error(err);
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
    ? `DOMINION DUEL issued. Submit or be broken: ${result?.invite_link}`
    : `I'm challenging you to a ${duration}-day habit duel on Vivify. Accept if you dare: ${result?.invite_link}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-2xl border border-white/[0.1] p-6 space-y-5"
        style={{ background: 'rgba(12,8,30,0.97)' }}>

        {!result ? (
          <>
            <h2 className={`text-xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
              {isShadow ? '⚔️ Issue a Duel' : '⚔️ Create a Battle'}
            </h2>

            <div className="space-y-2">
              <p className="text-sm text-gray-400">{isShadow ? 'Arena' : 'Habit Category'}</p>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(c => (
                  <button
                    key={c.value}
                    onClick={() => setCategory(c.value)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium border transition-all text-left ${
                      category === c.value
                        ? isShadow
                          ? 'border-red-600 bg-red-900/30 text-red-300'
                          : 'border-purple-600 bg-purple-900/30 text-purple-300'
                        : 'border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-400">Duration</p>
              <div className="flex gap-2">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                      duration === d
                        ? isShadow
                          ? 'border-red-600 bg-red-900/30 text-red-300'
                          : 'border-purple-600 bg-purple-900/30 text-purple-300'
                        : 'border-white/10 text-gray-400 hover:border-white/20'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={loading}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 ${
                  isShadow ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'
                }`}
              >
                {loading ? 'Creating…' : isShadow ? 'Issue Duel' : 'Create Battle'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className={`text-xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
              {isShadow ? '⚔️ Duel Issued' : '⚔️ Battle Created!'}
            </h2>

            <p className="text-sm text-gray-400">
              {isShadow ? 'Send this to your target.' : 'Share this link to challenge a friend.'}
            </p>

            <div className={`rounded-xl p-3 border text-xs break-all font-mono text-gray-300 ${isShadow ? 'bg-red-950/30 border-red-800/40' : 'bg-purple-950/30 border-purple-800/40'}`}>
              {result.invite_link}
            </div>

            <div className="text-xs text-gray-500 italic leading-relaxed">
              "{shareText}"
            </div>

            <div className="flex gap-3">
              <button
                onClick={copyLink}
                className={`flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                  copied
                    ? 'bg-green-700 text-white'
                    : isShadow
                      ? 'bg-red-700 hover:bg-red-600 text-white'
                      : 'bg-purple-700 hover:bg-purple-600 text-white'
                }`}
              >
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
              <button
                onClick={() => { onCreated(); onClose(); }}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-all"
              >
                Done
              </button>
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

  const level = Math.min(Math.floor(xpTotal / 100), 100);
  const active = battles.filter(b => b.status === 'active');
  const pending = battles.filter(b => b.status === 'pending');
  const past = battles.filter(b => b.status === 'completed');

  return (
    <div className="min-h-screen">
      <NavHeader level={level} />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
              {isShadow ? 'DOMINION DUELS' : '⚔️ Battles'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {isShadow ? 'Crush your enemies over 30 days.' : 'Challenge friends to a 30-day habit duel.'}
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
              isShadow ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'
            }`}
          >
            {isShadow ? '⚔️ Issue Duel' : '+ Create Battle'}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading…</div>
        ) : battles.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.06] p-8 text-center space-y-3"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-4xl">⚔️</p>
            <p className="text-gray-300 font-medium">
              {isShadow ? 'No duels yet. Issue the first.' : 'No battles yet.'}
            </p>
            <p className="text-sm text-gray-500">
              {isShadow
                ? 'Create a duel and send the link to your target.'
                : 'Create a battle and send the link to a friend to challenge them.'}
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
            {pending.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Pending</h2>
                {pending.map(b => <BattleCard key={b.id} battle={b} userId={user?.id} isShadow={isShadow} />)}
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
