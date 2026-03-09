import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useMode } from '../contexts/ModeContext.jsx';
import client from '../api/client.js';

const EMOJI_OPTIONS = ['💪', '🧊', '📚', '🏃', '🥗', '💧', '🧘', '😤'];
const HABIT_PLACEHOLDERS = [
  'Wake up at 6am',
  'No social media before noon',
  'Cold shower every morning',
  '10 minutes of reading',
  '30-minute walk',
];

const CATEGORY_LABELS = {
  general:    { label: 'General',    icon: '⚡' },
  fitness:    { label: 'Fitness',    icon: '💪' },
  mindset:    { label: 'Mindset',    icon: '🧠' },
  discipline: { label: 'Discipline', icon: '🔥' },
};

export default function BattleAcceptPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { isAuthenticated } = useAuth();
  const { mode } = useMode();
  const isShadow = mode === 'SHADOW';
  const navigate = useNavigate();

  const [battle, setBattle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Steps: 'preview' | 'write-own' | 'confirm' | 'accepted'
  const [step, setStep] = useState('preview');
  const [customHabits, setCustomHabits] = useState([
    { name: '', icon: '💪' },
    { name: '', icon: '💪' },
    { name: '', icon: '💪' },
  ]);
  const [pickerIdx, setPickerIdx] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setError('Invalid invite link — no token found.'); setLoading(false); return; }
    client.get(`/battles/accept?token=${token}`)
      .then(({ data }) => setBattle(data))
      .catch((err) => setError(err.response?.data?.error || 'Battle not found or link is invalid.'))
      .finally(() => setLoading(false));
  }, [token]);

  function handleProceed() {
    if (!isAuthenticated) { navigate(`/register?battle=${token}`); return; }
    setStep('write-own');
  }

  function updateHabitName(idx, val) {
    setCustomHabits(prev => prev.map((h, i) => i === idx ? { ...h, name: val } : h));
  }

  function updateHabitIcon(idx, icon) {
    setCustomHabits(prev => prev.map((h, i) => i === idx ? { ...h, icon } : h));
    setPickerIdx(null);
  }

  function addHabit() {
    if (customHabits.length >= 5) return;
    setCustomHabits(prev => [...prev, { name: '', icon: '💪' }]);
  }

  function removeHabit(idx) {
    if (customHabits.length <= 1) return;
    setCustomHabits(prev => prev.filter((_, i) => i !== idx));
    setPickerIdx(null);
  }

  async function handleConfirm() {
    const validHabits = customHabits.filter(h => h.name.trim());
    setSubmitting(true);
    setError('');
    try {
      await client.post('/battles/accept-assigned', {
        token,
        opponent_assigned_habits: validHabits,
      });
      setStep('accepted');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start the battle');
    } finally {
      setSubmitting(false);
    }
  }

  const cat = battle ? CATEGORY_LABELS[battle.habit_category] : null;
  const deadline = battle?.negotiation_deadline ? new Date(battle.negotiation_deadline) : null;
  const hoursLeft = deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 3600000)) : 48;
  const challengerHabits = battle?.challengerAssignedDetails ?? [];
  const validHabits = customHabits.filter(h => h.name.trim());
  const canProceed = validHabits.length >= 1 && validHabits.length <= 5;

  const cardStyle = { background: 'linear-gradient(135deg, rgba(20,10,40,0.95) 0%, rgba(10,5,25,0.98) 100%)', backdropFilter: 'blur(16px)' };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">

        <div className="text-center">
          <Link to="/" className={`text-2xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
            🔥 Vivify
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading…</div>

        ) : error && step === 'preview' ? (
          <div className="rounded-2xl border border-red-800/40 bg-red-950/30 p-6 text-center space-y-3">
            <p className="text-4xl">⚠️</p>
            <p className="text-red-400 font-medium">{error}</p>
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-300">Go home</Link>
          </div>

        ) : battle && battle.status !== 'pending' ? (
          <div className="rounded-2xl border border-white/[0.08] p-6 text-center space-y-3"
            style={{ background: 'rgba(20,10,40,0.8)' }}>
            <p className="text-4xl">🔒</p>
            <p className="text-gray-300 font-medium">This challenge has already been accepted.</p>
            <Link to="/battles" className="text-sm text-purple-400 hover:text-purple-300">View my battles</Link>
          </div>

        ) : step === 'accepted' ? (
          <div className="rounded-2xl border border-white/[0.1] p-6 text-center space-y-4" style={cardStyle}>
            <p className="text-4xl">{isShadow ? '⚔️' : '🎉'}</p>
            <h1 className={`text-xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
              {isShadow ? 'Duel Active!' : 'Battle Started!'}
            </h1>
            <p className="text-sm text-gray-400">
              {isShadow ? 'The gauntlets are set. Dominate.' : 'The challenge is on. Complete your daily habits to win.'}
            </p>
            <button onClick={() => navigate('/battles')}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                isShadow ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'
              }`}
            >View My Battles</button>
          </div>

        ) : step === 'write-own' ? (
          /* Step 2: Write custom habits for challenger */
          <div className="rounded-2xl border border-white/[0.1] p-6 space-y-5" style={cardStyle}>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Step 2 of 3</p>
              <h1 className={`text-xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
                {isShadow ? '🗡️ Write Their Sentence' : '✏️ Assign Their Habits'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {isShadow
                  ? `Return the favour. Write ${battle.challenger_username}'s sentence.`
                  : `Now assign habits to ${battle.challenger_username}.`}
              </p>
            </div>

            <div className="space-y-3">
              {customHabits.map((h, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPickerIdx(pickerIdx === idx ? null : idx)}
                      className="w-10 h-10 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] flex items-center justify-center text-lg transition-all shrink-0"
                    >
                      {h.icon}
                    </button>
                    {pickerIdx === idx && (
                      <div className="absolute left-0 top-full mt-1 z-10 rounded-xl border border-white/10 p-2 grid grid-cols-4 gap-1"
                        style={{ background: 'rgba(10,5,25,0.98)', backdropFilter: 'blur(20px)' }}>
                        {EMOJI_OPTIONS.map(e => (
                          <button key={e} type="button" onClick={() => updateHabitIcon(idx, e)}
                            className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-base transition-all">
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="text"
                    value={h.name}
                    onChange={e => updateHabitName(idx, e.target.value)}
                    placeholder={HABIT_PLACEHOLDERS[idx % HABIT_PLACEHOLDERS.length]}
                    maxLength={100}
                    className="flex-1 h-10 px-3 rounded-xl border border-white/10 bg-white/[0.03] text-sm text-gray-200 placeholder-gray-700 focus:outline-none focus:border-white/20"
                  />
                  {customHabits.length > 1 && (
                    <button type="button" onClick={() => removeHabit(idx)}
                      className="w-8 h-8 rounded-lg text-gray-600 hover:text-red-400 hover:bg-red-900/20 flex items-center justify-center text-lg transition-all shrink-0">
                      ×
                    </button>
                  )}
                </div>
              ))}

              {customHabits.length < 5 && (
                <button type="button" onClick={addHabit}
                  className="w-full h-9 rounded-xl border border-dashed border-white/10 text-xs text-gray-600 hover:border-white/20 hover:text-gray-400 transition-all">
                  + Add another
                </button>
              )}
            </div>

            <p className={`text-xs text-center ${validHabits.length === 0 ? 'text-gray-600' : canProceed ? 'text-green-500' : 'text-red-400'}`}>
              {validHabits.length === 0 ? 'Write at least 1 habit' : `${validHabits.length}/5 habit${validHabits.length !== 1 ? 's' : ''}`}
            </p>

            <div className="flex gap-3">
              <button onClick={() => setStep('preview')} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-all">← Back</button>
              <button onClick={() => setStep('confirm')} disabled={!canProceed}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60 ${
                  isShadow ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'
                }`}
              >Review →</button>
            </div>
          </div>

        ) : step === 'confirm' ? (
          /* Step 3: Confirm both sides */
          <div className="rounded-2xl border border-white/[0.1] p-6 space-y-5" style={cardStyle}>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">Step 3 of 3</p>
              <h1 className={`text-xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
                {isShadow ? '⚔️ Confirm the Duel' : '✅ Review & Start'}
              </h1>
              <p className="text-sm text-gray-500 mt-1">These habits will be locked in once you confirm.</p>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">
                  {isShadow ? 'Your Sentence' : 'Your Habits'}{' '}
                  <span className="normal-case text-gray-700">({battle.challenger_username} assigned)</span>
                </p>
                {challengerHabits.length > 0 ? (
                  <div className="space-y-1">
                    {challengerHabits.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-gray-200">
                        <span>{h.icon}</span><span>{h.name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600 italic">No habits assigned</p>
                )}
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">
                  {isShadow ? 'Their Sentence' : 'Their Habits'}{' '}
                  <span className="normal-case text-gray-700">(you assigned)</span>
                </p>
                <div className="space-y-1">
                  {validHabits.map((h, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-200">
                      <span>{h.icon}</span><span>{h.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-xs text-red-400 text-center">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => setStep('write-own')} className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-all">← Back</button>
              <button onClick={handleConfirm} disabled={submitting}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60 ${
                  isShadow ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'
                }`}
              >{submitting ? 'Starting…' : isShadow ? '⚔️ Lock In & Fight' : 'Start Battle ✓'}</button>
            </div>
          </div>

        ) : (
          /* Step 1: Preview — show challenger's assigned habits */
          <div className="rounded-2xl border border-white/[0.1] p-6 space-y-5" style={cardStyle}>
            <div className="text-center space-y-1">
              <p className="text-4xl">{cat?.icon}</p>
              <h1 className={`text-xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
                {isShadow ? 'A DUEL HAS BEEN ISSUED' : "You've been challenged!"}
              </h1>
              <p className="text-sm text-gray-500">
                <span className="text-gray-300 font-semibold">{battle?.challenger_username}</span>{' '}
                challenges you to a {battle?.duration_days}-day habit gauntlet
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Category</span>
                <span className="text-gray-200">{cat?.icon} {cat?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span className="text-gray-200">{battle?.duration_days} days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expires</span>
                <span className="text-amber-400">{hoursLeft}h remaining</span>
              </div>
            </div>

            {challengerHabits.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">
                  {isShadow
                    ? `${battle?.challenger_username} has written your sentence:`
                    : `${battle?.challenger_username} has assigned your habits:`}
                </p>
                <div className="space-y-1.5">
                  {challengerHabits.map((h, i) => (
                    <div key={i} className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <span className="text-base">{h.icon}</span>
                      <span className="text-sm text-gray-200">{h.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 text-center leading-relaxed">
              {isShadow
                ? "You'll write their sentence in return. The dominant score wins."
                : "You'll assign habits back to them. Highest completion % wins."}
            </p>

            <button onClick={handleProceed}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${
                isShadow ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-purple-700 hover:bg-purple-600 text-white'
              }`}
            >
              {isAuthenticated
                ? isShadow ? 'Return the Favour ⚔️' : 'Accept & Assign Habits'
                : isShadow ? 'SIGN UP & ACCEPT' : 'Sign up & Accept'}
            </button>

            {!isAuthenticated && (
              <p className="text-center text-xs text-gray-600">
                Already have an account?{' '}
                <Link to={`/login?battle=${token}`} className="text-purple-400 hover:text-purple-300">Sign in</Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
