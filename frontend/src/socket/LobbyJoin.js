import socket from "./index.js";
import { showLobbyUI } from "../ui/showLobby";
import { fetchWithAuth } from "../utils/fetchWithAuth.js";

export async function joinLobby() {
  const joinBtn = document.querySelector(".join-submit-btn");
  const inputField = document.querySelector(".join-code-input");
  if (!joinBtn || !inputField) return;

  async function handleJoin() {
    const rawCode = inputField.value.trim();
    if (!rawCode) return alert("Enter a lobby code");
    const lobbyCode = rawCode.toUpperCase();

    const userRes = await fetchWithAuth("/api/user/me");
    if (!userRes.ok) return alert("Failed to get user data");
    const { user } = await userRes.json();
    joinBtn.disabled = true;

    try {
      const lobbyRes = await fetchWithAuth("/api/lobby/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          username: user.username,
          lobbyID: lobbyCode,
        }),
      });

      const data = await lobbyRes.json();
      if (!lobbyRes.ok) {
        alert(data.msg || data.error || "Failed to join lobby");
        return;
      }

      socket.emit("lobby:join", {
        lobbyId: lobbyCode,
        userId: user._id ?? user.id,
      });

      const currentUserId = String(user._id ?? user.id);
      const players = data.players || [];
      const lobby = data.lobby;
      const lobbyData = lobby
        ? {
            ...lobby,
            host: lobby.host
              ? { ...lobby.host, userId: String(lobby.host.userId ?? lobby.host._id) }
              : null,
            guest: lobby.guest
              ? { ...lobby.guest, userId: String(lobby.guest.userId ?? lobby.guest._id) }
              : null,
            players: lobby.players || players,
            currentUserId,
          }
        : {
            players,
            host: players[0]
              ? {
                  ...players[0],
                  userId: String(players[0].userId ?? players[0]._id),
                  username: players[0].username ?? "HOST",
                }
              : { userId: currentUserId, username: user.username ?? "Player", ready: false },
            guest: players[1]
              ? {
                  ...players[1],
                  userId: String(players[1].userId ?? players[1]._id),
                  username: players[1].username ?? "GUEST",
                }
              : null,
            currentUserId,
          };

      showLobbyUI(lobbyCode, lobbyData);

      if (!socket._lobbyListenersAdded) {
        socket._lobbyListenersAdded = true;
        socket.on("lobby:update", ({ lobbyId, users }) => {
          const list = users || [];
          const host = list[0]
            ? { ...list[0], userId: String(list[0].userId ?? list[0]._id), username: list[0].username ?? "HOST" }
            : {};
          const guest = list[1]
            ? { ...list[1], userId: String(list[1].userId ?? list[1]._id), username: list[1].username ?? "GUEST" }
            : null;
          showLobbyUI(lobbyId || lobbyCode, { host, guest, players: list });
        });
        socket.on("lobby:error", ({ message }) => alert(message || "Lobby error"));
      }
    } catch (err) {
      console.error("Join lobby error:", err);
      alert("Failed to join lobby");
    } finally {
      joinBtn.disabled = false;
    }
  }

  joinBtn.addEventListener("click", handleJoin);
  inputField.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleJoin();
  });
}
