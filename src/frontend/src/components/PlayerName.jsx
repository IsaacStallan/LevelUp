/**
 * PlayerName — renders a username with optional Warlord Pass flame flair.
 *
 * Props:
 *   name          {string}  — username to display
 *   hasWarlordPass {bool}   — show 🔥 + crimson glow when true
 *   className     {string}  — extra classes applied to the name span
 */
export default function PlayerName({ name, hasWarlordPass, className = '' }) {
  if (!hasWarlordPass) {
    return <span className={className}>{name}</span>;
  }

  return (
    <span className="inline-flex items-center gap-1">
      <span className="flame-flair" style={{ fontSize: '0.9em', lineHeight: 1 }}>🔥</span>
      <span className={`warlord-name ${className}`}>{name}</span>
    </span>
  );
}
