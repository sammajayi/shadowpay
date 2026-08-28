"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { clearApiKey, getApiKey, getMerchantProfile, setApiKey, type MerchantProfile } from "./api";

interface AuthContextValue {
  merchant: MerchantProfile | null;
  isLoading: boolean;
  error: string | null;
  login: (apiKey: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [merchant, setMerchant] = useState<MerchantProfile | null>(null);
  const [isLoading, setIsLoading] = useState(() => !!getApiKey());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const key = getApiKey();
    if (!key) return;
    getMerchantProfile(key)
      .then(setMerchant)
      .catch(() => clearApiKey())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (apiKey: string) => {
    setError(null);
    try {
      const profile = await getMerchantProfile(apiKey);
      setApiKey(apiKey);
      setMerchant(profile);
    } catch {
      setError("Invalid API key");
      throw new Error("Invalid API key");
    }
  }, []);

  const logout = useCallback(() => {
    clearApiKey();
    setMerchant(null);
  }, []);

  return (
    <AuthContext.Provider value={{ merchant, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
