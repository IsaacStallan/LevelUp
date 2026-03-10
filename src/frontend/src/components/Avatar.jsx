/**
 * Avatar — circular initials avatar.
 *
 * Props:
 *   username       {string} — used to derive initials
 *   size           {number} — diameter in px (default 40)
 *   hasWarlordPass {bool}   — glowing crimson ring when true
 */
export default function Avatar({ username, size = 40, hasWarlordPass = false }) {
  const initials = username?.slice(0, 2).toUpperCase() || '??';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #8b0000, #cc2200)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.35,
        fontWeight: 700,
        color: 'white',
        fontFamily: 'Cinzel, serif',
        letterSpacing: '0.05em',
        border: hasWarlordPass
          ? '2px solid #ff4400'
          : '2px solid rgba(255,60,0,0.3)',
        boxShadow: hasWarlordPass
          ? '0 0 12px rgba(255,60,0,0.5)'
          : 'none',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}
