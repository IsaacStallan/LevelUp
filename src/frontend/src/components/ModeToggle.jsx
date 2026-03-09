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
      style={isShadow
        ? { boxShadow: '0 0 10px rgba(239,68,68,0.5), 0 0 4px rgba(239,68,68,0.3)' }
        : { boxShadow: '0 0 8px rgba(168,85,247,0.3)' }
      }
      className={`
        text-xs font-semibold px-2.5 py-1 rounded-full border transition-all select-none whitespace-nowrap
        ${transitioning
          ? 'opacity-60 cursor-not-allowed border-gray-600 bg-gray-900 text-gray-400'
          : isShadow
            ? 'bg-red-950/60 border-red-600/60 text-red-300 hover:bg-red-900/60 hover:text-red-200'
            : 'bg-purple-950/60 border-purple-600/60 text-purple-300 hover:bg-purple-900/60 hover:text-purple-200'
        }
      `}
    >
      {transitioning ? '⚡' : isShadow ? 'Shadow Mode ✓' : 'Try Shadow Mode →'}
    </button>
  );
}
