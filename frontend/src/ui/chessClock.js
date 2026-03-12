import { globalState } from "../config/globalState.js";

let rafId = null;

function formatMs(ms) {
  const safe = Math.max(0, Math.floor(ms || 0));
  const totalSec = Math.floor(safe / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function displayNameFromUser(u) {
  const n = u?.usernameOriginal ?? u?.username ?? null;
  if (n == null) return null;
  const cleaned = String(n).trim();
  if (!cleaned) return null;
  return cleaned.length > 16 ? `${cleaned.slice(0, 16)}...` : cleaned;
}

function resolvePlayerNames() {
  const users = globalState.lobbyUsers || [];
  const gamePlayers = globalState.chess?.gameId ? globalState.chess : null;
  const boardPlayers = globalState.chess?.board ? globalState.chess : null;

  const host = users?.[0] || null;
  const guest = users?.[1] || null;
  return {
    white: displayNameFromUser(host) || "WHITE",
    black: displayNameFromUser(guest) || "BLACK",
  };
}

function ensureClockUI() {
  let root = document.querySelector(".chess-clock");
  if (root) return root;

  root = document.createElement("div");
  root.className = "chess-clock";
  root.innerHTML = `
    <div class="clock-row clock-white">
      <div class="clock-name clock-name-white">WHITE</div>
      <div class="clock-time clock-time-white">0:00</div>
    </div>
    <div class="clock-row clock-black">
      <div class="clock-name clock-name-black">BLACK</div>
      <div class="clock-time clock-time-black">0:00</div>
    </div>
  `;
  document.body.appendChild(root);
  return root;
}

function readClockMs() {
  const st = globalState.chess?.clock;
  if (!st) return null;
  const now = Date.now();
  const lastAt = Number(st.lastAtMs || now);
  const running = st.running;
  const elapsed = Math.max(0, now - lastAt);
  let whiteMs = Number(st.whiteMs || 0);
  let blackMs = Number(st.blackMs || 0);
  if (globalState.chess?.status === "active") {
    if (running === "white") whiteMs = Math.max(0, whiteMs - elapsed);
    if (running === "black") blackMs = Math.max(0, blackMs - elapsed);
  }
  return { whiteMs, blackMs, running };
}

function renderClock() {
  const root = ensureClockUI();
  if (!root) return;

  const names = resolvePlayerNames();
  const ms = readClockMs();
  const isActiveGame =
    globalState.chess && globalState.chess.status === "active";

  root.style.display = isActiveGame ? "" : "none";
  if (!isActiveGame || !ms) return;

  const nameW = root.querySelector(".clock-name-white");
  const nameB = root.querySelector(".clock-name-black");
  const timeW = root.querySelector(".clock-time-white");
  const timeB = root.querySelector(".clock-time-black");
  if (nameW) nameW.textContent = names.white;
  if (nameB) nameB.textContent = names.black;
  if (timeW) timeW.textContent = formatMs(ms.whiteMs);
  if (timeB) timeB.textContent = formatMs(ms.blackMs);

  root.classList.toggle("running-white", ms.running === "white");
  root.classList.toggle("running-black", ms.running === "black");
}

export function initChessClockUI() {
  ensureClockUI();
  if (rafId != null) return;
  const loop = () => {
    renderClock();
    rafId = window.requestAnimationFrame(loop);
  };
  rafId = window.requestAnimationFrame(loop);
}

export function destroyChessClockUI() {
  if (rafId != null) {
    window.cancelAnimationFrame(rafId);
    rafId = null;
  }
  const root = document.querySelector(".chess-clock");
  if (root && root.parentNode) root.parentNode.removeChild(root);
}
