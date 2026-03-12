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

      <div class="join-input-section" style="margin-top:14px;">
        <span class="join-code-label" style="margin: 0 0 10px;">YOUR PIECE COLOR</span>
        <div class="join-input-wrapper join-color-row">
          <input class="piece-color-input" type="color" value="#8A8A8A" />
          <input class="piece-color-hex" type="text" value="#8A8A8A" maxlength="7" />
        </div>
      </div>
    </div>
  `;

  BtnPressAnim();
  joinLobby();

  const colorInput = menu.querySelector(".piece-color-input");
  const hexInput = menu.querySelector(".piece-color-hex");
  const normalizeHex = (v) => {
    if (!v) return null;
    const s = String(v).trim();
    const withHash = s.startsWith("#") ? s : `#${s}`;
    return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : null;
  };
  if (colorInput && hexInput) {
    colorInput.addEventListener("input", () => {
      hexInput.value = String(colorInput.value || "#8A8A8A").toUpperCase();
    });
    hexInput.addEventListener("input", () => {
      const n = normalizeHex(hexInput.value);
      if (n) colorInput.value = n;
    });
  }

  const closeBtn = menu.querySelector(".menu-close-btn");
  closeBtn?.addEventListener("click", () => {
    showMainMenu(true);
  });
}
