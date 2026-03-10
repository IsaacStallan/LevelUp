import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import client from '../api/client.js';
import { useAuth } from './AuthContext.jsx';

const ModeContext = createContext(null);

function ShadowUpgradeModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-red-900/50 p-6 space-y-4 text-center"
        style={{ background: 'linear-gradient(135deg, rgba(30,10,20,0.98), rgba(10,5,15,0.99))' }}
      >
        <p className="text-4xl">🌑</p>
        <h2 className="text-lg font-bold text-white">Shadow Trial Ended</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Your 7-day Shadow Mode trial is over. Unlock it permanently with the Warlord Pass.
        </p>
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm hover:bg-white/5 transition-all"
          >
            Maybe Later
          </button>
          <a
            href="/upgrade"
            className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-sm font-bold transition-all text-center"
          >
            Get Warlord Pass
          </a>
        </div>
      </div>
    </div>
  );
}

export function ModeProvider({ children }) {
  // ModeProvider must be inside AuthProvider — it reads entitlements from AuthContext
  const { entitlements, refreshEntitlements } = useAuth();

  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('vivify_mode') || 'LIGHT'; } catch { return 'LIGHT'; }
  });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('shadow-mode', mode === 'SHADOW');
    try { localStorage.setItem('vivify_mode', mode); } catch {}
  }, [mode]);

  const switchMode = useCallback(async (next) => {
    // Pass holders always have shadow access — skip trial check
    if (next === 'SHADOW' && !entitlements.hasShadowAccess) {
      try {
        const { data } = await client.post('/auth/start-shadow-trial');
        // Refresh to pick up updated trial state
        refreshEntitlements();
        if (data.daysLeft > 0 || data.started) {
          setMode('SHADOW');
          client.patch('/auth/mode', { mode: 'SHADOW' }).catch(() => {});
        }
      } catch (err) {
        if (err.response?.status === 403) {
          setShowUpgradeModal(true);
        }
      }
      return;
    }
    setMode(next);
    client.patch('/auth/mode', { mode: next }).catch(() => {});
  }, [entitlements.shadowAccess, refreshEntitlements]);

  return (
    <ModeContext.Provider value={{ mode, switchMode, entitlements, refreshEntitlements }}>
      {children}
      {showUpgradeModal && <ShadowUpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within ModeProvider');
  return ctx;
}
