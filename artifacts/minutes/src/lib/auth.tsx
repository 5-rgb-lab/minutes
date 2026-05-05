import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { setAuthTokenGetter } from "@workspace/api-client-react";

const AUTH_TOKEN_STORAGE_KEY = "minute-manager-auth-token";
const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export type AuthUser = {
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  } else {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  }
}

function buildApiUrl(path: string) {
  const normalizedBase = API_BASE.replace(/\/+$/, "");
  return normalizedBase ? `${normalizedBase}/api${path}` : `/api${path}`;
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(init.headers ?? undefined);

  headers.set("Accept", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = buildApiUrl(path);
  const response = await fetch(url, {
    ...init,
    headers,
  });

  const text = await response.text();
  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`Expected JSON response from ${url}, got: ${text.slice(0, 200)}`);
    }
  }

  if (!response.ok) {
    throw new Error((data && (data.error || data.message)) ?? response.statusText);
  }

  return data as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(() => getStoredToken());
  }, []);

  useEffect(() => {
    async function restore() {
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const data = await apiFetch<{ email: string }>("/auth/me");
        setUser({ email: data.email });
      } catch {
        setStoredToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    restore();
  }, []);

  const login = async (email: string, password: string) => {
    const data = await apiFetch<{ email: string; token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    setUser({ email: data.email });
  };

  const register = async (email: string, password: string) => {
    const data = await apiFetch<{ email: string; token: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    setUser({ email: data.email });
  };

  const logout = async () => {
    try {
      await apiFetch<unknown>("/auth/logout", { method: "POST" });
    } catch {
      // ignore logout failures
    }
    setStoredToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
