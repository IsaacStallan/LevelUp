import { useState } from 'react';
import { useMode } from '../contexts/ModeContext.jsx';
import light from '../copy/light.json';
import shadow from '../copy/shadow.json';

export default function ModeToggle() {
  const { mode, toggleMode } = useMode();
  const [flashing, setFlashing] = useState(false);

  const label = mode === 'SHADOW' ? shadow['mode.toggle'] : light['mode.toggle'];

  function handleClick() {
    setFlashing(true);
    setTimeout(() => {
      toggleMode();
      setFlashing(false);
    }, 180);
  }

  return (
    <>
      {flashing && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: mode === 'LIGHT' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.06)',
            pointerEvents: 'none',
            animation: 'mode-flash 0.18s ease-out forwards',
          }}
        />
      )}
      <button
        onClick={handleClick}
        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors ${
          mode === 'SHADOW'
            ? 'bg-red-950/50 border-red-800/60 text-red-400 hover:bg-red-950/70'
            : 'bg-gray-800/60 border-gray-700/60 text-gray-400 hover:text-gray-200'
        }`}
        aria-label={`Switch to ${mode === 'LIGHT' ? 'Shadow' : 'Light'} mode`}
      >
        {label}
      </button>
    </>
  );
}
