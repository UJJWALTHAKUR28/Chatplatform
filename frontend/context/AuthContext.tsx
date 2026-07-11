"use client";

import apiClient from "@/lib/apiClient";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "@/lib/tokenStorage";
import type { AuthResponse, User } from "@/types";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, displayName: string, password: string, passwordConfirm: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Update cached user state after a profile edit — avoids a full re-fetch. */
  updateUser: (partial: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Track whether a token exists in storage — used as fallback auth state
  // when /auth/me/ fails due to transient server errors (Railway cold-start, 5xx).
  const [hasStoredToken, setHasStoredToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // ── Bootstrap: restore session from stored tokens ──────────────────────
  useEffect(() => {
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    // No tokens at all — not logged in
    if (!accessToken && !refreshToken) {
      setIsLoading(false);
      return;
    }

    // We have at least a refresh token — mark as authenticated optimistically
    setHasStoredToken(true);

    const fetchMe = () =>
      apiClient
        .get<User>("/auth/me/")
        .then((res) => setUser(res.data))
        .catch((err) => {
          // Only clear tokens on genuine auth failures (401/403).
          // Keep tokens on 5xx/network errors (Railway cold-start).
          if (axios.isAxiosError(err)) {
            const status = err.response?.status;
            if (status === 401 || status === 403) {
              clearTokens();
              setHasStoredToken(false);
            }
          } else {
            clearTokens();
            setHasStoredToken(false);
          }
        })
        .finally(() => setIsLoading(false));

    if (accessToken) {
      // Normal case — access token present, just fetch user profile
      fetchMe();
    } else {
      // Access token missing but refresh token exists — silently get a new pair
      const API_URL =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
      axios
        .post(`${API_URL}/token/refresh/`, { refresh: refreshToken })
        .then((res) => {
          const { access, refresh } = res.data;
          setTokens(access, refresh);
          // Now fetch the user profile with the fresh access token
          return fetchMe();
        })
        .catch((err) => {
          // Refresh failed — only clear tokens if it was a real auth error
          const status = axios.isAxiosError(err) ? err.response?.status : undefined;
          if (!status || status === 401 || status === 403) {
            clearTokens();
            setHasStoredToken(false);
          }
          setIsLoading(false);
        });
    }
  }, []);

  // ── Listen for forced logout (e.g. refresh token expired) ───────────────
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setHasStoredToken(false);
      router.push("/login");
    };
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, [router]);

  // ── Token watchdog: detect when tokens disappear from localStorage ───────
  // localStorage changes in the same tab don't fire the "storage" event, so
  // we poll every second. When both tokens are gone while the user is
  // authenticated (e.g. manual DevTools deletion or expiry), redirect instantly
  // instead of waiting for the next API call to return 401.
  useEffect(() => {
    if (isLoading) return; // don't start until bootstrap is complete

    const id = setInterval(() => {
      const hasAccess = !!getAccessToken();
      const hasRefresh = !!getRefreshToken();
      if (!hasAccess && !hasRefresh) {
        clearInterval(id);
        setUser(null);
        setHasStoredToken(false);
        router.replace("/login");
      }
    }, 1000);

    return () => clearInterval(id);
  }, [isLoading, router]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.post<AuthResponse>("/auth/login/", {
      email,
      password,
    });
    setTokens(res.data.tokens.access, res.data.tokens.refresh);
    setUser(res.data.user);
    router.push("/chat");
  }, [router]);

  const signup = useCallback(async (
    email: string,
    displayName: string,
    password: string,
    passwordConfirm: string
  ) => {
    const res = await apiClient.post<AuthResponse>("/auth/register/", {
      email,
      display_name: displayName,
      password,
      password_confirm: passwordConfirm,
    });
    setTokens(res.data.tokens.access, res.data.tokens.refresh);
    setUser(res.data.user);
    router.push("/chat");
  }, [router]);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    try {
      if (refresh) {
        await apiClient.post("/auth/logout/", { refresh });
      }
    } catch {
      // Ignore logout errors — clear state regardless
    } finally {
      clearTokens();
      setUser(null);
      setHasStoredToken(false);
      router.push("/login");
    }
  }, [router]);

  /**
   * Merge partial fields into the cached user object.
   * Called by the profile page after a successful PATCH /auth/me/.
   */
  const updateUser = useCallback((partial: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        // isAuthenticated = true if we have a resolved user OR we have a stored
        // token but /auth/me/ failed with a transient error (5xx/network).
        // This prevents force-redirect to /login during Railway cold-starts.
        isAuthenticated: !!user || hasStoredToken,
        isLoading,
        login,
        signup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
