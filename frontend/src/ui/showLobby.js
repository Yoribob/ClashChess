import socket from "../socket/index.js";
import { showMainMenu } from "./showMainMenu.js";
import { API_ORIGIN } from "../config/api.js";

let _currentLobbyCode = null;
let _currentUserId = null;
let _lobbyTimerId = null;
let _lobbyTimerRemaining = 10;

function clearLobbyTimer() {
  if (_lobbyTimerId != null) {
    clearInterval(_lobbyTimerId);
    _lobbyTimerId = null;
  }
  _lobbyTimerRemaining = 10;
}

function avatarUrl(avatar) {
  if (!avatar) return null;
  if (typeof avatar !== "string") return null;
  if (avatar.startsWith("http")) return avatar;
  return avatar.startsWith("/") ? API_ORIGIN + avatar : API_ORIGIN + "/" + avatar;
}

function normalizeUserId(p) {
  if (!p) return p;
  const id = p.userId ?? p._id;
  return typeof id === "string" ? id : (id?.toString?.() ?? id?.$oid ?? id);
}

export function showLobbyUI(lobbyCode, data) {
  _currentLobbyCode = lobbyCode;
  _currentUserId = data?.currentUserId ?? _currentUserId;

  const host =
    data?.host ||
    (data?.players?.[0]
      ? { ...data.players[0], userId: normalizeUserId(data.players[0]) }
      : {});
  const guest =
    data?.guest ||
    (data?.players?.[1]
      ? { ...data.players[1], userId: normalizeUserId(data.players[1]) }
      : null);
  const displayName = (h) =>
    (h?.usernameOriginal ?? h?.username) != null &&
    (h?.usernameOriginal ?? h?.username) !== ""
      ? String(h.usernameOriginal ?? h.username)
      : null;
  const hostName = displayName(host) ?? "HOST";
  const guestName = displayName(guest) ?? "Waiting...";
  const defaultHostAvatar = new URL("/assets/icon_default.jpg", import.meta.url)
    .href;
  const defaultGuestAvatar = new URL(
    "/assets/icon_default.jpg",
    import.meta.url,
  ).href;
  const hostAvatar = avatarUrl(host?.avatar) || defaultHostAvatar;
  const guestAvatar = avatarUrl(guest?.avatar) || defaultGuestAvatar;
  const hostReady = host?.ready ? "is-ready" : "";
  const guestReady = guest?.ready ? "is-ready" : "";
  const guestStatusLabel = guest
    ? guest.ready
      ? "READY"
      : "NOT READY"
    : "WAITING";
  const bothReady = Boolean(host?.ready && guest?.ready);
  const currentUserReady =
    host && String(host.userId) === String(_currentUserId)
      ? host.ready
      : guest && String(guest.userId) === String(_currentUserId)
        ? guest.ready
        : false;

  const menu = document.querySelector(".menu");
  if (!menu) return;
  const isLobbyUpdate = menu.classList.contains("menu-lobby");
  if (isLobbyUpdate) menu.classList.add("lobby-no-entrance-anim");
  menu.className =
    "menu menu-lobby" + (isLobbyUpdate ? " lobby-no-entrance-anim" : "");
  menu.innerHTML = `
    <button class="menu-close-btn lobby-close-btn" type="button" aria-label="Exit lobby">✖</button>
    <div class="lobby-header">
      <h1 class="title lobby-title">LOBBY READY</h1>
      <p class="lobby-subtitle">Share this code with your opponent</p>

      <div class="lobby-room-code">
        <span class="lobby-room-code-label">ROOM CODE</span>
        <div class="lobby-room-code-display">
          <span class="lobby-room-code-value">${lobbyCode}</span>
          <button class="lobby-copy-btn" type="button">COPY CODE</button>
        </div>
      </div>
    </div>

    <div class="lobby-body">
      <!-- HOST -->
      <a class="lobby-player-card lobby-player-host ${hostReady}" data-player="host" data-userid="${
        host.userId || host._id || ""
      }" data-ready="${host.ready ? "true" : "false"}">
        <div class="player-avatar">
          <img src="${hostAvatar}" alt="Host avatar">
        </div>
        <div class="player-info">
          <span class="player-role">HOST</span>
          <span class="player-name">${hostName}</span>
        </div>
        <div class="player-status">
          <span class="status-indicator">${
            host.ready ? "READY" : "NOT READY"
          }</span>
        </div>
      </a>

      <div class="lobby-versus">
        <div class="versus-label">VS</div>
        <div class="versus-timer">
          <span class="timer-display">10</span>
          <span class="timer-label">${
            guest ? "Both players connected" : "Waiting for players..."
          }</span>
        </div>
      </div>

      <!-- GUEST -->
      <a class="lobby-player-card lobby-player-guest ${guestReady}" data-player="guest" data-userid="${
        guest?.userId || guest?._id || ""
      }" data-ready="${guest && guest.ready ? "true" : "false"}">
        <div class="player-avatar">
          <img src="${guestAvatar}" alt="Guest avatar">
        </div>
        <div class="player-info">
          <span class="player-role">GUEST</span>
          <span class="player-name">${guestName}</span>
        </div>
        <div class="player-status">
          <span class="status-indicator">${guestStatusLabel}</span>
        </div>
      </a>
    </div>
    <div class="lobby-footer">
      <button class="lobby-ready-btn menu-btn" type="button">
        <span class="label">${currentUserReady ? "NOT READY" : "READY"}</span>
      </button>
    </div>
  `;

  const copyBtn = menu.querySelector(".lobby-copy-btn");
  const readyBtn = menu.querySelector(".lobby-ready-btn");
  const exitBtn = menu.querySelector(".lobby-exit-btn");
  const versusBlock = menu.querySelector(".lobby-versus");
  const timerDisplay = menu.querySelector(".timer-display");
  const timerLabel = menu.querySelector(".timer-label");
  const profileBtn = document.querySelector(".profile-btn");

  if (profileBtn) {
    profileBtn.classList.add("is-disabled");
  }

  if (!bothReady) {
    clearLobbyTimer();
    versusBlock?.classList.remove("timer-active");
    if (timerDisplay) {
      timerDisplay.textContent = "10";
    }
    if (timerLabel) {
      timerLabel.textContent = guest
        ? "Both players connected"
        : "Waiting for players...";
    }
  } else {
    versusBlock?.classList.add("timer-active");
    if (_lobbyTimerId == null) {
      _lobbyTimerRemaining = 10;
      if (timerDisplay) {
        timerDisplay.textContent = String(_lobbyTimerRemaining);
      }
      if (timerLabel) {
        timerLabel.textContent = "Both players ready";
      }
      _lobbyTimerId = window.setInterval(() => {
        _lobbyTimerRemaining -= 1;
        const lobbyMenu = document.querySelector(".menu.menu-lobby");
        if (!lobbyMenu) {
          clearLobbyTimer();
          return;
        }
        const displayEl = lobbyMenu.querySelector(".timer-display");
        const labelEl = lobbyMenu.querySelector(".timer-label");
        const versusEl = lobbyMenu.querySelector(".lobby-versus");

        const safeRemaining =
          typeof _lobbyTimerRemaining === "number"
            ? Math.max(_lobbyTimerRemaining, 0)
            : 0;

        if (displayEl) {
          displayEl.textContent = String(safeRemaining);
        }
        if (labelEl) {
          if (safeRemaining > 0) {
            labelEl.textContent = "Both players ready";
          } else {
            labelEl.textContent = "Starting...";
            alert("Game will be started (TBI)");
          }
        }
        if (safeRemaining <= 0) {
          clearLobbyTimer();
          versusEl?.classList.remove("timer-active");
        }
      }, 1000);
    }
  }

  if (readyBtn) {
    let isReady = Boolean(currentUserReady);

    readyBtn.classList.toggle("is-ready", isReady);
    readyBtn.classList.add("no-anim");

    readyBtn.addEventListener("click", () => {
      if (!_currentLobbyCode || !_currentUserId) return;

      isReady = !isReady;
      readyBtn.classList.toggle("is-ready", isReady);
      readyBtn.querySelector(".label").textContent = isReady
        ? "NOT READY"
        : "READY";

      socket.emit("lobby:ready", {
        lobbyId: _currentLobbyCode,
        userId: _currentUserId,
        ready: isReady,
      });
    });
  }

  const closeBtn = menu.querySelector(".lobby-close-btn");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      if (_currentLobbyCode) {
        socket.emit("lobby:leave", {
          lobbyId: _currentLobbyCode,
          userId: _currentUserId || undefined,
        });
      }
      _currentLobbyCode = null;
      _currentUserId = null;
      showMainMenu(true);
    });
  }
  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(lobbyCode);
      copyBtn.textContent = "COPIED!";
      setTimeout(() => (copyBtn.textContent = "COPY CODE"), 1500);
    } catch {
      copyBtn.textContent = "FAILED";
      setTimeout(() => (copyBtn.textContent = "COPY CODE"), 1500);
    }
  });
}
