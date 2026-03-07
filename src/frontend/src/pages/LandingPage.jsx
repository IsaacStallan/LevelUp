import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: '📋',
    title: 'Habit Tracking',
    desc: 'Build streaks, earn XP, and level up your character as you complete daily habits. Every check-in counts.',
  },
  {
    icon: '🏆',
    title: 'Leaderboard',
    desc: 'Compete with others on weekly and all-time boards. Equip titles and show off your streak.',
  },
  {
    icon: '🤖',
    title: 'AI Analytics',
    desc: 'Get personalised coaching from Claude. Spot your best days, weak points, and what to improve next.',
  },
  {
    icon: '🌑',
    title: 'Shadow Mode',
    desc: 'A darker, high-contrast theme for night owls and focused grinders. Coming soon.',
    soon: true,
  },
];

const FREE_FEATURES  = ['Unlimited habits', 'XP & leveling', 'Streak tracking', 'Basic stats'];
const PRO_FEATURES   = ['Everything in Free', 'AI coaching insights', 'Advanced analytics', 'Streak freeze tokens', 'Unlockable titles', 'Leaderboard titles'];

export default function LandingPage() {
  return (
    <div className="min-h-screen text-white">

      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] backdrop-blur-md bg-black/40">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight logo-glow">🔥 Vivify</span>
          <nav className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-1.5"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white px-4 py-1.5 rounded-lg transition-colors"
            >
              Start Free
            </Link>
          </nav>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Orbs */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="orb w-[500px] h-[500px] bg-purple-700/20 top-[-200px] left-[-150px]" style={{ '--dur': '12s', '--delay': '0s' }} />
          <div className="orb w-[350px] h-[350px] bg-pink-700/15 bottom-[-100px] right-[-100px]" style={{ '--dur': '16s', '--delay': '4s' }} />
          <div className="orb w-[200px] h-[200px] bg-indigo-600/10 top-[40%] right-[20%]"    style={{ '--dur': '20s', '--delay': '8s' }} />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 pt-24 pb-28 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-purple-300 bg-purple-900/30 border border-purple-700/40 px-3 py-1 rounded-full mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
            Now in beta — free to start
          </div>

          <h1 className="text-4xl sm:text-6xl font-black leading-[1.08] tracking-tight mb-6">
            Turn discipline<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400">
              into an obsession.
            </span>
          </h1>

          <p className="text-gray-400 text-lg sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            Vivify gamifies your habits with XP, levels, leaderboards and AI coaching.
            Light mode or Shadow mode — your choice.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/register"
              className="w-full sm:w-auto text-center bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-bold px-8 py-3.5 rounded-xl transition-colors glow-purple text-base"
            >
              Start Free →
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto text-center border border-white/[0.12] hover:border-white/25 text-gray-300 hover:text-white font-medium px-8 py-3.5 rounded-xl transition-colors text-base"
            >
              Sign In
            </Link>
          </div>

          <p className="text-gray-600 text-xs mt-5">No credit card required · Cancel anytime</p>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Everything you need to stay consistent</h2>
        <p className="text-gray-500 text-center mb-12 max-w-lg mx-auto">Built for people who take their habits seriously.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="glass-card rounded-2xl border border-white/[0.07] p-6 relative"
            >
              {f.soon && (
                <span className="absolute top-4 right-4 text-[10px] font-semibold text-amber-400 bg-amber-900/30 border border-amber-700/40 px-2 py-0.5 rounded-full">
                  Soon
                </span>
              )}
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-base font-bold text-white mb-1">{f.title}</h3>
              <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 py-10 pb-24">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Simple pricing</h2>
        <p className="text-gray-500 text-center mb-12">Start free. Upgrade when you're ready.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Free */}
          <div className="glass-card rounded-2xl border border-white/[0.07] p-6 flex flex-col">
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-400 mb-1">Free</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black text-white">$0</span>
                <span className="text-gray-500 text-sm mb-1">/month</span>
              </div>
            </div>
            <ul className="space-y-2.5 flex-1 mb-6">
              {FREE_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-purple-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="block text-center border border-white/[0.12] hover:border-white/25 text-gray-300 hover:text-white font-medium py-2.5 rounded-xl transition-colors text-sm"
            >
              Get started free
            </Link>
          </div>

          {/* Pro */}
          <div className="card-glow glass-card rounded-2xl border border-purple-700/50 p-6 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="text-[10px] font-bold text-white bg-purple-600 px-3 py-1 rounded-full">MOST POPULAR</span>
            </div>
            <div className="mb-4">
              <p className="text-sm font-medium text-purple-300 mb-1">Pro</p>
              <div className="flex items-end gap-1">
                <span className="text-4xl font-black text-white">$7</span>
                <span className="text-gray-500 text-sm mb-1">/month</span>
              </div>
            </div>
            <ul className="space-y-2.5 flex-1 mb-6">
              {PRO_FEATURES.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                  <span className="text-purple-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="block text-center bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl transition-colors glow-purple text-sm"
            >
              Start Free → Upgrade anytime
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] py-8">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <span className="font-semibold text-gray-500">🔥 Vivify</span>
          <div className="flex items-center gap-6">
            <a href="mailto:support@vivify.au" className="hover:text-gray-400 transition-colors">support@vivify.au</a>
            <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
            <a href="/terms"   className="hover:text-gray-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
