import { useEffect, useRef } from 'react';

const CONFETTI_COLORS = ['#7c3aed', '#a855f7', '#f59e0b', '#fde68a', '#ec4899', '#06b6d4', '#ffffff'];

// Pre-generate deterministic confetti so it's stable across renders
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: `${(i * 3.7 + (i % 3) * 7.3) % 100}%`,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  width:  6 + (i % 4) * 3,
  height: 6 + (i % 3) * 4,
  borderRadius: i % 3 === 0 ? '50%' : '2px',
  dur:   `${1.6 + (i % 6) * 0.28}s`,
  delay: `${(i % 9) * 0.09}s`,
  rot:   `${200 + i * 23}deg`,
}));

export default function LevelUpOverlay({ show, newLevel, character, onDismiss }) {
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (!show) return;
    dismissedRef.current = false;
    const t = setTimeout(() => {
      if (!dismissedRef.current) onDismiss();
    }, 4200);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

  if (!show) return null;

  function handleClick() {
    dismissedRef.current = true;
    onDismiss();
  }

  return (
    <>
      {/* Confetti layer — outside overlay so it shows over everything */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 60 }}>
        {CONFETTI.map(c => (
          <div
            key={c.id}
            className="anim-confetti"
            style={{
              left: c.left,
              width: c.width + 'px',
              height: c.height + 'px',
              backgroundColor: c.color,
              borderRadius: c.borderRadius,
              '--dur': c.dur,
              '--delay': c.delay,
              '--rot': c.rot,
            }}
          />
        ))}
      </div>

      {/* Main overlay */}
      <div
        className="fixed inset-0 flex flex-col items-center justify-center cursor-pointer anim-levelup-overlay select-none"
        style={{ backgroundColor: 'rgba(2, 1, 10, 0.88)', zIndex: 50 }}
        onClick={handleClick}
      >
        {/* Banner — slides in from top */}
        <div className="anim-banner-slide mb-10 px-8 py-3 rounded-full border border-purple-400/70 bg-purple-600/80 backdrop-blur-sm">
          <p className="text-white font-black text-base sm:text-lg tracking-[0.2em] uppercase">
            ⚡ Level {newLevel} Unlocked
          </p>
        </div>

        {/* Character with spotlight */}
        <div className="anim-char-levelup anim-spotlight text-[96px] sm:text-[120px] leading-none mb-4">
          {character.emoji}
        </div>

        {/* Level number slam-in */}
        <div className="anim-level-pop text-center mt-2">
          <p className="text-xs text-purple-400 uppercase tracking-[0.3em] mb-1">You reached</p>
          <p
            className="font-black leading-none text-white"
            style={{
              fontSize: 'clamp(80px, 22vw, 120px)',
              textShadow: '0 0 60px rgba(168,85,247,0.9), 0 0 120px rgba(168,85,247,0.4)',
            }}
          >
            {newLevel}
          </p>
          <p className="text-purple-300 font-bold text-xl mt-2 tracking-wide">{character.title}</p>
        </div>

        <p className="text-gray-600 text-sm mt-10 animate-pulse">Tap to continue</p>
      </div>
    </>
  );
}
