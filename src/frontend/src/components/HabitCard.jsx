import { useState, useRef } from 'react';

const PARTICLE_ANGLES = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * 2 * Math.PI;
  return { cos: Math.cos(angle), sin: Math.sin(angle) };
});

function generateParticles(color) {
  return PARTICLE_ANGLES.map((a, i) => {
    const dist = 48 + (i % 3) * 16;
    return {
      id: i,
      tx: Math.round(a.cos * dist),
      ty: Math.round(a.sin * dist),
      size: 5 + (i % 3) * 3,
      dur:   `${0.5 + (i % 4) * 0.08}s`,
      delay: `${(i % 4) * 0.04}s`,
      color,
    };
  });
}

function AnimatedCheckmark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      className="anim-checkmark shrink-0"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M 3.5 12.5 L 8.5 17.5 L 20.5 5.5" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

export default function HabitCard({ habit, onComplete, onEdit, onDelete, completedToday }) {
  const [squish, setSquish]               = useState(false);
  const [particles, setParticles]         = useState([]);
  const [xpFloat, setXpFloat]             = useState(null);
  const [justCompleted, setJustCompleted] = useState(false);
  const squishTimer   = useRef(null);
  const particleTimer = useRef(null);
  const xpTimer       = useRef(null);

  async function handleComplete() {
    if (completedToday || justCompleted) return;

    setSquish(true);
    clearTimeout(squishTimer.current);
    squishTimer.current = setTimeout(() => setSquish(false), 600);

    setParticles(generateParticles(habit.color));
    clearTimeout(particleTimer.current);
    particleTimer.current = setTimeout(() => setParticles([]), 900);

    const result = await onComplete(habit.id);

    if (result?.xp_earned) {
      setXpFloat(`+${result.xp_earned} XP`);
      setJustCompleted(true);
      clearTimeout(xpTimer.current);
      xpTimer.current = setTimeout(() => setXpFloat(null), 2200);
    }
  }

  const isDone = completedToday || justCompleted;

  return (
    <div
      className={`relative glass-card rounded-xl border p-3 flex items-center gap-3 transition-all duration-200 ${
        isDone ? 'card-done border-green-900/40' : 'border-white/[0.08] hover:border-white/[0.15]'
      } ${squish ? 'anim-squish' : ''}`}
      style={{ borderLeftColor: habit.color, borderLeftWidth: 4 }}
    >
      {/* Particle burst */}
      {particles.map(p => (
        <div
          key={p.id}
          className="anim-particle"
          style={{
            width:  p.size + 'px',
            height: p.size + 'px',
            backgroundColor: p.color,
            top:        '50%',
            left:       '50%',
            marginTop:  -(p.size / 2) + 'px',
            marginLeft: -(p.size / 2) + 'px',
            '--tx':    p.tx + 'px',
            '--ty':    p.ty + 'px',
            '--dur':   p.dur,
            '--delay': p.delay,
          }}
        />
      ))}

      {/* Floating XP number */}
      {xpFloat && (
        <div
          className="anim-xp-float absolute font-black z-20 whitespace-nowrap pointer-events-none"
          style={{
            top:       '0%',
            left:      '50%',
            transform: 'translateX(-50%)',
            fontSize:  'clamp(1rem, 4vw, 1.4rem)',
            color:     habit.color,
            textShadow: `0 0 12px ${habit.color}, 0 0 24px ${habit.color}`,
          }}
        >
          {xpFloat}
        </div>
      )}

      {/* Icon */}
      <div className="text-xl shrink-0 select-none w-8 text-center">{habit.icon}</div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-100 truncate text-sm leading-tight">{habit.name}</p>
        {habit.description && (
          <p className="text-xs text-gray-500 truncate mt-0.5">{habit.description}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {onEdit && (
          <button
            onClick={() => onEdit(habit)}
            className="w-9 h-9 sm:w-auto sm:h-auto sm:px-2 sm:py-1 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors text-sm"
            aria-label="Edit"
          >
            <span className="sm:hidden">✏️</span>
            <span className="hidden sm:inline text-xs">Edit</span>
          </button>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(habit.id)}
            className="w-9 h-9 sm:w-auto sm:h-auto sm:px-2 sm:py-1 flex items-center justify-center rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors text-sm"
            aria-label="Delete"
          >
            <span className="sm:hidden">🗑️</span>
            <span className="hidden sm:inline text-xs">Delete</span>
          </button>
        )}
        {onComplete && (
          <button
            onClick={handleComplete}
            disabled={isDone}
            className={`flex items-center justify-center gap-1.5 min-h-[44px] px-3 rounded-xl text-sm font-semibold transition-all ${
              isDone
                ? 'bg-green-900/40 text-green-400 cursor-default'
                : 'btn-primary active:scale-95 text-white'
            }`}
            style={{ minWidth: '76px' }}
          >
            {isDone ? (
              <>
                <AnimatedCheckmark />
                <span>Done</span>
              </>
            ) : (
              'Complete'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
