import { globalState } from "../config/globalState.js";
import { showMainMenu } from "./showMainMenu.js";
import socket from "../socket/index.js";

let currentModal = null;
let currentRetryBtn = null;
let restartCountdownTimerId = null;
let restartCountdownValue = null;
let localRestartReady = false;
let currentLobbyIdForModal = null;
let currentRetryLabelSpan = null;
let currentCountdownRow = null;
let listenersAttached = false;
let manuallyLeftLobby = false;

export function closeGameOverModal() {
  if (currentModal && currentModal.parentNode) {
    currentModal.parentNode.removeChild(currentModal);
  }
  currentModal = null;
  currentRetryBtn = null;
  currentRetryLabelSpan = null;
  currentCountdownRow = null;
  currentLobbyIdForModal = null;
  localRestartReady = false;
  manuallyLeftLobby = false;
  if (restartCountdownTimerId != null) {
    window.clearInterval(restartCountdownTimerId);
    restartCountdownTimerId = null;
    restartCountdownValue = null;
  }
}

export function showGameOverModal(game) {
  if (!game || !game.status || game.status === "active") return;

  closeGameOverModal();

  const status = game.status;
  const lobbyId = globalState.chess?.lobbyId || null;
  const userId = globalState.chess?.userId || null;
  currentLobbyIdForModal = lobbyId;

  const overlay = document.createElement("div");
  overlay.className = "game-over-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background =
    "radial-gradient(circle at top, rgba(240,217,181,0.16), transparent 55%), rgba(0,0,0,0.85)";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.zIndex = "50";

  const panel = document.createElement("div");
  panel.style.minWidth = "380px";
  panel.style.maxWidth = "520px";
  panel.style.padding = "26px 30px 20px";
  panel.style.borderRadius = "12px";
  panel.style.background =
    "linear-gradient(145deg, rgba(24,17,7,0.97), rgba(41,26,12,0.98))";
  panel.style.boxShadow =
    "0 18px 40px rgba(0,0,0,0.85), 0 0 0 1px rgba(240,217,181,0.07)";
  panel.style.display = "flex";
  panel.style.flexDirection = "column";
  panel.style.gap = "12px";
  panel.style.color = "#f8f8ff";
  panel.style.fontFamily = "system-ui, sans-serif";
  panel.style.lineHeight = "1.4";

  const title = document.createElement("div");
  title.style.fontSize = "22px";
  title.style.fontWeight = "700";
  title.style.marginTop = "6px";
  title.style.marginBottom = "2px";
  title.style.letterSpacing = "0.03em";
  title.style.textTransform = "uppercase";
  title.textContent =
    status === "checkmate"
      ? "Checkmate"
      : status === "stalemate"
        ? "Stalemate"
        : status === "draw"
          ? "Draw"
          : status === "timeout"
            ? "Time"
            : "Game Over";

  const playerColor = globalState.chess?.color;
  let resultText = "Game finished.";

  let currentUsername = null;
  try {
    const raw = window.localStorage?.getItem("userData");
    if (raw) {
      const parsed = JSON.parse(raw);
      const rawName =
        parsed.usernameOriginal && String(parsed.usernameOriginal).trim().length
          ? String(parsed.usernameOriginal).trim()
          : parsed.username && String(parsed.username).trim().length
            ? String(parsed.username).trim()
            : null;
      if (rawName) {
        currentUsername =
          rawName.length > 16 ? `${rawName.slice(0, 16)}...` : rawName;
      }
    }
  } catch {}

  let winnerName = null;

  if (status === "checkmate") {
    const loserColor = game.turn;
    const winnerColor = loserColor === "white" ? "black" : "white";
    const winnerIsPlayer = playerColor === winnerColor;

    const winnerIdFromGame = game?.players?.[winnerColor] ?? null;
    const lobbyUsers = globalState.lobbyUsers || [];
    if (winnerIdFromGame && Array.isArray(lobbyUsers)) {
      const wid = String(winnerIdFromGame);
      const match = lobbyUsers.find(
        (u) => String(u?.userId ?? u?._id ?? "") === wid,
      );
      const rawLobbyName = match?.usernameOriginal ?? match?.username ?? null;
      if (rawLobbyName && String(rawLobbyName).trim().length) {
        const cleaned = String(rawLobbyName).trim();
        winnerName =
          cleaned.length > 16 ? `${cleaned.slice(0, 16)}...` : cleaned;
      }
    }

    const rawWinnerName =
      game.winnerUsernameOriginal ||
      game.winnerUsername ||
      game.winnerName ||
      null;
    if (rawWinnerName && String(rawWinnerName).trim().length) {
      const cleaned = String(rawWinnerName).trim();
      winnerName = cleaned.length > 16 ? `${cleaned.slice(0, 16)}...` : cleaned;
    }

    if (!winnerName && winnerIsPlayer && currentUsername) {
      winnerName = currentUsername;
    }

    if (!winnerName) winnerName = "Player";
    resultText = `${winnerName} wins by checkmate.`;
  } else if (status === "timeout") {
    const loserColor = game.turn;
    const winnerColor = loserColor === "white" ? "black" : "white";
    const winnerIdFromGame = game?.players?.[winnerColor] ?? null;
    const lobbyUsers = globalState.lobbyUsers || [];
    if (winnerIdFromGame && Array.isArray(lobbyUsers)) {
      const wid = String(winnerIdFromGame);
      const match = lobbyUsers.find(
        (u) => String(u?.userId ?? u?._id ?? "") === wid,
      );
      const rawLobbyName = match?.usernameOriginal ?? match?.username ?? null;
      if (rawLobbyName && String(rawLobbyName).trim().length) {
        const cleaned = String(rawLobbyName).trim();
        winnerName =
          cleaned.length > 16 ? `${cleaned.slice(0, 16)}...` : cleaned;
      }
    }
    if (!winnerName && currentUsername) winnerName = currentUsername;
    if (!winnerName) winnerName = "Player";
    resultText = `${winnerName} wins on time.`;
  } else if (status === "stalemate" || status === "draw") {
    resultText =
      status === "stalemate"
        ? "Game ended in stalemate."
        : "The game ended in a draw.";
  }

  const result = document.createElement("div");
  result.style.fontSize = "14px";
  result.style.opacity = "0.92";
  result.style.marginBottom = "2px";
  result.textContent = resultText;

  const countdownRow = document.createElement("div");
  countdownRow.style.fontSize = "12px";
  countdownRow.style.opacity = "0.85";
  countdownRow.style.marginTop = "2px";
  countdownRow.style.minHeight = "1.2em";
  currentCountdownRow = countdownRow;

  const buttonsRow = document.createElement("div");
  buttonsRow.style.display = "flex";
  buttonsRow.style.justifyContent = "flex-end";
  buttonsRow.style.gap = "8px";
  buttonsRow.style.marginTop = "12px";

  const retryBtn = document.createElement("button");
  const retryLabelSpan = document.createElement("span");
  retryLabelSpan.textContent = "Retry (0/2)";
  retryBtn.appendChild(retryLabelSpan);
  retryBtn.style.padding = "6px 12px";
  retryBtn.style.borderRadius = "4px";
  retryBtn.style.border = "none";
  retryBtn.style.cursor = "pointer";
  retryBtn.style.background = "#f0d9b5";
  retryBtn.style.color = "#222";
  retryBtn.style.fontWeight = "600";
  retryBtn.addEventListener("click", () => {
    if (!lobbyId || !userId) {
      window.location.reload();
      return;
    }
    localRestartReady = !localRestartReady;
    socket.emit("chess:restartReady", {
      lobbyId,
      userId,
      ready: localRestartReady,
    });
  });

  const menuBtn = document.createElement("button");
  menuBtn.textContent = "Back to menu";
  menuBtn.style.padding = "6px 12px";
  menuBtn.style.borderRadius = "4px";
  menuBtn.style.border = "none";
  menuBtn.style.cursor = "pointer";
  menuBtn.style.background = "#8b4513";
  menuBtn.style.color = "#f8f8ff";
  menuBtn.style.fontWeight = "600";
  menuBtn.addEventListener("click", () => {
    if (lobbyId && userId) {
      socket.emit("lobby:leave", { lobbyId, userId });
    }
    if (socket._lobbyUpdateHandler) {
      socket.off("lobby:update", socket._lobbyUpdateHandler);
      socket._lobbyUpdateHandler = null;
    }
    socket._lobbyListenersAdded = false;
    manuallyLeftLobby = true;
    closeGameOverModal();
    window.dispatchEvent(new CustomEvent("leaveGame"));
  });

  buttonsRow.appendChild(menuBtn);
  buttonsRow.appendChild(retryBtn);

  panel.appendChild(title);
  panel.appendChild(result);
  panel.appendChild(countdownRow);
  panel.appendChild(buttonsRow);
  overlay.appendChild(panel);

  document.body.appendChild(overlay);
  currentModal = overlay;
  currentRetryBtn = retryBtn;
  currentRetryLabelSpan = retryLabelSpan;

  if (!listenersAttached) {
    listenersAttached = true;

    socket.on(
      "chess:restartUpdate",
      ({ lobbyId: payloadLobbyId, totalPlayers, readyPlayers }) => {
        if (!currentModal || !currentRetryLabelSpan) return;
        if (
          !currentLobbyIdForModal ||
          payloadLobbyId !== currentLobbyIdForModal
        )
          return;
        const total = totalPlayers || 0;
        const ready = readyPlayers || 0;
        currentRetryLabelSpan.textContent = `Retry (${ready}/${total || 2})`;
      },
    );

    socket.on("lobby:update", ({ lobbyId: updatedLobbyId, users }) => {
      if (manuallyLeftLobby) return;
      if (!currentModal || !currentLobbyIdForModal) return;
      if (updatedLobbyId !== currentLobbyIdForModal) return;
      const list = users || [];
      if (list.length >= 2) return;

      if (currentRetryBtn) {
        currentRetryBtn.disabled = true;
        currentRetryBtn.style.opacity = "0.6";
        currentRetryBtn.style.cursor = "default";
        currentRetryBtn.textContent = "Retry unavailable";
      }

      if (restartCountdownTimerId != null) return;

      restartCountdownValue = 3;
      const updateCountdownText = () => {
        if (!currentCountdownRow) return;
        currentCountdownRow.textContent = `Going back to menu in ${restartCountdownValue}...`;
      };
      updateCountdownText();
      restartCountdownTimerId = window.setInterval(() => {
        restartCountdownValue -= 1;
        if (restartCountdownValue <= 0) {
          window.clearInterval(restartCountdownTimerId);
          restartCountdownTimerId = null;
          restartCountdownValue = null;
          const leaveLobbyId = currentLobbyIdForModal;
          const leaveUserId = globalState.chess?.userId;
          if (leaveLobbyId && leaveUserId) {
            socket.emit("lobby:leave", {
              lobbyId: leaveLobbyId,
              userId: leaveUserId,
            });
          }
          if (socket._lobbyUpdateHandler) {
            socket.off("lobby:update", socket._lobbyUpdateHandler);
            socket._lobbyUpdateHandler = null;
          }
          socket._lobbyListenersAdded = false;
          closeGameOverModal();
          window.dispatchEvent(new CustomEvent("leaveGame"));
        } else {
          updateCountdownText();
        }
      }, 1000);
    });
  }
}
