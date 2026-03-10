import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import client from '../api/client.js';

const AuthContext = createContext(null);

const DEFAULT_ENTITLEMENTS = {
  hasWarlordPass: false,
  warlordPassExpires: null,
  hasShadowAccess: false,
  shadowTrialDaysLeft: 0,
  trialStarted: false,
  freezeTokens: 0,
  forfeitTokens: 0,
  duelExtensions: 0,
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('levelup_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [entitlements, setEntitlements] = useState(DEFAULT_ENTITLEMENTS);
  // Start loading if a token exists — resolved after we verify it
  const [authLoading, setAuthLoading] = useState(() => !!localStorage.getItem('levelup_token'));

  const [userStats, setUserStats] = useState({
    level: 0, xp: 0, streak: 0, freezeTokens: 0, rank: null, title: null, pendingVictoryBonus: 0,
  });

  const fetchEntitlements = useCallback(() => {
    if (!localStorage.getItem('levelup_token')) return;
    client.get('/auth/entitlements')
      .then(r => setEntitlements(r.data))
      .catch(() => {});
  }, []);

  const refreshStats = useCallback(() => {
    if (!localStorage.getItem('levelup_token')) return;
    Promise.all([
      client.get('/gamification/stats'),
      client.get('/leaderboard').catch(() => ({ data: [] })),
    ]).then(([statsRes, lbRes]) => {
      const s = statsRes.data;
      const rank = lbRes.data.find(e => e.isCurrentUser)?.rank ?? null;
      setUserStats({
        level: s.level,
        xp: s.xp_total,
        streak: s.current_streak,
        freezeTokens: s.freeze_tokens,
        rank,
        title: s.equipped_title || null,
        pendingVictoryBonus: s.pending_victory_bonus || 0,
      });
    }).catch(() => {});
  }, []);

  // One-time mount: verify stored token with the backend
  useEffect(() => {
    const token = localStorage.getItem('levelup_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }
    client.get('/auth/entitlements')
      .then(r => {
        setEntitlements(r.data);
        setAuthLoading(false);
        refreshStats();
      })
      .catch(() => {
        // Token expired / invalid — clear everything
        localStorage.removeItem('levelup_token');
        localStorage.removeItem('levelup_user');
        setUser(null);
        setEntitlements(DEFAULT_ENTITLEMENTS);
        setAuthLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch entitlements whenever user auth state changes (login / logout)
  useEffect(() => {
    if (user) {
      fetchEntitlements();
    } else {
      setEntitlements(DEFAULT_ENTITLEMENTS);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback((token, userData) => {
    localStorage.setItem('levelup_token', token);
    localStorage.setItem('levelup_user', JSON.stringify(userData));
    setUser(userData);
    refreshStats();
    // entitlements fetched by the useEffect above
  }, [refreshStats]);

  const logout = useCallback(() => {
    localStorage.removeItem('levelup_token');
    localStorage.removeItem('levelup_user');
    setUser(null);
    setEntitlements(DEFAULT_ENTITLEMENTS);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('levelup_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isSubscribed: user?.subscription_status === 'active',
      authLoading,
      entitlements,
      hasWarlordPass: entitlements.hasWarlordPass,
      refreshEntitlements: fetchEntitlements,
      userStats,
      refreshStats,
      login,
      logout,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
