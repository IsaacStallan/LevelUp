import { useEffect, useState } from 'react';
import client from '../api/client.js';
import { useMode } from '../contexts/ModeContext.jsx';
import light from '../copy/light.json';
import shadow from '../copy/shadow.json';

export default function DailyChallenge({ onComplete }) {
  const { mode } = useMode();
  const copy = mode === 'SHADOW' ? shadow : light;

  const [challenge, setChallenge] = useState(null);
  const [completed, setCompleted]   = useState(false);
  const [loading, setLoading]       = useState(true);
  const [busy, setBusy]             = useState(false);

  useEffect(() => {
    client.get('/challenges/today')
      .then(r => {
        setChallenge(r.data.challenge);
        setCompleted(r.data.completed);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleAccept() {
    setBusy(true);
    try {
      await client.post('/challenges/complete');
      setCompleted(true);
      onComplete?.();
    } catch { /* ignore */ } finally {
      setBusy(false);
    }
  }

  if (loading || !challenge) return null;

  return (
    <div className="glass-card rounded-xl border border-amber-700/30 p-4">
      <div className="flex items-start gap-3">
        <div className="text-2xl shrink-0">🎯</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              {copy['challenge.section'] ?? (mode === 'SHADOW' ? 'Daily Protocol' : 'Daily Challenge')}
            </p>
            <span className="text-[10px] font-bold text-amber-300 bg-amber-900/30 border border-amber-700/40 px-2 py-0.5 rounded-full">
              +{challenge.xp_reward} XP
            </span>
          </div>
          <p className="text-sm font-bold text-white leading-tight">{challenge.title}</p>
          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{challenge.description}</p>
        </div>

        <div className="shrink-0">
          {completed ? (
            <div className="text-xs font-bold text-green-400 bg-green-900/30 border border-green-700/40 px-3 py-1.5 rounded-lg whitespace-nowrap">
              {copy['challenge.completed'] ?? (mode === 'SHADOW' ? 'Protocol Complete ✓' : 'Completed ✓')}
            </div>
          ) : (
            <button
              onClick={handleAccept}
              disabled={busy}
              className="text-xs font-bold text-amber-300 bg-amber-900/30 border border-amber-700/40 hover:bg-amber-900/50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
            >
              {busy ? '…' : (copy['challenge.accept'] ?? (mode === 'SHADOW' ? 'Accept Protocol' : 'Accept Challenge'))}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
