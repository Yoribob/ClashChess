import { gsap } from "gsap";
import { BtnPressAnim } from "./shared.js";
import { handleCreateMenu } from "./handleCreateMenu.js";
import { handleJoinMenu } from "./handleJoinMenu.js";
import { handleProfileMenu } from "./handleProfileMenu.js";
import { globalState } from "../../config/globalState.js";
import { createInitialBoard } from "../../game/boardEngine.js";
import { setViewMode } from "../miniBoard.js";
import { showGameOverModal } from "../gameOverModal.js";

export function initMainMenuButtons() {
  const casualBtn = document.querySelector(".casual");
  const rankedBtn = document.querySelector(".ranked");
  const profileBtn = document.querySelector(".profile-btn");
  const quickTestBtn = document.querySelector(".quick-test-btn");
  const quickGameOverBtn = document.querySelector(".quick-gameover-btn");

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

  if (quickTestBtn) {
    const newBtn = quickTestBtn.cloneNode(true);
    quickTestBtn.parentNode.replaceChild(newBtn, quickTestBtn);
    newBtn.addEventListener("click", () => {
      const board = createInitialBoard();
      const castling = {
        whiteKingSide: true,
        whiteQueenSide: true,
        blackKingSide: true,
        blackQueenSide: true,
      };
      const game = {
        _id: "local",
        players: { white: "local", black: "local" },
        board,
        turn: "white",
        status: "active",
        castling,
        enPassantTarget: null,
      };

      globalState.currentPlayer = "w";
      globalState.chess = {
        lobbyId: "local",
        gameId: null,
        color: "white",
        userId: "local",
        status: "active",
        mode: "classic",
        enPassantTarget: null,
        castling,
        board,
      };

      window.dispatchEvent(
        new CustomEvent("lobbyCreated", {
          detail: {
            game,
            settings: { theme: "classic", mode: "classic" },
            color: "white",
          },
        })
      );

      setTimeout(() => setViewMode("2d"), 200);
    });
  }

  if (quickGameOverBtn) {
    const newBtn = quickGameOverBtn.cloneNode(true);
    quickGameOverBtn.parentNode.replaceChild(newBtn, quickGameOverBtn);
    newBtn.addEventListener("click", () => {
      
      
      let winnerUsernameOriginal = null;
      try {
        const raw = window.localStorage.getItem("userData");
        if (raw) {
          const parsed = JSON.parse(raw);
          const rawName =
            parsed.usernameOriginal &&
            String(parsed.usernameOriginal).trim().length
              ? String(parsed.usernameOriginal).trim()
              : parsed.username && String(parsed.username).trim().length
              ? String(parsed.username).trim()
              : null;
          winnerUsernameOriginal = rawName;
        }
      } catch {
        
      }

      const mockGame = {
        status: "checkmate",
        turn: "black", 
        winnerUsernameOriginal: winnerUsernameOriginal,
      };
      showGameOverModal(mockGame);
    });
  }

  BtnPressAnim();
}
