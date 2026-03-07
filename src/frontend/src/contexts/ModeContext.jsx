import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import client from '../api/client.js';

const ModeContext = createContext(null);

export function ModeProvider({ children }) {
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem('vivify_mode') || 'LIGHT'; } catch { return 'LIGHT'; }
  });

  useEffect(() => {
    document.body.classList.toggle('shadow-mode', mode === 'SHADOW');
    try { localStorage.setItem('vivify_mode', mode); } catch {}
  }, [mode]);

  const toggleMode = useCallback(() => {
    setMode(m => {
      const next = m === 'LIGHT' ? 'SHADOW' : 'LIGHT';
      client.patch('/auth/mode', { mode: next }).catch(() => {});
      return next;
    });
  }, []);

  return (
    <ModeContext.Provider value={{ mode, toggleMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within ModeProvider');
  return ctx;
}
