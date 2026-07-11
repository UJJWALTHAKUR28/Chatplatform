// Token storage helpers using localStorage.
// All functions are safe to call on the server (SSR) — they check for window first.

const ACCESS_KEY = "chat_access";
const REFRESH_KEY = "chat_refresh";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getAccessToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function setAccessToken(token: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(ACCESS_KEY, token);
}

export function setRefreshToken(token: string): void {
  if (!isBrowser()) return;
  localStorage.setItem(REFRESH_KEY, token);
}

export function setTokens(access: string, refresh: string): void {
  setAccessToken(access);
  setRefreshToken(refresh);
}

export function clearTokens(): void {
  if (!isBrowser()) return;
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}
