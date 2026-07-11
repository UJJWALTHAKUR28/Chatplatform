// Axios instance for all REST API calls to the Django backend.
//
// Interceptor logic:
//   Request  → attach Authorization: Bearer <access_token>
//   Response → on 401, try POST /token/refresh/ once, retry original request
//              if refresh also fails, call window.dispatchEvent("auth:logout")
//              so the AuthContext can clear state and redirect to /login

import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./tokenStorage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// ── Request interceptor: attach access token ──────────────────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: auto-refresh on 401 ────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function processQueue(token: string) {
  refreshQueue.forEach((cb) => cb(token));
  refreshQueue = [];
}

function forceLogout() {
  clearTokens();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:logout"));
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Only retry 401 errors that haven't already been retried
    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        forceLogout();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until the refresh completes
        return new Promise((resolve) => {
          refreshQueue.push((newToken: string) => {
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(original));
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const res = await axios.post(`${API_URL}/token/refresh/`, {
          refresh: refreshToken,
        });
        const { access, refresh } = res.data;
        setTokens(access, refresh);
        processQueue(access);
        original.headers.Authorization = `Bearer ${access}`;
        return apiClient(original);
      } catch (refreshErr) {
        // Only force-logout if the refresh token is genuinely invalid (401/403).
        // On 5xx or network errors (Railway cold-start), don't log the user out —
        // the refresh token may still be valid once the server recovers.
        const refreshStatus = axios.isAxiosError(refreshErr)
          ? refreshErr.response?.status
          : undefined;
        if (!refreshStatus || refreshStatus === 401 || refreshStatus === 403) {
          forceLogout();
        }
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
