export default function XPBar({ xp, level, xp_to_next_level, flash = false }) {
  const xpIntoLevel = 100 - (xp_to_next_level ?? 100);
  const pct = Math.min(Math.max((xpIntoLevel / 100) * 100, 0), 100);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
          Level {level}
        </span>
        <span className="text-xs text-gray-400">
          {xpIntoLevel} / 100 XP
        </span>
      </div>

      {/* Bar track */}
      <div className="relative h-4 bg-gray-800/80 rounded-full overflow-hidden">
        {/* Purple→pink fill */}
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #7c3aed, #a855f7, #ec4899)',
            boxShadow: pct > 0 ? '0 0 10px rgba(168, 85, 247, 0.7), 0 0 20px rgba(236, 72, 153, 0.3)' : 'none',
          }}
        />
        {/* Shimmer overlay */}
        {pct > 0 && (
          <div className="xp-shimmer" style={{ width: `${pct}%` }} />
        )}
        {/* Gold flash overlay — absolutely layered on top, same width */}
        {flash && (
          <div
            className="anim-xp-gold"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>

      <p className="text-xs text-gray-500 mt-1">{xp_to_next_level} XP to level {level + 1}</p>
    </div>
  );
}
