import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import NavHeader from '../components/NavHeader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useMode } from '../contexts/ModeContext.jsx';
import client from '../api/client.js';

const CATEGORY_LABELS = {
  general:    { label: 'General',    icon: '⚡' },
  fitness:    { label: 'Fitness',    icon: '💪' },
  mindset:    { label: 'Mindset',    icon: '🧠' },
  discipline: { label: 'Discipline', icon: '🔥' },
};

export default function BattleDetailPage() {
  const { id } = useParams();
  const { user, entitlements, refreshEntitlements } = useAuth();
  const { mode } = useMode();
  const isShadow = mode === 'SHADOW';
  const navigate = useNavigate();

  const [battle, setBattle]     = useState(null);
  const [progress, setProgress] = useState(null);
  const [proofs, setProofs]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [copied, setCopied]     = useState(false);
  const [completing, setCompleting] = useState(null); // habit_name in flight
  const [acting, setActing]     = useState(false);
  const [verifying, setVerifying] = useState(null); // proof_id being actioned
  const [showForfeitModal, setShowForfeitModal] = useState(false);
  const [forfeiting, setForfeiting] = useState(false);
  const [extending, setExtending] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [bRes, pRes, proofsRes] = await Promise.all([
        client.get(`/battles/${id}`),
        client.get(`/battles/${id}/progress`).catch(() => ({ data: null })),
        client.get(`/battles/${id}/proofs`).catch(() => ({ data: [] })),
      ]);
      setBattle(bRes.data);
      setProgress(pRes.data);
      setProofs(proofsRes.data || []);
    } catch {
      navigate('/battles');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCompleteHabit(habitName) {
    setCompleting(habitName);
    setError('');
    try {
      await client.post(`/battles/${id}/complete-habit`, { habit_name: habitName });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to log habit');
    } finally {
      setCompleting(null);
    }
  }

  async function handleVerifyProof(proofId, verified) {
    setVerifying(proofId);
    setError('');
    try {
      await client.post(`/battles/${id}/verify-proof`, { proof_id: proofId, verified });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to action proof');
    } finally {
      setVerifying(null);
    }
  }

  async function handleForfeit() {
    if (!window.confirm('Forfeit this negotiation? The battle will be cancelled.')) return;
    setActing(true);
    try {
      await client.post('/battles/forfeit', { battle_id: Number(id) });
      navigate('/battles');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to forfeit');
    } finally { setActing(false); }
  }

  async function handleForfeitToken() {
    setForfeiting(true);
    setError('');
    try {
      await client.post(`/battles/${id}/forfeit-token`);
      refreshEntitlements();
      navigate('/battles');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to forfeit');
      setShowForfeitModal(false);
    } finally {
      setForfeiting(false);
    }
  }

  async function handleExtend() {
    setExtending(true);
    setError('');
    try {
      const { data } = await client.post(`/battles/${id}/extend`);
      setBattle(prev => ({ ...prev, ends_at: data.ends_at }));
      refreshEntitlements();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to extend');
    } finally {
      setExtending(false);
    }
  }

  function copyShareLink() {
    const url = `${window.location.origin}/battles/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <NavHeader />
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading battle…</p>
        </div>
      </div>
    );
  }

  if (!battle) return null;

  const isChallenger = battle.challenger_id === user?.id;
  const neg          = battle.negotiation_status;
  const cat          = CATEGORY_LABELS[battle.habit_category];
  const remaining    = battle.ends_at ? Math.max(0, Math.ceil((new Date(battle.ends_at) - Date.now()) / 86400000)) : null;

  const myScore    = isChallenger ? battle.challenger_score : battle.opponent_score;
  const theirScore = isChallenger ? battle.opponent_score  : battle.challenger_score;
  const myName     = isChallenger ? battle.challenger_username : battle.opponent_username;
  const theirName  = isChallenger ? battle.opponent_username  : battle.challenger_username;

  const theirHasWarlordPass = Boolean(isChallenger
    ? battle.opponent_has_warlord_pass
    : battle.challenger_has_warlord_pass);
  const myHasWarlordPass = entitlements.hasWarlordPass;

  const isAwaiting  = battle.status === 'pending' && neg === 'pending';
  const isForfeited = neg === 'forfeited';

  const myProgress    = progress ? (isChallenger ? progress.challenger : progress.opponent) : null;
  const theirProgress = progress ? (isChallenger ? progress.opponent  : progress.challenger) : null;
  const today         = progress?.today;

  return (
    <div className="min-h-screen">
      <NavHeader />
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        <Link to="/battles" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← All Battles
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">{cat?.icon}</span>
              <h1 className={`text-xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
                {cat?.label} · {battle.duration_days}d
              </h1>
            </div>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              vs{' '}
              {theirHasWarlordPass && <span className="flame-flair" style={{ fontSize: '12px' }}>🔥</span>}
              {isChallenger ? battle.opponent_username ?? 'Awaiting opponent' : battle.challenger_username}
            </p>
          </div>
          <button onClick={copyShareLink}
            className="text-xs text-gray-500 hover:text-gray-300 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all shrink-0"
          >
            {copied ? '✓ Copied' : '🔗 Share'}
          </button>
        </div>

        {/* Pending banner */}
        {isAwaiting && (
          <div className="rounded-xl border border-yellow-800/40 bg-yellow-950/20 p-4 space-y-2">
            <p className="text-sm font-semibold text-yellow-300">⏳ Awaiting opponent response</p>
            <p className="text-xs text-gray-500">
              {theirName ?? 'Your opponent'} has 48 hours to accept the gauntlet.
            </p>
            <button onClick={handleForfeit} disabled={acting}
              className="text-xs text-red-500 hover:text-red-400 transition-colors disabled:opacity-50">
              Withdraw challenge
            </button>
          </div>
        )}

        {isForfeited && (
          <div className="rounded-xl border border-red-900/40 bg-red-950/10 p-4">
            <p className="text-sm font-semibold text-red-400">Negotiation forfeited</p>
            <p className="text-xs text-gray-500 mt-1">This battle was cancelled.</p>
          </div>
        )}

        {/* Live scores */}
        {battle.status === 'active' && (
          <div className="rounded-2xl border border-white/[0.08] p-5"
            style={{ background: 'linear-gradient(135deg, rgba(20,10,40,0.8), rgba(10,10,30,0.9))' }}>
            <div className="flex items-end justify-between gap-4 mb-4">
              <div className="text-center flex-1">
                <p className="text-xs text-gray-500 mb-1">{myName} (you)</p>
                <p className={`text-5xl font-black tabular-nums ${isShadow ? 'text-red-400' : 'text-purple-300'} ${myHasWarlordPass ? 'warlord-score-flicker' : ''}`}>
                  {myScore}<span className="text-2xl">%</span>
                </p>
              </div>
              <span className="text-lg text-gray-700 font-black pb-2">VS</span>
              <div className="text-center flex-1">
                <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                  {theirHasWarlordPass && <span className="flame-flair" style={{ fontSize: '11px' }}>🔥</span>}
                  {theirName ?? '?'}
                </p>
                <p className="text-5xl font-black tabular-nums text-gray-400">
                  {theirScore}<span className="text-2xl">%</span>
                </p>
              </div>
            </div>
            <p className="text-xs text-gray-600 text-center">{remaining}d remaining</p>
          </div>
        )}

        {battle.status === 'completed' && (
          <div className="rounded-2xl border border-white/[0.08] p-5 text-center space-y-2"
            style={{ background: 'linear-gradient(135deg, rgba(20,10,40,0.8), rgba(10,10,30,0.9))' }}>
            {battle.winner_id === user?.id ? (
              <>
                <p className="text-4xl">👑</p>
                <p className={`text-xl font-bold ${isShadow ? 'text-red-400' : 'text-purple-300'}`}>You won!</p>
                <p className="text-sm text-gray-500">{myScore}% vs {theirScore}%</p>
              </>
            ) : battle.winner_id ? (
              <>
                <p className="text-4xl">💀</p>
                <p className="text-xl font-bold text-gray-300">You lost</p>
                <p className="text-sm text-gray-500">{myScore}% vs {theirScore}%</p>
              </>
            ) : (
              <>
                <p className="text-4xl">🤝</p>
                <p className="text-xl font-bold text-gray-300">Draw</p>
                <p className="text-sm text-gray-500">{myScore}% vs {theirScore}%</p>
              </>
            )}
          </div>
        )}

        {/* Battle actions — forfeit token + duel extension */}
        {battle.status === 'active' && (
          <div className="flex gap-2 flex-wrap">
            {entitlements.duelExtensions > 0 && remaining !== null && remaining <= 3 && (
              <button
                onClick={handleExtend}
                disabled={extending}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-800/50 text-blue-400 hover:bg-blue-900/20 transition-all disabled:opacity-50"
              >
                {extending ? 'Extending…' : `⏳ Extend +3 Days (${entitlements.duelExtensions} left)`}
              </button>
            )}
            {entitlements.forfeitTokens > 0 && (
              <button
                onClick={() => setShowForfeitModal(true)}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-red-900/50 text-red-500 hover:bg-red-950/20 transition-all"
              >
                🏳️ Forfeit Battle ({entitlements.forfeitTokens} token{entitlements.forfeitTokens !== 1 ? 's' : ''})
              </button>
            )}
          </div>
        )}

        {/* Forfeit token confirmation modal */}
        {showForfeitModal && (
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          >
            <div
              className="w-full max-w-xs rounded-2xl border border-red-900/50 p-6 space-y-4 text-center"
              style={{ background: 'linear-gradient(135deg, rgba(30,10,20,0.98), rgba(10,5,15,0.99))' }}
            >
              <p className="text-4xl">🏳️</p>
              <h2 className="text-lg font-bold text-white">Forfeit Battle?</h2>
              <p className="text-sm text-gray-400 leading-relaxed">
                This will end the battle and count as a loss. One forfeit token will be used.
              </p>
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowForfeitModal(false)}
                  disabled={forfeiting}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForfeitToken}
                  disabled={forfeiting}
                  className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition-all disabled:opacity-50"
                >
                  {forfeiting ? 'Forfeiting…' : 'Confirm Forfeit'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Habit completion — active battles */}
        {battle.status === 'active' && myProgress && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
              {isShadow ? 'Your Sentence' : 'Your Habits'}
            </h2>
            <div className="space-y-2">
              {myProgress.habits.length === 0 ? (
                <p className="text-sm text-gray-600 italic text-center py-3">No habits assigned</p>
              ) : myProgress.habits.map(h => {
                const done = h.completedDates.includes(today);
                const isLoading = completing === h.name;
                return (
                  <button
                    key={h.name}
                    onClick={() => !done && handleCompleteHabit(h.name)}
                    disabled={done || !!completing}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl border transition-all text-left ${
                      done
                        ? isShadow
                          ? 'border-red-800/50 bg-red-950/20 cursor-default'
                          : 'border-green-800/50 bg-green-950/20 cursor-default'
                        : 'border-white/10 hover:border-white/20 active:scale-[0.99]'
                    } ${!!completing && !done ? 'opacity-50' : ''}`}
                  >
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-xs ${
                      done
                        ? isShadow ? 'border-red-500 bg-red-500/30 text-red-300' : 'border-green-500 bg-green-500/30 text-green-300'
                        : 'border-white/20'
                    }`}>
                      {isLoading ? '…' : done ? '✓' : ''}
                    </span>
                    <span className="text-lg">{h.icon}</span>
                    <span className={`flex-1 text-sm ${done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                      {h.name}
                    </span>
                    {done && <span className="text-xs text-gray-600">Done</span>}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Their habits — active battles */}
        {battle.status === 'active' && theirProgress && theirProgress.habits.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
              {isShadow ? 'Their Gauntlet' : 'Their Habits'}
            </h2>
            <div className="space-y-2">
              {theirProgress.habits.map(h => {
                const done = h.completedDates.includes(today);
                return (
                  <div key={h.name}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl border ${
                      done ? 'border-white/10 bg-white/[0.02]' : 'border-white/[0.05]'
                    }`}>
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-xs ${
                      done ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-white/10'
                    }`}>
                      {done ? '✓' : ''}
                    </span>
                    <span className="text-lg">{h.icon}</span>
                    <span className={`flex-1 text-sm ${done ? 'text-gray-400' : 'text-gray-600'}`}>
                      {h.name}
                    </span>
                    {done && <span className="text-xs text-gray-600">✓ today</span>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Pending: show habit assignments */}
        {battle.status === 'pending' && neg === 'pending' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 space-y-2">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">
                {isShadow ? 'Their Sentence' : 'Their Habits'}
              </p>
              {(battle.challengerAssignedDetails ?? []).length > 0 ? (
                <div className="space-y-1.5">
                  {(battle.challengerAssignedDetails ?? []).map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <span>{h.icon}</span><span className="truncate">{h.name}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-600 italic">Not set</p>}
            </div>
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 space-y-2">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest font-semibold">
                {isShadow ? 'Your Sentence' : 'Your Habits'}
              </p>
              {(battle.opponentAssignedDetails ?? []).length > 0 ? (
                <div className="space-y-1.5">
                  {(battle.opponentAssignedDetails ?? []).map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                      <span>{h.icon}</span><span className="truncate">{h.name}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-600 italic">Awaiting opponent</p>}
            </div>
          </div>
        )}

        {/* Proof Feed */}
        {proofs.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-500">
              {isShadow ? 'Evidence Feed' : 'Proof Feed'}
            </h2>
            <div className="space-y-3">
              {proofs.map(proof => {
                const isMe = proof.side === 'me';
                const isPending = !proof.final_verified && !proof.disputed_at && proof.ai_verified !== true;
                const needsMyReview = !isMe && isPending;

                return (
                  <div key={proof.id}
                    className={`rounded-xl border overflow-hidden ${
                      needsMyReview
                        ? 'border-amber-600/50'
                        : proof.final_verified ? 'border-green-900/40' : 'border-white/[0.07]'
                    }`}
                    style={{ background: 'rgba(255,255,255,0.02)' }}>

                    {needsMyReview && (
                      <div className="px-3 py-1.5 flex items-center gap-1.5" style={{ background: 'rgba(180,130,0,0.12)' }}>
                        <span className="text-[10px] font-bold text-amber-300 animate-pulse">● REVIEW REQUIRED</span>
                      </div>
                    )}

                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold text-gray-200">{proof.username}</span>
                          <span className="text-gray-600">·</span>
                          <span className="text-xs text-gray-500 truncate">{proof.habit_name}</span>
                        </div>
                        <span className="text-[10px] text-gray-600 shrink-0">{proof.completed_date}</span>
                      </div>

                      {/* Photo thumbnail */}
                      <a href={proof.photo_url} target="_blank" rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', maxHeight: '180px' }}>
                        <img src={proof.photo_url} alt="Proof" className="w-full h-full object-cover" />
                      </a>

                      {/* AI verdict + opponent actions */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {proof.final_verified ? (
                            <span className="text-[10px] font-bold text-green-400 bg-green-900/30 border border-green-800/40 px-2 py-0.5 rounded-full">✓ Verified</span>
                          ) : proof.disputed_at ? (
                            <span className="text-[10px] font-bold text-red-400 bg-red-900/30 border border-red-800/40 px-2 py-0.5 rounded-full">✗ Disputed</span>
                          ) : proof.ai_verified === true ? (
                            <span className="text-[10px] text-green-400 bg-green-900/20 border border-green-800/30 px-2 py-0.5 rounded-full">🤖 AI: likely</span>
                          ) : proof.ai_verified === false ? (
                            <span className="text-[10px] text-amber-400 bg-amber-900/20 border border-amber-800/30 px-2 py-0.5 rounded-full">🤖 AI: uncertain</span>
                          ) : (
                            <span className="text-[10px] text-gray-600 bg-white/[0.03] border border-white/[0.06] px-2 py-0.5 rounded-full">⏳ Pending</span>
                          )}
                          {proof.ai_reasoning && (
                            <span className="text-[10px] text-gray-600 italic truncate max-w-[140px]">{proof.ai_reasoning}</span>
                          )}
                        </div>

                        {/* Verify / Dispute buttons for opponent on pending proofs */}
                        {needsMyReview && (
                          <div className="flex gap-1.5 shrink-0">
                            <button
                              onClick={() => handleVerifyProof(proof.id, false)}
                              disabled={!!verifying}
                              className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-red-800/50 text-red-400 hover:bg-red-900/20 transition-all disabled:opacity-50"
                            >
                              {isShadow ? '✗ Dispute' : '✗ Fake'}
                            </button>
                            <button
                              onClick={() => handleVerifyProof(proof.id, true)}
                              disabled={!!verifying}
                              className="text-[11px] font-bold px-2.5 py-1 rounded-lg border border-green-800/50 text-green-400 hover:bg-green-900/20 transition-all disabled:opacity-50"
                            >
                              {isShadow ? '✓ Confirm' : '✓ Legit'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      </main>
    </div>
  );
}
