import { createAuthMenu } from "../../auth/authForm.js";
import { showMainMenu } from "../showMainMenu.js";
import { logout } from "../../auth/authAPI.js"
import { BtnPressAnim } from "./shared.js";
import { globalState } from "../../config/globalState.js";
import { fetchWithAuth } from "../../utils/fetchWithAuth.js";
import { API_ORIGIN } from "../../config/api.js";

export async function handleProfileMenu() {
  const menu = document.querySelector(".menu");
  if (!menu) return;

  const currentMenuClass = menu.className;
  if (currentMenuClass.includes("menu-main")) {
    globalState.previousMenu = "main";
  } else if (currentMenuClass.includes("menu-create")) {
    globalState.previousMenu = "create";
  } else if (currentMenuClass.includes("menu-join")) {
    globalState.previousMenu = "join";
  } else if (currentMenuClass.includes("menu-lobby")) {
    globalState.previousMenu = "lobby";
  } else {
    globalState.previousMenu = "main";
  }

  const defaultAvatarUrl = API_ORIGIN + "/uploads/avatars/default-avatar.png";
  let user = {
    username: "Player",
    usernameOriginal: "Player",
    avatar: defaultAvatarUrl,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    ranking: 1000,
  };

  try {
    const response = await fetchWithAuth("/api/user/me", { credentials: "include" });
    if (response.ok) {
      const data = await response.json();
      if (data.user) {
        user = {
          username: data.user.username || "Player",
          usernameOriginal: data.user.usernameOriginal || data.user.username,
          avatar: data.user.avatar ? (data.user.avatar.startsWith("http") ? data.user.avatar : API_ORIGIN + data.user.avatar) : defaultAvatarUrl,
          gamesPlayed: data.user.gamesPlayed || 0,
          gamesWon: data.user.gamesWon || 0,
          gamesLost: data.user.gamesLost || 0,
          ranking: data.user.ranking || 1000,
        };
      }
    }
  } catch (err) {
    console.error("Failed to fetch user data:", err);
  }

  menu.className = "menu menu-profile";
  menu.innerHTML = `
   <button class="menu-close-btn" type="button" aria-label="Close join lobby">✖</button>
    <div class="profile-content">
      <header class="profile-header">
        <h1 class="profile-title title">PROFILE</h1>
        <p class="profile-subtitle">Manage your account settings</p>
      </header>

      <div class="profile-section">
        <div class="profile-avatar-section">
          <span class="profile-section-label">AVATAR</span>
          <div class="profile-avatar-display">
            <div class="profile-avatar-wrapper">
              <img src="${user.avatar}" alt="Avatar" class="profile-avatar-img" id="profile-avatar-img">
              <button class="profile-avatar-change-btn" id="profile-avatar-change-btn"><span>CHANGE</span></button>
            </div>
          </div>
        </div>

        <div class="profile-username-section">
  <span class="profile-section-label">USERNAME</span>
  <div class="profile-username-wrapper">
    <span class="profile-username label">${user.usernameOriginal}</span>
  </div>
</div>

        <div class="profile-stats-section">
          <span class="profile-section-label">STATISTICS</span>
          <div class="profile-stats-grid">
  <div class="profile-stat-card">
    <span class="profile-stat-label">Games Played</span>
    <span class="profile-stat-value">${user.gamesPlayed}</span>
  </div>
  <div class="profile-stat-card">
    <span class="profile-stat-label">Wins</span>
    <span class="profile-stat-value">${user.gamesWon}</span>
  </div>
  <div class="profile-stat-card">
    <span class="profile-stat-label">Losses</span>
    <span class="profile-stat-value">${user.gamesLost}</span>
  </div>
  <div class="profile-stat-card">
    <span class="profile-stat-label">Rating</span>
    <span class="profile-stat-value">${user.ranking}</span>
  </div>
</div>

        </div>
      </div>

      <div class="profile-footer">
        
        <button class="menu-btn profile-logout-btn"><span class="label">LOGOUT</span></button>
      </div>
    </div>
  `;

  BtnPressAnim();

  const closeBtn = menu.querySelector(".menu-close-btn");
  closeBtn?.addEventListener("click", () => showMainMenu(true));

  const avatarImg = document.querySelector("#profile-avatar-img");
  const avatarChangeBtn = document.querySelector("#profile-avatar-change-btn");
  const logoutBtn = document.querySelector(".profile-logout-btn");

  const fileInput = document.createElement("input");
  fileInput.type = "file";
  fileInput.accept = "image/jpeg,image/png,image/webp";
  fileInput.style.display = "none";
  document.body.appendChild(fileInput);

  avatarChangeBtn?.addEventListener("click", () => fileInput.click());



  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return alert("Max size 5MB");

    const originalText = avatarChangeBtn.querySelector("span").textContent;
    avatarChangeBtn.querySelector("span").textContent = "UPLOADING...";
    avatarChangeBtn.disabled = true;

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch(API_ORIGIN + "/api/avatar", { method: "POST", credentials: "include", body: formData });
      const data = await res.json();
      if (res.ok) {
        avatarImg.src = data.avatarUrl.startsWith("http") ? data.avatarUrl : API_ORIGIN + data.avatarUrl;
        avatarChangeBtn.querySelector("span").textContent = "UPLOADED!";
      } else throw new Error(data.msg || "Upload failed");
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setTimeout(() => {
        avatarChangeBtn.querySelector("span").textContent = originalText;
        avatarChangeBtn.disabled = false;
      }, 1500);
      fileInput.value = "";
    }
  });


  logoutBtn?.addEventListener("click", async () => {
    console.log("ok");
    const originalText = logoutBtn.querySelector(".label").textContent;
    logoutBtn.querySelector(".label").textContent = "LOGGING OUT...";
    logoutBtn.disabled = true;

    const result = await logout();
    if (result.success) {
      logoutBtn.querySelector(".label").textContent = "LOGGED OUT!";
      setTimeout(() => createAuthMenu("login"), 1000);
    } else {
      logoutBtn.querySelector(".label").textContent = originalText;
      logoutBtn.disabled = false;
      alert("Logout failed: " + result.message);
    }
  });
}