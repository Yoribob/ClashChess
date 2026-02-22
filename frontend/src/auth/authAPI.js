import { API_BASE, API_ORIGIN } from "../config/api.js";

function safeParseJson(response) {
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return null;
  }
  return response.json();
}

export async function checkAuth() {
  try {
    console.log("API_BASE:", API_BASE);
    const response = await fetch(`${API_BASE}/user/me`, {
      method: "GET",
      credentials: "include",
    });

    if (response.ok) {
      const data = await safeParseJson(response);
      if (!data) {
        console.warn(
          "Auth check: expected JSON but got non-JSON response. Is the backend running? Proxy configured?",
        );
        return { success: false };
      }
      if (data.user) {
        const userData = {
          _id: data.user._id,
          username: data.user.username,
          usernameOriginal: data.user.usernameOriginal ?? data.user.username,
          icon: data.user.avatar
            ? `${API_ORIGIN}${data.user.avatar}`
            : "/assets/icon1_default.jpg",
          theme: "classic",
          gamesPlayed: data.user.gamesPlayed || 0,
          wins: data.user.gamesWon || 0,
          losses: data.user.gamesLost || 0,
          rating: data.user.ranking || 1500,
        };
        localStorage.setItem("userData", JSON.stringify(userData));
      }
      return { success: true, user: data.user };
    } else if (response.status === 401) {
      const refreshResult = await refreshToken();
      if (refreshResult.success) {
        const retryResponse = await fetch(`${API_BASE}/user/me`, {
          method: "GET",
          credentials: "include",
        });
        if (retryResponse.ok) {
          const retryData = await safeParseJson(retryResponse);
          if (retryData?.user) return { success: true, user: retryData.user };
        }
      }
      return { success: false };
    } else {
      return { success: false };
    }
  } catch (error) {
    console.error("Auth check error:", error);
    return { success: false };
  }
}

export async function login(username, password) {
  try {
    const response = await fetch(`${API_BASE}/auth`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.msg || "Login failed");
    }

    return { success: true, message: data.msg };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function register(username, password, email) {
  try {
    const response = await fetch(`${API_BASE}/reg`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        username,
        password,
        email,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.msg || "Registration failed");
    }

    return { success: true, message: data.msg };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function refreshToken() {
  try {
    const response = await fetch(`${API_BASE}/refresh-token`, {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.msg || "Token refresh failed");
    }

    return { success: true, message: data.msg };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

export async function logout() {
  try {
    const response = await fetch(`${API_BASE}/logout`, {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.msg || "Logout failed");
    }

    localStorage.removeItem("userData");

    return { success: true, message: data.msg };
  } catch (error) {
    return { success: false, message: error.message };
  }
}
