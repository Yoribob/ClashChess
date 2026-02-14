// Outdated, will be changed later

export let globalState = {
  lobby_created: false,
  scene: null,
  camera: null,
  renderer: null,
  board: null,
  controls: null,
  composer: null,
  lights: null,
  skybox: null,
  selectedPiece: null,
  capturedPiece: null,
  currentPlayer: "w",
  moveHighlights: [],
  clashManager: null,
  pieces: null,
  loadedMeshes: null,
  slotMachine: null,
  activeTheme: null,
  capturedPiece_color: null,
  selectedPiece_color: null,
  utils: {
    applyBlackToAll: null,
    resetAllToOriginal: null,
  },
};

export const COLOR_SCHEME = {
  fantasy: {
    scene: { fogColor: 0x1a1a2e, fogDensity: 0.015 },
    pieces: {
      white: { color: 0xffd700, emissive: 0xffaa00, emissiveIntensity: 0.15 },
      black: { color: 0x8b0000, emissive: 0xcc4444, emissiveIntensity: 0.12 },
    },
    lights: {
      main: { color: 0xffdd88, intensity: 2.5 },
      rim: { color: 0xe74c3c, intensity: 1.0 },
      point: { color: 0x4a90e2, intensity: 1.8 },
      accent1: { color: 0xff6b9d, intensity: 1.2 },
      accent2: { color: 0x9b59b6, intensity: 1.2 },
    },
    skybox: "indoor",
  },
  classic: {
    scene: { fogColor: 0x8b4513, fogDensity: 0.012 },
    pieces: {
      white: { color: 0xf8f8ff, emissive: 0x404040, emissiveIntensity: 0.05 },
      black: { color: 0x8a8a8a, emissive: 0x202020, emissiveIntensity: 0.03 },
    },
    lights: {
      main: { color: 0xfff8dc, intensity: 2.0 },
      rim: { color: 0xd2b48c, intensity: 0.8 },
      point: { color: 0xffd700, intensity: 1.2 },
      accent1: { color: 0xf0e68c, intensity: 0.6 },
      accent2: { color: 0xfaf0e6, intensity: 0.6 },
    },
    skybox: "indoor",
  },
  cyberpunk: {
    scene: { fogColor: 0x000511, fogDensity: 0.025 },
    pieces: {
      white: { color: 0xd2b48c, emissive: 0x8b7355, emissiveIntensity: 0.15 },
      black: { color: 0x8b4513, emissive: 0x4a2c17, emissiveIntensity: 0.2 },
    },
    lights: {
      main: { color: 0x00ff41, intensity: 3.0 },
      rim: { color: 0xff1744, intensity: 1.5 },
      point: { color: 0x00e676, intensity: 2.0 },
      accent1: { color: 0xff3d00, intensity: 1.8 },
      accent2: { color: 0x7c4dff, intensity: 1.8 },
    },
    skybox: "indoor",
  },
};

export function initializeGlobalState(
  scene,
  camera,
  renderer,
  board,
  controls,
  composer,
  activeTheme,
  lights,
  skybox
) {
  globalState.scene = scene;
  globalState.camera = camera;
  globalState.renderer = renderer;
  globalState.board = board;
  globalState.controls = controls;
  globalState.composer = composer;
  globalState.activeTheme = activeTheme;
  globalState.lights = lights;
  globalState.skybox = skybox;

  console.log("Global state initialized");
}
