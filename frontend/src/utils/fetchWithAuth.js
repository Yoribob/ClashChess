import { refreshToken } from "../auth/authAPI.js";
import { API_ORIGIN } from "../config/api.js";

let isRefreshing = false;
let refreshPromise = null;

export async function fetchWithAuth(url, options = {}) {
  const fullUrl = url.startsWith("http") ? url : API_ORIGIN + (url.startsWith("/") ? url : "/" + url);
  const defaultOptions = {
    credentials: "include",
    ...options,
  };

  try {
    let response = await fetch(fullUrl, defaultOptions);

    if (response.status === 401) {
      if (isRefreshing && refreshPromise) {
        try {
          await refreshPromise;
        } catch (_) {
        }
        response = await fetch(fullUrl, defaultOptions);
        return response;
      }

      isRefreshing = true;
      refreshPromise = refreshToken();

      try {
        const refreshResult = await refreshPromise;
        if (refreshResult.success) {
          response = await fetch(fullUrl, defaultOptions);
        }
        return response;
      } finally {
        isRefreshing = false;
        refreshPromise = null;
      }
    }

    return response;
  } catch (error) {
    console.error("Fetch error:", error);
    throw error;
  }
}
