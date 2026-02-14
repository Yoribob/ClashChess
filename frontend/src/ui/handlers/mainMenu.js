import { gsap } from "gsap";
import { BtnPressAnim } from "./shared.js";
import { handleCreateMenu } from "./handleCreateMenu.js";
import { handleJoinMenu } from "./handleJoinMenu.js";
import { handleProfileMenu } from "./handleProfileMenu.js";

export function initMainMenuButtons() {
  const casualBtn = document.querySelector(".casual");
  const rankedBtn = document.querySelector(".ranked");
  const profileBtn = document.querySelector(".profile-btn");

  if (casualBtn) {
    const newBtn = casualBtn.cloneNode(true); 
    casualBtn.parentNode.replaceChild(newBtn, casualBtn);

    newBtn.addEventListener("click", () => {
      const menuOptionsCard = document.querySelectorAll(".menu-option-card");
      const menuOptionsDesc = document.querySelectorAll(".menu-option-desc");
      const labels = document.querySelectorAll(".label");

      labels.forEach((label, i) => {
        label.classList.add("swap");
        label.style.opacity = "1 !important";
        label.style.transform = "translateX(30px)";
      });

      menuOptionsDesc.forEach((desc, i) => {
        desc.innerText =
          i === 0
            ? "Start a lobby and send the code to a friend"
            : "Join a lobby using a code";
      });

      const oldHeights = Array.from(menuOptionsCard).map((card) => {
        const h = card.offsetHeight;
        gsap.set(card, { height: h, overflow: "hidden" });
        return h;
      });

      requestAnimationFrame(() => {
        menuOptionsCard.forEach((card, i) => {
          gsap.set(card, { height: "auto" });
          const newH = card.offsetHeight;
          gsap.set(card, { height: oldHeights[i] });

          if (Math.abs(oldHeights[i] - newH) > 1) {
            gsap.to(card, {
              height: newH,
              duration: 0.4,
              ease: "power2.out",
              onComplete: () =>
                gsap.set(card, { clearProps: "height,overflow" }),
            });
          } else {
            gsap.set(card, { clearProps: "height,overflow" });
          }
        });
      });

      setTimeout(() => {
        labels.forEach((label, i) => {
          label.innerHTML = i === 0 ? "CREATE" : "JOIN";
          const overline = menuOptionsCard[i]?.querySelector(
            ".menu-option-overline"
          );
          if (overline)
            overline.innerText = i === 0 ? "Host Game" : "Join Game";
        });
      }, 250);

      labels.forEach((label) => {
        label.addEventListener("animationend", () =>
          label.classList.remove("swap")
        );
        gsap.set(label, { x: 0 });
      });

      setTimeout(() => {
        const menu = document.querySelector(".menu");
        menuOptionsCard.forEach((card) => {
          card.addEventListener(
            "click",
            () => {
              const label = card.querySelector(".label");
              if (
                label &&
                label.textContent.trim().toUpperCase() === "CREATE"
              ) {
                handleCreateMenu(menu);
              } else if (
                label &&
                label.textContent.trim().toUpperCase() === "JOIN"
              ) {
                handleJoinMenu(menu);
              }
            },
            { once: true }
          );
        });
      }, 300);
    });
  }

  if (rankedBtn) {
    const newBtn = rankedBtn.cloneNode(true);
    rankedBtn.parentNode.replaceChild(newBtn, rankedBtn);
  }

  if (profileBtn) {
    const newBtn = profileBtn.cloneNode(true);
    profileBtn.parentNode.replaceChild(newBtn, profileBtn);
    newBtn.addEventListener("click", () => handleProfileMenu());
  }

  BtnPressAnim();
}
