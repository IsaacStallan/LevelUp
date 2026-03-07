import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

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

export default function NavHeader({ level }) {
  const { user, logout, isSubscribed } = useAuth();
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
        <nav className="hidden sm:flex items-center gap-4 text-sm">
          <span className="text-gray-500 max-w-[100px] truncate">{user?.username}</span>
          <Link to="/dashboard"   className="text-gray-400 hover:text-white transition-colors">Dashboard</Link>
          <Link to="/habits"      className="text-gray-400 hover:text-white transition-colors">Habits</Link>
          <Link to="/leaderboard" className="text-gray-400 hover:text-white transition-colors">Board</Link>
          <Link to="/analytics"   className="text-gray-400 hover:text-white transition-colors">Analytics</Link>
          <Link to="/titles"      className="text-gray-400 hover:text-white transition-colors">Titles</Link>
          {!isSubscribed && <Link to="/upgrade" className="text-purple-400 hover:text-purple-300 transition-colors">Upgrade</Link>}
          <button onClick={handleLogout} className="text-gray-500 hover:text-red-400 transition-colors">Logout</button>
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
            {[
              { to: '/dashboard',   icon: '🏠', label: 'Dashboard',       cls: 'text-gray-300'  },
              { to: '/habits',      icon: '📋', label: 'Habits',          cls: 'text-gray-300'  },
              { to: '/leaderboard', icon: '🏆', label: 'Leaderboard',     cls: 'text-gray-300'  },
              { to: '/analytics',   icon: '📊', label: 'Analytics',       cls: 'text-gray-300'  },
              { to: '/titles',      icon: '🏅', label: 'Titles',          cls: 'text-gray-300'  },
              ...(!isSubscribed ? [{ to: '/upgrade', icon: '⚡', label: 'Upgrade — $7/mo', cls: 'text-purple-400' }] : []),
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                onClick={close}
                className={`flex items-center gap-3 px-3 py-3.5 rounded-xl ${item.cls} hover:bg-gray-800 active:bg-gray-700 transition-colors text-sm font-medium`}
              >
                <span className="text-base w-6 text-center">{item.icon}</span>
                {item.label}
              </Link>
            ))}

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
