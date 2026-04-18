"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api, ApiError, TOKEN_STORAGE_KEY } from "@/lib/api";
import type { User } from "@/types/api";

type AuthStatus = "loading" | "unauthenticated" | "authenticated";

type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  login: (idToken: string) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const refresh = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setUser(null);
      setStatus("unauthenticated");
      return;
    }
    try {
      const me = await api.getMe();
      setUser(me);
      setStatus("authenticated");
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const hydrate = async () => {
      if (typeof window === "undefined") return;
      const token = localStorage.getItem(TOKEN_STORAGE_KEY);
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setStatus("unauthenticated");
        }
        return;
      }
      try {
        const me = await api.getMe();
        if (!cancelled) {
          setUser(me);
          setStatus("authenticated");
        }
      } catch (err) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
        if (!cancelled) {
          setUser(null);
          setStatus("unauthenticated");
        }
      }
    };
    void hydrate();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const login = useCallback(
    async (idToken: string) => {
      const res = await api.exchangeGoogleToken(idToken);
      localStorage.setItem(TOKEN_STORAGE_KEY, res.access_token);
      setUser(res.user);
      setStatus("authenticated");
      return res.user;
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, logout, refresh }),
    [user, status, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
