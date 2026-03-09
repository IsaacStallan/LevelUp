import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import client from '../api/client.js';

const AuthContext = createContext(null);

const DEFAULT_ENTITLEMENTS = {
  warlordPass: false,
  warlordPassExpires: null,
  shadowAccess: false,
  shadowTrialDaysLeft: 0,
  trialStarted: false,
  freezeTokens: 0,
  forfeitTokens: 0,
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

  const fetchEntitlements = useCallback(() => {
    if (!localStorage.getItem('levelup_token')) return;
    client.get('/auth/entitlements')
      .then(r => setEntitlements(r.data))
      .catch(() => {});
  }, []);

  // Fetch entitlements whenever user auth state changes
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
    // entitlements fetched by the useEffect above
  }, []);

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
      entitlements,
      hasWarlordPass: entitlements.warlordPass,
      refreshEntitlements: fetchEntitlements,
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
