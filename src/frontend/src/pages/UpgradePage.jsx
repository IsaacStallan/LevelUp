import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavHeader from '../components/NavHeader.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useMode } from '../contexts/ModeContext.jsx';

const LS_WARLORD_PASS  = import.meta.env.VITE_LS_WARLORD_PASS_URL;
const LS_FREEZE_3      = import.meta.env.VITE_LS_FREEZE_3_URL;
const LS_FREEZE_10     = import.meta.env.VITE_LS_FREEZE_10_URL;
const LS_FORFEIT       = import.meta.env.VITE_LS_FORFEIT_TOKEN_URL;
const LS_DUEL_EXTEND   = import.meta.env.VITE_LS_DUEL_EXTEND_URL;

function checkoutUrl(base, email) {
  if (!base) return '#';
  return email ? `${base}?checkout[email]=${encodeURIComponent(email)}` : base;
}

export default function UpgradePage() {
  const { user, refreshEntitlements } = useAuth();
  const { mode, entitlements } = useMode();
  const isShadow = mode === 'SHADOW';
  const navigate = useNavigate();
  const { hasWarlordPass, hasWarlordPassExpires, shadowTrialDaysLeft, freezeTokens, forfeitTokens, duelExtensions } = entitlements;

  // Re-fetch entitlements when user returns to this tab after checkout
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') refreshEntitlements();
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refreshEntitlements]);

  const expiryLabel = hasWarlordPassExpires
    ? new Date(hasWarlordPassExpires).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="page-enter min-h-screen">
      <NavHeader />

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">

        {/* Header */}
        <div>
          <button
            onClick={() => navigate(-1)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors mb-4 inline-flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className={`text-2xl font-bold ${isShadow ? 'text-red-400' : 'text-white'}`}>
            ⚔️ {isShadow ? 'The Armoury' : 'Armoury'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Unlock Shadow Mode, freeze streaks, and claim battle advantages.
          </p>
        </div>

        {/* ── Warlord Pass ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className={`text-[10px] font-bold uppercase tracking-widest ${isShadow ? 'text-red-500' : 'text-purple-400'}`}>
            Warlord Pass
          </h2>
          <div
            className={`rounded-2xl border p-5 space-y-4 ${
              isShadow
                ? 'border-red-800/50'
                : 'border-purple-700/40'
            }`}
            style={{
              background: isShadow
                ? 'linear-gradient(135deg, rgba(40,10,15,0.6), rgba(20,5,10,0.8))'
                : 'linear-gradient(135deg, rgba(80,30,120,0.15), rgba(40,10,80,0.25))',
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-lg font-bold ${isShadow ? 'text-red-300' : 'text-white'}`}>
                  {isShadow ? '👑 WARLORD PASS' : '👑 Warlord Pass'}
                </p>
                <p className="text-sm text-gray-400 mt-0.5">Shadow Mode, forever.</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-2xl font-black tabular-nums ${isShadow ? 'text-red-400' : 'text-purple-300'}`}>
                  $4.99
                </p>
                <p className="text-[10px] text-gray-600">/month</p>
              </div>
            </div>

            <ul className="space-y-2">
              {[
                'Permanent Shadow Mode access',
                '5 Streak Freeze tokens on signup',
                'Unlock Shadow-exclusive titles',
                'Priority battle matchmaking',
              ].map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className={`shrink-0 ${isShadow ? 'text-red-500' : 'text-purple-400'}`}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {shadowTrialDaysLeft > 0 && !hasWarlordPass && (
              <p className="text-xs text-amber-400 text-center">
                ⏱ Shadow trial: {shadowTrialDaysLeft} day{shadowTrialDaysLeft !== 1 ? 's' : ''} remaining
              </p>
            )}

            {hasWarlordPass ? (
              <div className="w-full bg-green-900/30 border border-green-700/40 text-green-400 py-2.5 rounded-xl text-sm font-semibold text-center space-y-0.5">
                <p>✓ Warlord Pass Active</p>
                {expiryLabel && (
                  <p className="text-[11px] text-green-600 font-normal">Renews {expiryLabel}</p>
                )}
              </div>
            ) : (
              <button
                onClick={() => window.open(checkoutUrl(LS_WARLORD_PASS, user?.email), '_blank')}
                disabled={!LS_WARLORD_PASS}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 ${
                  isShadow
                    ? 'bg-red-700 hover:bg-red-600 text-white'
                    : 'bg-purple-600 hover:bg-purple-500 text-white'
                }`}
              >
                {isShadow ? 'CLAIM THE PASS ⚔️' : 'Get Warlord Pass — $4.99/mo'}
              </button>
            )}
          </div>
        </section>

        {/* ── Freeze Token Packs ───────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Streak Freeze Tokens
          </h2>
          <p className="text-xs text-gray-600">
            Protect your streak when life gets in the way. You have{' '}
            <span className="text-white font-bold">{freezeTokens}</span> token{freezeTokens !== 1 ? 's' : ''}.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '3-Pack', price: '$1.99', url: LS_FREEZE_3,  tokens: 3  },
              { label: '10-Pack', price: '$4.99', url: LS_FREEZE_10, tokens: 10, best: true },
            ].map(pack => (
              <div
                key={pack.label}
                className={`rounded-xl border p-4 space-y-3 bg-white/[0.02] ${
                  pack.best ? 'border-purple-600/40' : 'border-white/[0.07]'
                }`}
              >
                {pack.best && (
                  <p className="text-[9px] text-purple-400 font-bold uppercase tracking-widest">Best Value</p>
                )}
                <p className="text-sm font-bold text-white">🧊 {pack.label}</p>
                <p className="text-[10px] text-gray-500">+{pack.tokens} freeze tokens</p>
                <button
                  onClick={() => window.open(checkoutUrl(pack.url, user?.email), '_blank')}
                  disabled={!pack.url}
                  className="w-full py-2 rounded-lg border border-white/10 text-gray-300 text-xs font-medium hover:bg-white/5 transition-all disabled:opacity-50"
                >
                  {pack.price}
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* ── Battle Items ─────────────────────────────────────────── */}
        <section className="space-y-3">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
            Battle Items
          </h2>
          {forfeitTokens > 0 && (
            <p className="text-xs text-gray-600">
              You have <span className="text-white font-bold">{forfeitTokens}</span> forfeit token{forfeitTokens !== 1 ? 's' : ''}.
            </p>
          )}
          {duelExtensions > 0 && (
            <p className="text-xs text-gray-600">
              You have <span className="text-white font-bold">{duelExtensions}</span> duel extension{duelExtensions !== 1 ? 's' : ''}.
            </p>
          )}
          <div className="space-y-2">
            {[
              {
                icon: '🏳️',
                label: 'Forfeit Token',
                desc: 'Withdraw from a battle without a loss',
                price: '$0.99',
                url: LS_FORFEIT,
              },
              {
                icon: '⏳',
                label: 'Duel Extension',
                desc: 'Extend an active battle by 3 days',
                price: '$1.99',
                url: LS_DUEL_EXTEND,
              },
            ].map(item => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3"
              >
                <span className="text-2xl shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="text-[11px] text-gray-500">{item.desc}</p>
                </div>
                <button
                  onClick={() => window.open(checkoutUrl(item.url, user?.email), '_blank')}
                  disabled={!item.url}
                  className="shrink-0 px-3 py-1.5 rounded-lg border border-white/10 text-xs text-gray-300 hover:bg-white/5 transition-all font-medium disabled:opacity-50"
                >
                  {item.price}
                </button>
              </div>
            ))}
          </div>
        </section>

        <p className="text-center text-xs text-gray-700 pb-4">Secure payment by Lemon Squeezy</p>
      </main>
    </div>
  );
}
