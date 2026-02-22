import { login, register, checkAuth } from "./authAPI.js";
import { gsap } from "gsap";
import { showMainMenu } from "../ui/showMainMenu.js";

export function createAuthMenu(type = "login") {
  const menu = document.querySelector(".menu");
  if (!menu) return;

  const isLogin = type === "login";

  menu.className = "menu menu-auth";
  menu.innerHTML = `
    <div class="auth-content">
      <header class="auth-header">
        <h1 class="auth-title title">${isLogin ? "LOGIN" : "REGISTER"}</h1>
        <p class="auth-subtitle">${isLogin ? "Sign in to your account" : "Create a new account"}</p>
      </header>

      <form class="auth-form" id="auth-form">
        <div class="auth-input-section">
          <label class="auth-label">USERNAME</label>
          <div class="auth-input-wrapper">
            <input 
              type="text" 
              class="auth-input" 
              id="auth-username"
              name="username"
              placeholder="Enter username"
              required
              autocomplete="username"
            />
          </div>
        </div>

        ${
          !isLogin
            ? `
        <div class="auth-input-section">
          <label class="auth-label">EMAIL</label>
          <div class="auth-input-wrapper">
            <input 
              type="email" 
              class="auth-input" 
              id="auth-email"
              name="email"
              placeholder="Enter email"
              required
              autocomplete="email"
            />
          </div>
        </div>
        `
            : ""
        }

        <div class="auth-input-section">
          <label class="auth-label">PASSWORD</label>
          <div class="auth-input-wrapper">
            <input 
              type="password" 
              class="auth-input" 
              id="auth-password"
              name="password"
              placeholder="Enter password"
              required
              autocomplete="${isLogin ? "current-password" : "new-password"}"
            />
          </div>
        </div>

        ${
          !isLogin
            ? `
        <div class="auth-input-section">
          <label class="auth-label">REPEAT PASSWORD</label>
          <div class="auth-input-wrapper">
            <input 
              type="password" 
              class="auth-input" 
              id="auth-password-repeat"
              name="passwordRepeat"
              placeholder="Repeat password"
              required
              autocomplete="new-password"
            />
          </div>
        </div>
        `
            : ""
        }

        <div class="auth-error" id="auth-error"></div>

        <div class="auth-footer">
          <button type="submit" class="menu-btn auth-submit-btn" id="auth-submit-btn">
            <span class="label">${isLogin ? "LOGIN" : "REGISTER"}</span>
          </button>
          <button type="button" class="menu-btn auth-switch-btn" id="auth-switch-btn">
            <span class="label">${isLogin ? "SIGN UP" : "SIGN IN"}</span>
          </button>
          <button type="button" class="menu-btn auth-back-btn" id="auth-back-btn">
            <span class="label">BACK</span>
          </button>
        </div>
      </form>
    </div>
  `;

  const buttons = document.querySelectorAll(".menu-btn");

  const form = menu.querySelector("#auth-form");
  const usernameInput = menu.querySelector("#auth-username");
  const passwordInput = menu.querySelector("#auth-password");
  const emailInput = menu.querySelector("#auth-email");
  const passwordRepeatInput = menu.querySelector("#auth-password-repeat");
  const errorDiv = menu.querySelector("#auth-error");
  const submitBtn = menu.querySelector("#auth-submit-btn");
  const switchBtn = menu.querySelector("#auth-switch-btn");
  const backBtn = menu.querySelector("#auth-back-btn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const rawUsername = usernameInput.value.trim();
    const username = isLogin ? rawUsername.toLowerCase() : rawUsername;
    const password = passwordInput.value;
    const email = emailInput?.value.trim();
    const passwordRepeat = passwordRepeatInput?.value;

    errorDiv.textContent = "";
    errorDiv.style.display = "none";

    if (!username || !password) {
      showError("Please fill in all required fields");
      return;
    }

    if (!isLogin) {
      if (!email) {
        showError("Please enter your email");
        return;
      }
      if (password !== passwordRepeat) {
        showError("Passwords do not match");
        return;
      }
      if (password.length < 6) {
        showError("Password must be at least 6 characters");
        return;
      }
    }

    submitBtn.disabled = true;
    const originalText = submitBtn.querySelector(".label").textContent;
    submitBtn.querySelector(".label").textContent = isLogin
      ? "LOGGING IN..."
      : "REGISTERING...";

    try {
      let result;
      if (isLogin) {
        result = await login(username, password);
      } else {
        result = await register(username, password, email);
      }

      if (result.success) {
        submitBtn.querySelector(".label").textContent = "SUCCESS!";
        submitBtn.classList.add("is-active");

        localStorage.setItem(
          "userData",
          JSON.stringify({
            username: username,
            icon: "/assets/icon1_default.jpg",
            theme: "classic",
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            rating: 1500,
          }),
        );

        setTimeout(async () => {
          const authCheck = await checkAuth();
          if (authCheck.success) {
            showMainMenu();
          } else {
            showError("Authentication failed. Please try again.");
            submitBtn.disabled = false;
            submitBtn.querySelector(".label").textContent = originalText;
          }
        }, 1500);
      } else {
        showError(result.message);
        submitBtn.disabled = false;
        submitBtn.querySelector(".label").textContent = originalText;
      }
    } catch (error) {
      showError(error.message || "An error occurred");
      submitBtn.disabled = false;
      submitBtn.querySelector(".label").textContent = originalText;
    }
  });

  switchBtn.addEventListener("click", () => {
    createAuthMenu(isLogin ? "register" : "login");
  });

  if (backBtn) {
    backBtn.style.display = "none";
  }

  function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = "block";
    gsap.fromTo(
      errorDiv,
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.3 },
    );
  }
}
