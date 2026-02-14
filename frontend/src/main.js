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
import { PositionFromFEN } from "./game/gameState.js";
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
import "./socket/index.js"; 

const ACTIVE_THEME = COLOR_SCHEME.classic;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(
  ACTIVE_THEME.scene.fogColor,
  ACTIVE_THEME.scene.fogDensity
);

const { camera, frustumSize } = createCamera();
const renderer = createRenderer();
document.body.appendChild(renderer.domElement);
const controls = createControls(camera, renderer);
const lights = initLightsWithTheme(scene, ACTIVE_THEME);

const skybox = createSkyboxWithTheme(ACTIVE_THEME.skybox);
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
  null, // board
  controls,
  composer,
  ACTIVE_THEME,
  lights,
  skybox
);

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

  const selectedTheme = globalState.activeTheme;
  if (!selectedTheme) {
    console.error("No theme selected!");
    return;
  }

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
  const startingFEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
  PositionFromFEN(startingFEN, scene);
  globalState.pieces = pieces;
  globalState.loadedMeshes = loadedMeshes;

  const menuElement = document.querySelector(".menu");
  const bgElement = document.querySelector(".bg");
  if (menuElement) menuElement.style.display = "none";
  if (bgElement) bgElement.style.display = "none";

  const canvas = renderer.domElement;
  if (canvas) {
    canvas.classList.add("game-active");
  }

  if (globalState.controls) {
    globalState.controls.enabled = true;
  }

  setupClickHandler(renderer, camera, globalState.board);
});
function animate() {
  requestAnimationFrame(animate);
  const currentLights = globalState.lights || lights;
  if (currentLights) {
    animateLights(currentLights, time);
  }
  animateMoveHighlights();
  controls.update();
  renderer.render(scene, camera);
  composer.render();
  time += 0.00;
}
animate();
