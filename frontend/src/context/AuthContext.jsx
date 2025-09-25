  import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Hydrate from storage on first render
  useEffect(() => {
    const stored = apiClient.loadUser?.() || null;
    if (stored) setUser(stored);
  }, []);
  const login = (u) => {
    setUser(u);
    apiClient.saveUser?.(u);
  };
  const logout = () => {
    setUser(null);
    apiClient.saveUser?.(null);
    apiClient.clearTokens?.();
  };
  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
