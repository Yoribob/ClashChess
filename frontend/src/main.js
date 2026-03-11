import * as THREE from "three";

import { createCamera } from "./graphics/camera.js";
import { createRenderer } from "./graphics/renderer.js";
import { createBoard } from "./graphics/board.js";
import { createControls } from "./controls/orbit.js";
import { createSkyboxWithTheme } from "./graphics/skybox.js";
import {
  initLightsWithTheme,
  animateLights,
  removeLightsFromScene,
} from "./graphics/lights.js";
import { setupPostProcessing } from "./postprocessing.js";
import {
  setupClickHandler,
  animateMoveHighlights,
} from "./game/interaction.js";
import { PositionFromFEN, syncBoardFromBackend } from "./game/gameState.js";
import { setPieceTheme, pieces, loadedMeshes } from "./graphics/pieces.js";
import { showMainMenu } from "./ui/showMainMenu.js";
import { createAuthMenu } from "./auth/authForm.js";
import { checkAuth } from "./auth/authAPI.js";
import {
  globalState,
  initializeGlobalState,
  COLOR_SCHEME,
} from "./config/globalState.js";
import { InitMenuBg, UndoMenuBg } from "./graphics/menuBg.js";
import { closeGameOverModal } from "./ui/gameOverModal.js";
import socket from "./socket/index.js";
import { registerChessSocketHandlers } from "./socket/chess.js";
import { initMiniBoardUI } from "./ui/miniBoard.js";
import { showGameOverModal } from "./ui/gameOverModal.js";


const MENU_THEME = {
  scene: { fogColor: 0x8b4513, fogDensity: 0.012 },
  lights: COLOR_SCHEME.classic.lights,
  skybox: "indoor",
  pieces: COLOR_SCHEME.classic.pieces,
};


const ACTIVE_THEME = COLOR_SCHEME.classic;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(
  MENU_THEME.scene.fogColor,
  MENU_THEME.scene.fogDensity
);

const { camera, frustumSize } = createCamera();
const renderer = createRenderer();
document.body.appendChild(renderer.domElement);
const controls = createControls(camera, renderer);
const lights = initLightsWithTheme(scene, MENU_THEME);

const skybox = createSkyboxWithTheme(MENU_THEME.skybox);
skybox.rotation.x = Math.PI * 0.5;
scene.add(skybox);

setPieceTheme(ACTIVE_THEME);

const composer = setupPostProcessing(renderer, scene, camera);

