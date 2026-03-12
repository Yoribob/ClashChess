import { gsap } from "gsap";
import { LobbyCreate } from "../../socket/LobbyCreate.js";
import { BtnPressAnim } from "./shared.js";
import { showMainMenu } from "../showMainMenu.js";

export function handleCreateMenu(menu) {
  menu.className = "menu menu-create";
  menu.innerHTML = `
    <button class="menu-close-btn" type="button" aria-label="Close create lobby">×</button>
    <div class="create-content">
      <header class="create-header">
        <h1 class="create-title title">LOBBY SETTINGS</h1>
        <p class="create-description">Customize your lobby settings</p>
      </header>

      <div class="create-section">
        <h2 class="title create-subtitle" data-section="theme">THEME</h2>
        <div class="create-theme flex-row">
          <div class="theme theme-classic menu-btn create-btn">
            <span class="label">CLASSIC</span>
          </div>
          <div class="theme theme-cyberpunk menu-btn create-btn">
            <span class="label">CYBERPUNK</span>
          </div>
          <div class="theme theme-fantasy menu-btn create-btn">
            <span class="label">FANTASY</span>
          </div>
        </div>
      </div>

      <div class="create-section">
        <h2 class="title create-subtitle" data-section="timer">TIME CONTROL</h2>
        <div class="create-type flex-row">
          <div class="time time-10 create-btn menu-btn" data-minutes="10">
            <span class="label">10 MIN</span>
          </div>
          <div class="time time-15 create-btn menu-btn" data-minutes="15">
            <span class="label">15 MIN</span>
          </div>
          <div class="time time-30 create-btn menu-btn" data-minutes="30">
            <span class="label">30 MIN</span>
          </div>
          <div class="time time-60 create-btn menu-btn" data-minutes="60">
            <span class="label">60 MIN</span>
          </div>
          <div class="time time-90 create-btn menu-btn" data-minutes="90">
            <span class="label">90 MIN</span>
          </div>
        </div>
      </div>

      <div class="create-section">
        <h2 class="title create-subtitle" data-section="pieceColor">YOUR PIECE COLOR</h2>
        <div class="create-type flex-row create-color-row">
          <input class="piece-color-input" type="color" value="#f0d9b5" />
          <input class="piece-color-hex" type="text" value="#f0d9b5" maxlength="7" />
        </div>
      </div>

      <div class="create-footer create-done flex-row">
        <div class="menu-btn create-done-btn">
          <span class="label">DONE</span>
        </div>
      </div>
    </div>
  `;

  BtnPressAnim();

  const closeBtn = menu.querySelector(".menu-close-btn");
  closeBtn?.addEventListener("click", () => showMainMenu(true));

  menu.querySelector(".time-90")?.classList.add("selected");
  menu.querySelector(".theme-classic")?.classList.add("selected");

  const timeBtns = menu.querySelectorAll(".time");
  const themeBtns = menu.querySelectorAll(".theme");

  timeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      timeBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });

  themeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      themeBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });

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
      hexInput.value = String(colorInput.value || "#F0D9B5").toUpperCase();
    });
    hexInput.addEventListener("input", () => {
      const n = normalizeHex(hexInput.value);
      if (n) colorInput.value = n;
    });
  }

  LobbyCreate();
}
