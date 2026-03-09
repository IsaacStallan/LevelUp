import { useEffect, useState } from 'react';
import client from '../api/client.js';
import { useMode } from '../contexts/ModeContext.jsx';
import light from '../copy/light.json';
import shadow from '../copy/shadow.json';

export default function DailyChallenge({ onComplete }) {
  const { mode } = useMode();
  const isShadow = mode === 'SHADOW';
  const copy = isShadow ? shadow : light;

  const [challenge, setChallenge] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading]     = useState(true);
  const [busy, setBusy]           = useState(false);
  const [celebrate, setCelebrate] = useState(false);

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
      if (isShadow) {
        setCelebrate(true);
        setTimeout(() => setCelebrate(false), 900);
      }
      onComplete?.();
    } catch { /* ignore */ } finally {
      setBusy(false);
    }
  }

  if (loading || !challenge) return null;

  return (
    <div className="relative glass-card rounded-xl border border-amber-700/30 p-3 space-y-2 min-h-[112px] overflow-hidden">
      {/* Shadow celebration flash */}
      {celebrate && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-xl pointer-events-none"
          style={{
            background: 'rgba(220,38,38,0.18)',
            animation: 'crimsonFlash 0.9s ease-out forwards',
          }}
        >
          <p className="text-[10px] font-black text-red-300 uppercase tracking-widest">Protocol Complete</p>
        </div>
      )}

      {/* Row 1: label + action button */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1 min-w-0">
          <span className="text-sm shrink-0">🎯</span>
          <p className="text-[9px] font-bold text-amber-400 uppercase tracking-widest truncate">
            {copy['challenge.section']}
          </p>
        </div>
        <div className="shrink-0">
          {completed ? (
            <div className={`text-[9px] font-bold px-2 py-1 rounded-lg whitespace-nowrap ${
              isShadow ? 'text-red-300 bg-red-900/30 border border-red-700/40' : 'text-green-400 bg-green-900/30 border border-green-700/40'
            }`}>
              {copy['challenge.completed']}
            </div>
          ) : (
            <button
              onClick={handleAccept}
              disabled={busy}
              className="text-[9px] font-bold text-amber-300 bg-amber-900/30 border border-amber-700/40 hover:bg-amber-900/50 px-2 py-1 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
            >
              {busy ? '…' : copy['challenge.accept']}
            </button>
          )}
        </div>
      </div>

      {/* Row 2: challenge title */}
      <p className="text-xs font-bold text-white leading-tight">{challenge.title}</p>

      {/* Row 3: description + XP badge */}
      <div className="flex items-end justify-between gap-2">
        <p className="text-[10px] text-gray-400 leading-relaxed line-clamp-2 flex-1">{challenge.description}</p>
        <span className="text-[9px] font-bold text-amber-300 bg-amber-900/30 border border-amber-700/40 px-1.5 py-0.5 rounded-full shrink-0 whitespace-nowrap">
          +{challenge.xp_reward} XP
        </span>
      </div>
    </div>
  );
}
