import { useMode } from '../contexts/ModeContext.jsx';
import { useCRTTransition } from '../hooks/useCRTTransition.js';

export default function ModeToggle() {
  const { mode, switchMode } = useMode();
  const { triggerTransition, transitioning } = useCRTTransition();

  function handleClick() {
    const next = mode === 'LIGHT' ? 'SHADOW' : 'LIGHT';
    triggerTransition(next, () => switchMode(next));
  }

  const isShadow = mode === 'SHADOW';

  return (
    <button
      onClick={handleClick}
      disabled={transitioning}
      aria-label={`Switch to ${isShadow ? 'Light' : 'Shadow'} mode`}
      style={isShadow ? { boxShadow: '0 0 10px #00F5FF' } : undefined}
      className={`
        text-[11px] font-bold px-3 py-1.5 rounded-full border transition-all select-none
        ${transitioning
          ? 'opacity-60 cursor-not-allowed border-gray-600 bg-gray-900 text-gray-400'
          : isShadow
            ? 'bg-gray-950 border-cyan-400/70 text-cyan-300 hover:border-cyan-300 hover:text-cyan-200'
            : 'bg-purple-950/60 border-purple-600/60 text-purple-300 hover:bg-purple-900/60 hover:text-purple-200'
        }
      `}
    >
      {transitioning ? '⚡' : isShadow ? '☀️ Light' : '⚔️ Shadow'}
    </button>
  );
}
