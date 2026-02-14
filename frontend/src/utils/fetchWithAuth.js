import { refreshToken } from "../auth/authAPI.js";

let isRefreshing = false;
let refreshPromise = null;

export async function fetchWithAuth(url, options = {}) {
  const defaultOptions = {
    credentials: "include",
    ...options,
  };

  try {
    let response = await fetch(url, defaultOptions);

    if (response.status === 401) {
      if (isRefreshing && refreshPromise) {
        await refreshPromise;
        response = await fetch(url, defaultOptions);
        if (response.status === 401) {
          return response;
        }
        return response;
      }

      isRefreshing = true;
      refreshPromise = refreshToken();

      try {
        const refreshResult = await refreshPromise;
        if (refreshResult.success) {
          response = await fetch(url, defaultOptions);
          return response;
        } else {
          return response;
        }
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
