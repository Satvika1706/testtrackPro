
import axios from "axios";
import { getActiveProjectId } from "../utils/project";
import {
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
  setAuthTokens,
} from "../utils/auth";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000",
  timeout: 15000,
});

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5000",
  timeout: 15000,
});

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const activeProjectId = getActiveProjectId();
    if (activeProjectId) {
      config.headers["X-Project-Id"] = activeProjectId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as {
      _retry?: boolean;
      headers?: Record<string, string>;
    };
    const status = error?.response?.status;

    if (status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuthTokens();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = refreshClient
        .post("/auth/refresh", { refreshToken })
        .then((res) => {
          const nextAccessToken = res.data?.token as string | undefined;
          const nextRefreshToken = res.data?.refreshToken as string | undefined;
          if (!nextAccessToken || !nextRefreshToken) {
            throw new Error("Invalid refresh response");
          }
          setAuthTokens(nextAccessToken, nextRefreshToken);
          return nextAccessToken;
        })
        .catch((refreshError) => {
          clearAuthTokens();
          throw refreshError;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    try {
      const nextAccessToken = await refreshPromise;
      if (!nextAccessToken) {
        return Promise.reject(error);
      }
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      return Promise.reject(refreshError);
    }
  }
);

export default api;
