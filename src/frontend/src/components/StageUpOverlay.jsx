import { useEffect, useRef } from 'react';

// Gold/white confetti for stage-up ceremony
const STAGE_CONFETTI_COLORS = ['#f59e0b', '#fde68a', '#fbbf24', '#ffffff', '#fcd34d', '#fffbeb', '#d97706'];

const CONFETTI = Array.from({ length: 32 }, (_, i) => ({
  id: i,
  left: `${(i * 3.2 + (i % 5) * 5.1) % 100}%`,
  color: STAGE_CONFETTI_COLORS[i % STAGE_CONFETTI_COLORS.length],
  width:  5 + (i % 5) * 3,
  height: 5 + (i % 4) * 4,
  borderRadius: i % 4 === 0 ? '50%' : i % 4 === 1 ? '2px' : '1px 4px',
  dur:   `${1.5 + (i % 7) * 0.22}s`,
  delay: `${(i % 10) * 0.07}s`,
  rot:   `${160 + i * 31}deg`,
}));

export default function StageUpOverlay({ show, newStage, newLevel, onDismiss }) {
  const dismissedRef = useRef(false);

  useEffect(() => {
    if (!show) return;
    dismissedRef.current = false;
    const t = setTimeout(() => {
      if (!dismissedRef.current) onDismiss();
    }, 4800);
    return () => clearTimeout(t);
  }, [show, onDismiss]);

  if (!show) return null;

  function handleClick() {
    dismissedRef.current = true;
    onDismiss();
  }

  return (
    <>
      {/* Gold confetti — above overlay */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 70 }}>
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
              zIndex: 70,
            }}
          />
        ))}
      </div>

      {/* Main overlay */}
      <div
        className="fixed inset-0 flex flex-col items-center justify-center cursor-pointer anim-levelup-overlay select-none"
        style={{ backgroundColor: 'rgba(1, 0, 6, 0.93)', zIndex: 65 }}
        onClick={handleClick}
      >
        {/* Top label */}
        <p
          className="anim-banner-slide text-xs font-bold tracking-[0.4em] uppercase mb-8"
          style={{ color: '#f59e0b' }}
        >
          Your Journey Continues
        </p>

        {/* Character emoji — gold spotlight */}
        <div className="anim-char-levelup anim-spotlight-gold text-[100px] sm:text-[130px] leading-none mb-6">
          {newStage.emoji}
        </div>

        {/* "YOU ARE NOW" */}
        <p className="text-gray-400 text-xs tracking-[0.35em] uppercase mb-3">
          You are now a
        </p>

        {/* Stage name — dramatic letter-spacing reveal */}
        <div className="anim-stage-title text-center px-4">
          <p
            className="font-black uppercase leading-none tracking-[0.08em]"
            style={{
              fontSize: 'clamp(52px, 14vw, 88px)',
              background: 'linear-gradient(135deg, #d97706, #fde68a, #f59e0b, #fbbf24)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 30px rgba(251,191,36,0.6))',
            }}
          >
            {newStage.title}
          </p>
        </div>

        {/* Bottom banner slides up */}
        <div
          className="anim-banner-up mt-10 px-6 py-2.5 rounded-full border"
          style={{ borderColor: 'rgba(251,191,36,0.5)', backgroundColor: 'rgba(251,191,36,0.1)' }}
        >
          <p className="font-semibold text-sm tracking-wide" style={{ color: '#fde68a' }}>
            ✨ {newStage.title} — Level {newLevel}
          </p>
        </div>

        <p className="text-gray-600 text-xs mt-8 animate-pulse">Tap to continue</p>
      </div>
    </>
  );
}
