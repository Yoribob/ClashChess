import socket from "../index.js";
import { showLobbyUI } from "../../ui/showLobby.js";

let handlersRegistered = false;

export function registerLobbyHandlers() {
  if (handlersRegistered) return;
  
  socket.on("lobby:update", ({ lobbyId, users, action }) => {
    showLobbyUI(lobbyId, users);
  });

  socket.on("lobby:error", ({ message, event }) => {
    console.error(`Lobby error (${event}):`, message);
  });
  
  handlersRegistered = true;
}

export function emitLobbyCreate(lobbyId, userId) {
  socket.emit("lobby:create", { lobbyId, userId });
}

export function emitLobbyJoin(lobbyId, userId) {
  socket.emit("lobby:join", { lobbyId, userId });
}

export function emitLobbyReady(lobbyId, userId, ready) {
  socket.emit("lobby:ready", { lobbyId, userId, ready });
}
