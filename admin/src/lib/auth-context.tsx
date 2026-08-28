"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import { authChallenge, authVerify, clearTokens, getAccessToken, getMe, setTokens } from "./api";
import { connectWallet, signChallenge } from "./wallet";

interface AuthUser {
  id: string;
  wallet_address: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  isLoading: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(() => !!getAccessToken());
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getAccessToken()) return;
    getMe()
      .then(setUser)
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false));
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const { address, api } = await connectWallet();
      const challenge = await authChallenge(address);
      const signature = await signChallenge(api, challenge.message);
      const result = await authVerify(challenge.challenge_id, address, signature);
      setTokens(result.access, result.refresh);
      setUser(result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
      throw err;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAdmin: user?.role === "admin", isLoading, isConnecting, error, connect, disconnect }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
