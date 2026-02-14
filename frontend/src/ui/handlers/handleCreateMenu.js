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
        <h2 class="title create-subtitle" data-section="mode">MATCH MODE</h2>
        <div class="create-type flex-row">
          <div class="type type-classic create-btn menu-btn">
            <span class="label">CLASSIC</span>
          </div>
          <div class="type type-custom create-btn menu-btn">
            <span class="label">CUSTOM</span>
          </div>
        </div>
      </div>

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

      <div class="create-section create-section-minigames">
        <h2 class="title create-subtitle" data-section="minigames">MINIGAMES</h2>
        <div class="create-minigames">
          <div class="menu-btn create-btn" data-minigame="math"><span class="label">MATH</span></div>
          <div class="menu-btn create-btn" data-minigame="qte"><span class="label">QTE</span></div>
          <div class="menu-btn create-btn" data-minigame="quiz"><span class="label">QUIZ</span></div>
          <div class="menu-btn create-btn" data-minigame="placeh1"><span class="label">PLACEH1</span></div>
          <div class="menu-btn create-btn" data-minigame="placeh2"><span class="label">PLACEH2</span></div>
          <div class="menu-btn create-btn" data-minigame="placeh3"><span class="label">PLACEH3</span></div>
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

  menu.querySelector(".type-custom")?.classList.add("selected");
  menu.querySelector(".theme-classic")?.classList.add("selected");

  const modeBtns = menu.querySelectorAll(".type");
  const themeBtns = menu.querySelectorAll(".theme");
  const minigameBtns = menu.querySelectorAll(".create-minigames .create-btn");
  const minigamesSection = menu.querySelector(".create-section-minigames");
  const minigamesSubtitle = menu.querySelector('[data-section="minigames"]');

  let switchTl = null;

  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const isClassic = btn.classList.contains("type-classic");

      modeBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");

      minigamesSection?.classList.toggle("disabled", isClassic);
      minigameBtns.forEach((b) => {
        b.classList.remove("selected");
        b.style.pointerEvents = isClassic ? "none" : "";
        b.style.opacity = isClassic ? "0.5" : "";
      });

      minigamesSubtitle?.classList.add("no-anim");

      if (switchTl) switchTl.kill();
      switchTl = gsap.timeline({ defaults: { ease: "power2.out", overwrite: "auto" } });

      if (isClassic) {
        minigamesSection?.classList.remove("slide-over");
        minigamesSection?.classList.add("slide-under");
        minigamesSubtitle?.classList.remove("pulse");
        switchTl.to(minigamesSubtitle, { opacity: 0.5, y: 5, duration: 0.45 }, 0);
        switchTl.to(minigamesSection, { y: 15, scale: 0.92, opacity: 0.6, duration: 0.45 }, 0);
      } else {
        minigamesSection?.classList.remove("slide-under");
        minigamesSection?.classList.add("slide-over");
        minigamesSubtitle?.classList.add("pulse");
        switchTl.to(minigamesSubtitle, { opacity: 1, y: 0, duration: 0.45 }, 0);
        switchTl.to(minigamesSection, { y: 0, scale: 1, opacity: 1, duration: 0.45 }, 0);
      }

    });
  });

  themeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      themeBtns.forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });

  minigameBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (menu.querySelector(".type-classic.selected")) return;
      btn.classList.toggle("selected");
    });
  });

  LobbyCreate();
}
