import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useMode } from '../contexts/ModeContext.jsx';
import client from '../api/client.js';

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
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    client.get(`/battles/accept?token=${token}`)
      .then(({ data }) => setBattle(data))
      .catch(() => setError('Battle not found or link is invalid.'))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAccept() {
    if (!isAuthenticated) {
      navigate(`/register?battle=${token}`);
      return;
    }
    setAccepting(true);
    setError('');
    try {
      await client.post('/battles/accept', { token });
      navigate('/battles');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept battle');
      setAccepting(false);
    }
  }

  const cat = battle ? CATEGORY_LABELS[battle.habit_category] : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Logo */}
        <div className="text-center">
          <Link to="/" className={`text-2xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
            🔥 Vivify
          </Link>
        </div>

        {loading ? (
          <div className="text-center text-gray-500 py-8">Loading challenge…</div>
        ) : error ? (
          <div className="rounded-2xl border border-red-800/40 bg-red-950/30 p-6 text-center space-y-3">
            <p className="text-4xl">⚠️</p>
            <p className="text-red-400 font-medium">{error}</p>
            <Link to="/" className="text-sm text-gray-500 hover:text-gray-300">Go home</Link>
          </div>
        ) : battle?.status !== 'pending' ? (
          <div className="rounded-2xl border border-white/[0.08] p-6 text-center space-y-3"
            style={{ background: 'rgba(20,10,40,0.8)' }}>
            <p className="text-4xl">🔒</p>
            <p className="text-gray-300 font-medium">This battle has already been accepted.</p>
            <Link to="/battles" className="text-sm text-purple-400 hover:text-purple-300">View my battles</Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/[0.1] p-6 space-y-5"
            style={{ background: 'linear-gradient(135deg, rgba(20,10,40,0.95) 0%, rgba(10,5,25,0.98) 100%)', backdropFilter: 'blur(16px)' }}>

            {/* Challenge header */}
            <div className="text-center space-y-1">
              <p className="text-4xl">{cat?.icon}</p>
              <h1 className={`text-xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
                {isShadow ? 'DOMINION DUEL' : 'You\'ve been challenged!'}
              </h1>
            </div>

            {/* Details */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Challenger</span>
                <span className="text-white font-semibold">{battle.challenger_username}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Category</span>
                <span className="text-gray-200">{cat?.icon} {cat?.label}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Duration</span>
                <span className="text-gray-200">{battle.duration_days} days</span>
              </div>
            </div>

            <p className="text-xs text-gray-500 text-center leading-relaxed">
              {isShadow
                ? 'Complete habits every day to rack up points. The dominant player wins.'
                : 'Complete habits every day to earn points. Highest score after the battle period wins.'}
            </p>

            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-400 text-sm rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              onClick={handleAccept}
              disabled={accepting}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-60 ${
                isShadow
                  ? 'bg-red-700 hover:bg-red-600 text-white'
                  : 'bg-purple-700 hover:bg-purple-600 text-white'
              }`}
            >
              {accepting
                ? 'Accepting…'
                : isAuthenticated
                  ? isShadow ? 'EXECUTE' : 'Accept the Challenge'
                  : isShadow ? 'SUBMIT OR BE BROKEN' : 'Sign up & Accept'}
            </button>

            {!isAuthenticated && (
              <p className="text-center text-xs text-gray-600">
                Already have an account?{' '}
                <Link to={`/login?battle=${token}`} className="text-purple-400 hover:text-purple-300">
                  Sign in
                </Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
