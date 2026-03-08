import { useState, useRef, useEffect } from 'react';
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
  { to: '/battles',  icon: '⚔️', id: 'nav.battles'   },
  { to: '/analytics',icon: '📊', id: 'nav.analytics'  },
  { to: '/titles',   icon: '🏅', id: 'nav.titles'     },
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
        {isShadow ? 'Arsenal' : 'More'}
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
  const { user, logout, isSubscribed } = useAuth();
  const { mode } = useMode();
  const isShadow = mode === 'SHADOW';
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    setMenuOpen(false);
    logout();
    navigate('/login');
  }

  function close() { setMenuOpen(false); }

  return (
    <header className="relative border-b border-white/10 sticky top-0 backdrop-blur-md bg-white/[0.03] z-50">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-2">

        {/* Logo + level badge */}
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/dashboard" className="text-lg font-bold text-white tracking-tight logo-glow">
            🔥 Vivify
          </Link>
          <span className="level-badge text-xs bg-purple-900/50 border border-purple-700/60 text-purple-300 px-2 py-0.5 rounded-full tabular-nums">
            Lv.{level}
          </span>
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
          {!isSubscribed && (
            <Link to="/upgrade" className="text-purple-400 hover:text-purple-300 transition-colors">Upgrade</Link>
          )}
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors">
            Logout
          </button>
        </nav>

        {/* Mobile hamburger button — 44×44 touch target */}
        <button
          onClick={() => setMenuOpen(m => !m)}
          className="sm:hidden w-11 h-11 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <CloseIcon /> : <HamburgerIcon />}
        </button>
      </div>

      {/* Mobile slide-down menu */}
      {menuOpen && (
        <div className="sm:hidden absolute left-0 right-0 top-full backdrop-blur-md bg-gray-950/95 border-b border-white/10 anim-menu-slide shadow-xl z-50">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-800/60 bg-gray-900/50">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-0.5">Signed in as</p>
            <p className="text-sm font-semibold text-gray-200">{user?.username}</p>
          </div>

          {/* Nav links — full-width, 52px touch targets */}
          <nav className="px-2 py-2">
            <div className="px-3 py-2 mb-1">
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
                className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-gray-300 hover:bg-gray-800 active:bg-gray-700 transition-colors text-sm font-medium"
              >
                <span className="text-base w-6 text-center">{item.icon}</span>
                <ModeText id={item.id} />
              </Link>
            ))}
            {!isSubscribed && (
              <Link
                to="/upgrade"
                onClick={close}
                className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-purple-400 hover:bg-gray-800 active:bg-gray-700 transition-colors text-sm font-medium"
              >
                <span className="text-base w-6 text-center">⚡</span>
                Upgrade — $7/mo
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-3.5 rounded-xl text-red-400 hover:bg-gray-800 active:bg-gray-700 transition-colors text-sm font-medium mt-1 border-t border-gray-800/60 pt-3"
            >
              <span className="text-base w-6 text-center">↩</span>
              Sign Out
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
