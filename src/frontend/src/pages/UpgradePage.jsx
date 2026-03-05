import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client.js';
import { useAuth } from '../contexts/AuthContext.jsx';

const CHECKOUT_URL = import.meta.env.VITE_LEMON_SQUEEZY_CHECKOUT_URL || '#';

const FEATURES = [
  { icon: '📋', label: 'Unlimited habit tracking' },
  { icon: '⚡', label: 'XP & leveling system' },
  { icon: '🔥', label: 'Streak tracking & bonuses' },
  { icon: '🧙', label: 'Character progression (10 stages, 100 levels)' },
  { icon: '📊', label: 'Lifetime stats & history' },
  { icon: '🎯', label: 'Milestone XP bonuses at 7, 14 & 30 days' },
];

export default function UpgradePage() {
  const { user } = useAuth();
  const [sub, setSub] = useState(null);

  useEffect(() => {
    client.get('/payments/status').then(r => setSub(r.data.subscription)).catch(() => {});
  }, []);

  const checkoutUrl = user?.email
    ? `${CHECKOUT_URL}?checkout[email]=${encodeURIComponent(user.email)}`
    : CHECKOUT_URL;

  return (
    <div className="page-enter min-h-screen flex flex-col relative overflow-hidden">
      {/* Floating orbs */}
      <div aria-hidden="true" className="pointer-events-none">
        <div className="orb w-64 h-64 bg-purple-600/20 top-[-80px] left-[-80px]" style={{ '--dur': '8s', '--delay': '0s' }} />
        <div className="orb w-48 h-48 bg-pink-600/15 bottom-[-40px] right-[-40px]" style={{ '--dur': '11s', '--delay': '3s' }} />
        <div className="orb w-32 h-32 bg-indigo-500/10 top-[40%] right-[10%]" style={{ '--dur': '14s', '--delay': '6s' }} />
      </div>

      {/* Back link — pinned top-left */}
      <div className="relative z-10 px-4 pt-4 pb-0">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Dashboard
        </Link>
      </div>

      {/* Content — centred, full-width on small screens */}
      <div className="relative z-10 flex-1 flex items-start justify-center px-4 py-6 sm:py-12">
        <div className="w-full max-w-sm sm:max-w-md">

          {/* Hero */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="text-5xl sm:text-6xl mb-3">👑</div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight">
              Unlock LevelUp Pro
            </h1>
            <p className="text-gray-400 mt-2 text-sm sm:text-base">
              Turn your habits into an epic quest
            </p>
          </div>

          {/* Pricing card — full-width on mobile */}
          <div className="card-glow glass-card rounded-2xl border border-purple-700/40 overflow-hidden mb-4">

            {/* Price header */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-800/60 text-center">
              <div className="flex items-end justify-center gap-1">
                <span className="text-5xl font-black text-white">$7</span>
                <span className="text-gray-400 text-sm mb-2">/month</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Cancel anytime</p>
            </div>

            {/* Feature list */}
            <ul className="px-5 py-4 space-y-3">
              {FEATURES.map((f, i) => (
                <li key={f.label} className="flex items-start gap-3">
                  <span
                    className="feature-check shrink-0 mt-0.5"
                    style={{ '--delay': `${i * 0.12}s` }}
                  >
                    <svg viewBox="0 0 20 20" width="18" height="18" fill="none" className="anim-feature-check">
                      <circle cx="10" cy="10" r="9" stroke="rgba(168,85,247,0.5)" strokeWidth="1.5" />
                      <path d="M6 10.5l3 3 5-5.5" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-gray-300 text-sm leading-snug">{f.label}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="px-5 pb-5">
              {sub?.status === 'active' ? (
                <div className="text-center">
                  <div className="w-full bg-green-900/40 border border-green-700/60 text-green-400 px-4 py-3 rounded-xl text-sm font-semibold">
                    ✓ Pro is active
                  </div>
                  {sub.current_period_end && (
                    <p className="text-xs text-gray-500 mt-2">
                      Renews {new Date(sub.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ) : (
                <a
                  href={checkoutUrl}
                  className="block w-full text-center bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold py-4 rounded-xl transition-colors glow-purple text-base"
                >
                  Start Subscription — $7/mo
                </a>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-gray-600">
            Secure payment by Lemon Squeezy
          </p>
        </div>
      </div>
    </div>
  );
}
