import { initMainMenuButtons } from "./handlers/mainMenu.js";
import { BtnPressAnim } from "./handlers/shared.js";
export function showMainMenu(isReturned = false) {
  const menu = document.querySelector(".menu");
  if (!menu) return;

  const profileBtn = document.querySelector(".profile-btn");
  if (profileBtn) {
    profileBtn.classList.remove("is-disabled");
  }

  menu.style.transform = "";
  menu.style.opacity = "";

  const menuClass = isReturned ? "menu menu-main returned" : "menu menu-main";
  menu.className = menuClass;
  menu.innerHTML = `
    <div class="menu-header">
      <h1 class="menu-title">PLAY</h1>
      <p class="menu-subtitle">3D CHESS GAME</p>
    </div>
    <div class="menu-options">
      <div class="menu-option-card casual menu-btn" data-action="create">
        <div class="menu-option-highlight"></div>
        <div class="menu-option-content">
          <span class="menu-option-overline">Host or Join</span>
          <span class="label">CASUAL</span>
          <p class="menu-option-desc">Play relaxed games with friends</p>
        </div>
      </div>
      <div class="menu-option-card ranked menu-btn" data-action="join">
        <div class="menu-option-highlight"></div>
        <div class="menu-option-content">
          <span class="menu-option-overline">Competitive</span>
          <span class="label">RANKED</span>
          <p class="menu-option-desc">(TBI)</p>
        </div>
      </div>
    </div>
    <div class="menu-footer">
      <span class="menu-footnote">Made with ❤️ by Yoribob</span>
    </div>
  `;

  initMainMenuButtons();
  BtnPressAnim();
}
