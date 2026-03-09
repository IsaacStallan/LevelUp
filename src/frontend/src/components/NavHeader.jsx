import { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useMode } from '../contexts/ModeContext.jsx';
import ModeToggle from './ModeToggle.jsx';
import ModeText from './ModeText.jsx';

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M3 5.5h16M3 11h16M3 16.5h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M4 4l14 14M18 4L4 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const MORE_ITEMS = [
  { to: '/analytics',   icon: '📊', id: 'nav.analytics'  },
  { to: '/titles',      icon: '🏅', id: 'nav.titles'     },
  { to: '/leaderboard', icon: '🏆', id: 'nav.leaderboard' },
];

function MoreDropdown({ isShadow }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-sm select-none"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <ModeText id="nav.more" />
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-44 rounded-xl border border-white/[0.08] overflow-hidden z-50"
          style={{ background: 'rgba(10,6,25,0.97)', backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}
        >
          {MORE_ITEMS.map(item => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <span className="text-base w-5 text-center">{item.icon}</span>
              <ModeText id={item.id} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NavHeader({ level }) {
  const { user, logout } = useAuth();
  const { mode, entitlements } = useMode();
  const isShadow = mode === 'SHADOW';
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let rafId = null;
    function onScroll() {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 10);
        rafId = null;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate('/login');
  }

  function close() { setMenuOpen(false); }

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const showTrialExpiredBanner = entitlements.trialStarted && !entitlements.shadowAccess && !entitlements.warlordPass && !isShadow;

  return (
    <header className="sticky top-0 z-50">
      <div
        className={`relative border-b transition-colors duration-200 ${
          scrolled
            ? 'border-white/10 bg-black/80 backdrop-blur-md'
            : 'border-white/10 backdrop-blur-md bg-white/[0.03]'
        }`}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">

          {/* Logo + level badge */}
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/dashboard" className="text-lg font-bold text-white tracking-tight logo-glow">
              🔥 Vivify
            </Link>
            <span className="level-badge text-xs bg-purple-900/50 border border-purple-700/60 text-purple-300 px-2 py-0.5 rounded-full tabular-nums">
              Lv.{level}
            </span>
            {entitlements.shadowTrialDaysLeft > 0 && !entitlements.warlordPass && (
              <span className="hidden sm:inline text-[10px] text-amber-400/70 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                Shadow Trial · {entitlements.shadowTrialDaysLeft}d
              </span>
            )}
          </div>

          {/* Desktop nav — hidden on mobile */}
          <nav className="hidden sm:flex items-center gap-5 text-sm">
            <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              <ModeText id="nav.dashboard" />
            </Link>
            <Link to="/habits" className="text-gray-400 hover:text-white transition-colors">
              <ModeText id="nav.habits" />
            </Link>
            <Link to="/battles" className="text-gray-400 hover:text-white transition-colors">
              <ModeText id="nav.battles" />
            </Link>
            <MoreDropdown isShadow={isShadow} />
            <ModeToggle />
            {entitlements.warlordPass ? (
              <Link to="/upgrade" className="text-xs font-bold px-2 py-0.5 rounded-md bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30 transition-colors">
                WARLORD
              </Link>
            ) : (
              <Link to="/upgrade" className={`hover:opacity-80 transition-colors text-sm ${isShadow ? 'text-red-400' : 'text-purple-400'}`}>
                Armoury
              </Link>
            )}
            <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors">
              Logout
            </button>
          </nav>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMenuOpen(m => !m)}
            className="sm:hidden w-11 h-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <HamburgerIcon />
          </button>
        </div>

      </div>

      {/* Mobile full-screen menu — rendered into document.body via portal */}
      {menuOpen && ReactDOM.createPortal(
        <div
          style={{
            backgroundColor: '#05020f',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header row: signed in as + close button */}
          <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div>
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">Signed in as</p>
              <p className="text-sm font-semibold text-gray-200">{user?.username}</p>
            </div>
            <button
              onClick={close}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)' }}
              aria-label="Close menu"
            >
              <CloseIcon />
            </button>
          </div>

          {/* Nav links */}
          <nav style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            <div style={{ padding: '8px 12px 12px' }}>
              <ModeToggle />
            </div>
            {[
              { to: '/dashboard',   icon: '🏠', id: 'nav.dashboard'   },
              { to: '/habits',      icon: '📋', id: 'nav.habits'      },
              { to: '/leaderboard', icon: '🏆', id: 'nav.leaderboard' },
              { to: '/battles',     icon: '⚔️', id: 'nav.battles'     },
              { to: '/analytics',   icon: '📊', id: 'nav.analytics'   },
              { to: '/titles',      icon: '🏅', id: 'nav.titles'      },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={close}
                className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors text-base font-medium"
                style={{ padding: '16px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}
              >
                <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>{item.icon}</span>
                <ModeText id={item.id} />
              </Link>
            ))}
            {entitlements.warlordPass ? (
              <Link
                to="/upgrade"
                onClick={close}
                className="flex items-center gap-3 text-yellow-400 hover:text-yellow-300 transition-colors text-base font-medium"
                style={{ padding: '16px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}
              >
                <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>👑</span>
                WARLORD — Active
              </Link>
            ) : (
              <Link
                to="/upgrade"
                onClick={close}
                className={`flex items-center gap-3 transition-colors text-base font-medium ${isShadow ? 'text-red-400 hover:text-red-300' : 'text-purple-400 hover:text-purple-300'}`}
                style={{ padding: '16px 12px', borderRadius: '12px', display: 'flex', alignItems: 'center' }}
              >
                <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>⚔️</span>
                <ModeText id="nav.armoury" />
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full text-red-400 hover:text-red-300 transition-colors text-base font-medium"
              style={{ padding: '16px 12px', borderRadius: '12px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span style={{ fontSize: '20px', width: '28px', textAlign: 'center' }}>↩</span>
              Sign Out
            </button>
          </nav>
        </div>,
        document.body
      )}

      {/* Shadow trial expired banner */}
      {showTrialExpiredBanner && (
        <div className="bg-purple-950/80 border-b border-purple-800/30 px-4 py-2 text-center">
          <span className="text-xs text-purple-300/80">
            Your Shadow trial ended.{' '}
            <Link to="/upgrade" className="font-semibold text-purple-200 underline underline-offset-2 hover:text-white transition-colors">
              Reclaim it →
            </Link>
          </span>
        </div>
      )}
    </header>
  );
}
