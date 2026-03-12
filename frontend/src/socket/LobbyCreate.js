import socket from "./index.js";
import { showLobbyUI } from "../ui/showLobby";
import { fetchWithAuth } from "../utils/fetchWithAuth.js";
import { globalState } from "../config/globalState.js";

function collectLobbySettings() {
  const themeBtn = document.querySelector(".theme.selected");
  const timeBtn = document.querySelector(".time.selected");

  let theme = "classic";
  if (themeBtn?.classList.contains("theme-cyberpunk")) {
    theme = "cyberpunk";
  } else if (themeBtn?.classList.contains("theme-fantasy")) {
    theme = "fantasy";
  }

  let minutes = 5;
  const raw = timeBtn?.dataset?.minutes;
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed) && parsed > 0) minutes = parsed;

  return { theme, timeMinutes: minutes };
}

export async function LobbyCreate() {
  const doneBtn = document.querySelector(".create-done-btn");
  if (!doneBtn) return;

  doneBtn.addEventListener("click", async () => {
    const userRes = await fetchWithAuth("/api/user/me");
    if (!userRes.ok) return alert("Failed to get user data");
    const { user } = await userRes.json();

    const settings = collectLobbySettings();
    const pieceColor = document.querySelector(".piece-color-input")?.value || null;

    const res = await fetchWithAuth("/api/lobby/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user._id || user.id,
        settings,
        pieceColor,
      }),
    });

    if (!res.ok) return alert("Failed to create lobby");
    const data = await res.json();
    const lobbyCode = data.lobbyID;

    const currentUserId = user._id || user.id;
    const players = (data.players || []).map((p) => ({
      ...p,
      userId: p.userId?.toString?.() || p.userId,
    }));

    const lobbyData = {
      host: players[0]
        ? { ...players[0], userId: players[0].userId }
        : {
            userId: currentUserId,
            username: user.username,
            avatar: user.avatar,
            ready: false,
          },
      guest: players[1] || null,
      players,
      currentUserId,
      settings: data.settings || settings,
    };

    showLobbyUI(lobbyCode, lobbyData);

    socket.emit("lobby:create", {
      lobbyId: lobbyCode,
      userId: currentUserId,
    });

    if (!socket._lobbyListenersAdded) {
      socket._lobbyListenersAdded = true;

      const onLobbyUpdate = ({ lobbyId, users, settings: lobbySettings }) => {
        const list = users || [];
        globalState.lobbyUsers = list;
        const host = list[0]
          ? {
              ...list[0],
              userId: String(list[0].userId ?? list[0]._id),
              username: list[0].username ?? "HOST",
            }
          : {};
        const guest = list[1]
          ? {
              ...list[1],
              userId: String(list[1].userId ?? list[1]._id),
              username: list[1].username ?? "GUEST",
            }
          : null;
        showLobbyUI(lobbyId, {
          host,
          guest,
          players: list,
          settings: lobbySettings || data.settings || settings,
        });
      };

      socket._lobbyUpdateHandler = onLobbyUpdate;
      socket.on("lobby:update", onLobbyUpdate);
      socket.on("lobby:error", ({ message }) => alert(message || "Lobby error"));
    }
  });
}