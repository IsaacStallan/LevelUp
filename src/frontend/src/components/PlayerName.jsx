/**
 * PlayerName — renders a username with optional Warlord Pass typographic flair.
 *
 * Props:
 *   name           {string} — username to display
 *   hasWarlordPass {bool}   — apply Cinzel shimmer styling when true
 *   className      {string} — extra classes applied to the span
 */
export default function PlayerName({ name, hasWarlordPass, className = '' }) {
  if (!hasWarlordPass) {
    return <span className={className}>{name}</span>;
  }

  return <span className={`warlord-name ${className}`}>{name}</span>;
}
