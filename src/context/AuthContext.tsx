import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, AUTH_TOKEN_STORAGE_KEY, clearAuthToken, parseApiJson, setAuthToken } from "@/lib/api-client";
import { readStorage, removeStorage, writeStorage } from "@/lib/storage";
import type { User } from "@/types/app";

const AUTH_STORAGE_KEY = "jafleadx-auth-user";

interface AuthContextValue {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (fullName: string, email: string, password: string) => Promise<void>;
  hydrate: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthApiResponse {
  data?: {
    accessToken?: string;
    user?: User;
  };
  message?: string;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStorage<User | null>(AUTH_STORAGE_KEY, null));
  const [hasToken, setHasToken] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return Boolean(window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY));
  });

  useEffect(() => {
    if (user) {
      writeStorage(AUTH_STORAGE_KEY, user);
      return;
    }

    removeStorage(AUTH_STORAGE_KEY);
  }, [user]);

  useEffect(() => {
    if (!hasToken) {
      setUser(null);
    }
  }, [hasToken]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: Boolean(user && hasToken),
      user,
      async hydrate() {
        if (!hasToken) {
          setUser(null);
          return;
        }

        const response = await apiFetch("/api/auth/me");
        const payload = await parseApiJson<AuthApiResponse>(response);

        if (!response.ok || !payload.data?.user) {
          clearAuthToken();
          setHasToken(false);
          setUser(null);
          throw new Error(payload.message || "Unable to restore session.");
        }

        setUser(payload.data.user);
      },
      async login(email: string, password: string) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!normalizedEmail || !password.trim()) {
          throw new Error("Email and password are required.");
        }

        const response = await apiFetch("/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: normalizedEmail,
            password,
          }),
        });
        const payload = await parseApiJson<AuthApiResponse>(response);

        if (!response.ok || !payload.data?.accessToken || !payload.data.user) {
          throw new Error(payload.message || "Unable to sign in.");
        }

        setAuthToken(payload.data.accessToken);
        setHasToken(true);
        setUser(payload.data.user);
      },
      async register(fullName: string, email: string, password: string) {
        const normalizedName = fullName.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedName || !normalizedEmail || !password.trim()) {
          throw new Error("Name, email, and password are required.");
        }

        const response = await apiFetch("/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: normalizedName,
            email: normalizedEmail,
            password,
          }),
        });
        const payload = await parseApiJson<AuthApiResponse>(response);

        if (!response.ok || !payload.data?.accessToken || !payload.data.user) {
          throw new Error(payload.message || "Unable to create account.");
        }

        setAuthToken(payload.data.accessToken);
        setHasToken(true);
        setUser(payload.data.user);
      },
      logout() {
        clearAuthToken();
        setHasToken(false);
        setUser(null);
      },
    }),
    [hasToken, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
