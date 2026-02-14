import { joinLobby } from "../../socket/LobbyJoin.js";
import { BtnPressAnim } from "./shared.js";
import { showMainMenu } from "../showMainMenu.js";

export function handleJoinMenu(menu) {
  menu.className = "menu menu-join";
  menu.innerHTML = `
    <button class="menu-close-btn" type="button" aria-label="Close join lobby">✖</button>
    <div class="join-content">
      <header class="join-header">
        <h1 class="join-title title">JOIN LOBBY</h1>
        <p class="join-subtitle">Enter the lobby code to join a game</p>
      </header>
      <span class="join-code-label">ROOM CODE</span>
      <div class="join-input-section">
        <div class="join-input-wrapper">
          <button class="join-paste-btn" type="button">PASTE</button>
          <input 
            type="text" 
            class="join-code-input" 
            placeholder="Enter lobby code"
            maxlength="6"
            autocomplete="off"
          />
          <button class="join-submit-btn" type="button" id="join-submit-btn">
            <span>JOIN</span>
          </button>
        </div>
      </div>
    </div>
  `;

  BtnPressAnim();
  joinLobby();

  const closeBtn = menu.querySelector(".menu-close-btn");
  closeBtn?.addEventListener("click", () => {
    showMainMenu(true);
  });
}
