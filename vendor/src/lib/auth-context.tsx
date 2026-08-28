"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { clearApiKey, getApiKey, getVendorProfile, setApiKey, type VendorProfile } from "./api";

interface AuthContextValue {
  vendor: VendorProfile | null;
  isLoading: boolean;
  login: (apiKey: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [isLoading, setIsLoading] = useState(() => !!getApiKey());

  useEffect(() => {
    const key = getApiKey();
    if (!key) return;
    getVendorProfile(key)
      .then(setVendor)
      .catch(() => clearApiKey())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (apiKey: string) => {
    const profile = await getVendorProfile(apiKey);
    setApiKey(apiKey);
    setVendor(profile);
  }, []);

  const logout = useCallback(() => {
    clearApiKey();
    setVendor(null);
  }, []);

  return <AuthContext.Provider value={{ vendor, isLoading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
