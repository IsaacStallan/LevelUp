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

  const switchMode = useCallback((next) => {
    setMode(next);
    client.patch('/auth/mode', { mode: next }).catch(() => {});
  }, []);

  return (
    <ModeContext.Provider value={{ mode, switchMode }}>
      {children}
    </ModeContext.Provider>
  );
}

export function useMode() {
  const ctx = useContext(ModeContext);
  if (!ctx) throw new Error('useMode must be used within ModeProvider');
  return ctx;
}