window.addEventListener("resize", () => {
  const aspect = window.innerWidth / window.innerHeight;
  camera.left = (-frustumSize * aspect) / 2;
  camera.right = (frustumSize * aspect) / 2;
  camera.top = frustumSize / 2;
  camera.bottom = -frustumSize / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

initializeGlobalState(
  scene,
  camera,
  renderer,
  null,
  controls,
  composer,
  ACTIVE_THEME,
  lights,
  skybox
);

registerChessSocketHandlers();

if (globalState.controls) {
  globalState.controls.enabled = false;
}

const loadingIndicator = document.querySelector(".loading-indicator");
if (loadingIndicator) {
  setTimeout(() => {
    loadingIndicator.classList.add("hidden");
    setTimeout(() => {
      loadingIndicator.style.display = "none";
    }, 500);
  }, 1000);
}

let time = 0;
InitMenuBg();


function setupMenuBackground() {
  scene.fog = new THREE.FogExp2(
    MENU_THEME.scene.fogColor,
    MENU_THEME.scene.fogDensity
  );

  if (globalState.skybox && scene) {
    scene.remove(globalState.skybox);
    if (globalState.skybox.geometry) globalState.skybox.geometry.dispose();
    if (globalState.skybox.material) {
      if (Array.isArray(globalState.skybox.material)) {
        globalState.skybox.material.forEach((mat) => {
          if (mat.map) mat.map.dispose();
          mat.dispose();
        });
      } else {
        if (globalState.skybox.material.map)
          globalState.skybox.material.map.dispose();
        globalState.skybox.material.dispose();
      }
    }
  }
  const newSkybox = createSkyboxWithTheme(MENU_THEME.skybox);
  newSkybox.rotation.x = Math.PI * 0.5;
  scene.add(newSkybox);
  globalState.skybox = newSkybox;

  if (globalState.lights) {
    removeLightsFromScene(scene, globalState.lights);
  }
  const newLights = initLightsWithTheme(scene, MENU_THEME);
  globalState.lights = newLights;
  globalState.activeTheme = MENU_THEME;

  InitMenuBg();
}

async function initApp() {
  try {
    const authStatus = await checkAuth();
    if (authStatus.success) {
      showMainMenu();
    } else {
      createAuthMenu("login");
    }
  } catch (error) {
    console.error("Auth check failed:", error);
    createAuthMenu("login");
  }
}
initApp();

window.addEventListener("lobbyCreated", (e) => {
  UndoMenuBg();

  
  if (globalState.board && globalState.scene) {
    globalState.scene.remove(globalState.board);
    globalState.board = null;
  }
  for (const key of Object.keys(pieces)) {
    const p = pieces[key];
    if (p && p.mesh && p.mesh.parent) p.mesh.parent.remove(p.mesh);
    delete pieces[key];
  }
  loadedMeshes.length = 0;
  globalState.pieces = null;
  globalState.loadedMeshes = loadedMeshes;

  const detail = e?.detail || {};
  const themeFromSettings = detail.settings?.theme;
  if (themeFromSettings && COLOR_SCHEME[themeFromSettings]) {
    globalState.activeTheme = COLOR_SCHEME[themeFromSettings];
  }

  const selectedTheme = globalState.activeTheme || ACTIVE_THEME;

  scene.fog = new THREE.FogExp2(
    selectedTheme.scene.fogColor,
    selectedTheme.scene.fogDensity
  );

  if (globalState.skybox) {
    scene.remove(globalState.skybox);
    if (globalState.skybox.geometry) globalState.skybox.geometry.dispose();
    if (globalState.skybox.material) {
      if (Array.isArray(globalState.skybox.material)) {
        globalState.skybox.material.forEach((mat) => {
          if (mat.map) mat.map.dispose();
          mat.dispose();
        });
      } else {
        if (globalState.skybox.material.map)
          globalState.skybox.material.map.dispose();
        globalState.skybox.material.dispose();
      }
    }
  }
  const newSkybox = createSkyboxWithTheme(selectedTheme.skybox);
  newSkybox.rotation.x = Math.PI * 0.5;
  scene.add(newSkybox);
  globalState.skybox = newSkybox;

  if (globalState.lights) {
    removeLightsFromScene(scene, globalState.lights);
  }

  const newLights = initLightsWithTheme(scene, selectedTheme);
  globalState.lights = newLights;
  globalState.activeTheme = selectedTheme;

  setPieceTheme(selectedTheme);

  const board = createBoard();
  scene.add(board);
  globalState.board = board;

  const game = detail.game;
  if (game && game.board) {
    syncBoardFromBackend(game.board, scene);
  } else {
    const startingFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
    PositionFromFEN(startingFEN, scene);
  }
  globalState.pieces = pieces;
  globalState.loadedMeshes = loadedMeshes;

  const menuElement = document.querySelector(".menu");
  const bgElement = document.querySelector(".bg");
  if (menuElement) menuElement.style.display = "none";
  if (bgElement) bgElement.style.display = "none";

  const profileBtn = document.querySelector(".profile-btn");
  if (profileBtn) {
    profileBtn.style.display = "none";
  }

  const canvas = renderer.domElement;
  if (canvas) {
    canvas.classList.add("game-active");
  }

  if (globalState.controls) {
    globalState.controls.enabled = true;
  }

  setupClickHandler(renderer, camera, globalState.board);
  import("./game/interaction.js").then((m) => {
    if (m.updateCheckHighlightsFromMain) m.updateCheckHighlightsFromMain();
  });
  initMiniBoardUI();

  
  const existingDebugBtn = document.querySelector(".debug-retry-btn");
  if (!existingDebugBtn) {
    const debugBtn = document.createElement("button");
    debugBtn.className = "debug-retry-btn";
    debugBtn.type = "button";
    debugBtn.textContent = "GAME END";
    debugBtn.addEventListener("click", () => {
      const lobbyId = globalState.chess?.lobbyId;
      const gameId = globalState.chess?.gameId;
      const userId = globalState.chess?.userId;
      if (lobbyId && gameId && userId) {
        socket.emit("chess:endGame", { lobbyId, gameId, userId });
      } else {
        const mockGame = {
          _id: gameId || "local-test",
          status: "checkmate",
          turn: "black",
        };
        showGameOverModal(mockGame);
      }
    });
    document.body.appendChild(debugBtn);
  }
});


window.addEventListener("leaveGame", () => {
  if (opponentLeftCountdownId != null) {
    clearTimeout(opponentLeftCountdownId);
    opponentLeftCountdownId = null;
  }
  closeGameOverModal();
  UndoMenuBg();

  const scene = globalState.scene;
  const board = globalState.board;
  if (board && scene) {
    scene.remove(board);
  }
  globalState.board = null;
  globalState.chess = null;
  for (const key of Object.keys(pieces)) {
    const p = pieces[key];
    if (p && p.mesh && p.mesh.parent) p.mesh.parent.remove(p.mesh);
    delete pieces[key];
  }
  globalState.pieces = null;

  const menuEl = document.querySelector(".menu");
  const bgEl = document.querySelector(".bg");
  const profileBtn = document.querySelector(".profile-btn");
  const canvas = globalState.renderer?.domElement;
  if (menuEl) menuEl.style.display = "";
  if (bgEl) bgEl.style.display = "";
  if (profileBtn) profileBtn.style.display = "";
  if (canvas) canvas.classList.remove("game-active");
  if (globalState.controls) globalState.controls.enabled = false;

  setupMenuBackground();

  if (bgEl) {
    bgEl.style.animation = "none";
    bgEl.offsetHeight;
    bgEl.style.animation = "bgFadeIn 1.5s ease-out 0.5s forwards";
  }

  time = 0;
  showMainMenu(true);
});

let opponentLeftCountdownId = null;
socket.on("lobby:update", ({ lobbyId: updatedLobbyId, users }) => {
  if (!globalState.chess || !updatedLobbyId || globalState.chess.lobbyId !== updatedLobbyId) return;
  const list = users || [];
  if (list.length >= 2) return;
  if (document.querySelector(".game-over-overlay")) return;

  if (opponentLeftCountdownId != null) return;
  let count = 3;
  const tick = () => {
    count -= 1;
    if (count <= 0) {
      opponentLeftCountdownId = null;
      socket.emit("lobby:leave", { lobbyId: updatedLobbyId, userId: globalState.chess.userId });
      window.dispatchEvent(new CustomEvent("leaveGame"));
    } else {
      opponentLeftCountdownId = window.setTimeout(tick, 1000);
    }
  };
  opponentLeftCountdownId = window.setTimeout(tick, 1000);
});

let count = 0;
function animate() {
  requestAnimationFrame(animate);
  const currentLights = globalState.lights || lights;
  if (currentLights) {
    animateLights(currentLights, time);
  }
  
  const currentSkybox = globalState.skybox;
  if(currentSkybox){
    currentSkybox.rotation.z += 0.0005;
  }
  if (
    currentSkybox &&
    currentSkybox.material &&
    currentSkybox.material.uniforms &&
    currentSkybox.material.uniforms.u_time
  ) {
    currentSkybox.material.uniforms.u_time.value = time;
    if (currentSkybox.material.uniforms.u_res) {
      currentSkybox.material.uniforms.u_res.value.set(
        window.innerWidth || 1,
        window.innerHeight || 1
      );
    }
  }
  animateMoveHighlights();
  controls.update();
  renderer.render(scene, camera);
  composer.render();
  if (globalState.chess) time += 0.008;
}
animate();
