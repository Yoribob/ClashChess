import { globalState } from "../config/globalState.js";
import * as THREE from "three";
import { gsap } from "gsap";
let clashSceneTriggered = false;
let clashSquares = [];
let white_color, black_color;
function processAllChildren(obj) {
  let isSelectedPiece = false;
  let isCapturedPiece = false;

  if (obj === globalState.selectedPiece?.mesh) {
    isSelectedPiece = true;
  } else if (obj === globalState.capturedPiece?.mesh) {
    isCapturedPiece = true;
  } else {
    let currentParent = obj.parent;
    while (currentParent) {
      if (currentParent === globalState.selectedPiece?.mesh) {
        isSelectedPiece = true;
        break;
      } else if (currentParent === globalState.capturedPiece?.mesh) {
        isCapturedPiece = true;
        break;
      }
      currentParent = currentParent.parent;
    }
  }

  if (isSelectedPiece || isCapturedPiece) {
    obj.visible = true;
    if (obj.isMesh && obj.material) {
      if (isSelectedPiece) {
        globalState.selectedPiece = obj;
      } else if (isCapturedPiece) globalState.capturedPiece = obj;
      flick(500);
    }
  } else {
    obj.visible = false;
  }

  if (obj.children && obj.children.length > 0) {
    obj.children.forEach((child) => {
      processAllChildren(child);
    });
  }

  Object.values(globalState.lights).forEach((light) => {
    light.visible = true;
  });

  function flick(ms) {
    let time = ms;
    let flickCount = 0;
    const maxFlicks = 5;

    function flicker() {
      if (flickCount < maxFlicks) {
        time -= ms / 7;
        obj.visible = true;

        setTimeout(() => {
          obj.visible = false;

          flickCount++;

          setTimeout(() => {
            flicker();
          }, time / 1.8);
        }, time / 1.8);
      } else {
        if (!clashSceneTriggered) {
          clashSceneTriggered = true;
          ClashScene();
        }
      }
    }

    flicker();
  }
}
function FlickerClash() {
  if (globalState.scene && globalState.scene.children) {
    globalState.scene.children.forEach((obj) => {
      processAllChildren(obj);
    });
  } else {
    setTimeout(FlickerClash, 500);
  }
}

function ClashScene() {
  setTimeout(() => {
    const sP = globalState.selectedPiece;
    const cP = globalState.capturedPiece;
    if (!sP || !cP) return;
    const sP_p = sP.parent?.parent || sP.parent || sP;
    const cP_p = cP.parent?.parent || cP.parent || cP;

    sP.visible = true;
    cP.visible = true;

    sP_p.position.set(0.5, 0.1, 0.5);
    cP_p.position.set(0.5, 0.1, -0.5);

    const addSquareUnder = (x, z, pieceRoot) => {
      let ix = Math.round(x + 3.5);
      let iz = Math.round(z + 3.5);

      const notation = pieceRoot?.userData?.piece?.position;
      if (notation && notation.length === 2) {
        const fileChar = notation[0].toLowerCase();
        const rankNum = parseInt(notation[1]);
        if (!Number.isNaN(rankNum)) {
          ix = fileChar.charCodeAt(0) - "a".charCodeAt(0);
          iz = 8 - rankNum;
        }
      }
      const geometry = new THREE.BoxGeometry(1, 0.2, 1);

      let material;
      const LIGHT_SQUARE = 0xa16f5a;
      const DARK_SQUARE = 0xebd2b7;
      const color = (ix + iz) % 2 === 0 ? LIGHT_SQUARE : DARK_SQUARE;
      material = new THREE.MeshPhongMaterial({ color });

      const tile = new THREE.Mesh(geometry, material);
      tile.position.set(x, 0.001, z);
      tile.receiveShadow = true;
      globalState.scene.add(tile);
      clashSquares.push(tile);
    };

    addSquareUnder(sP_p.position.x, sP_p.position.z, sP_p);
    addSquareUnder(cP_p.position.x, cP_p.position.z, cP_p);

    const midpoint = {
      x: (sP_p.position.x + cP_p.position.x) / 2,
      y: (sP_p.position.y + cP_p.position.y) / 2,
      z: (sP_p.position.z + cP_p.position.z) / 2,
    };

    globalState.camera.position.set(midpoint.x + 1, 1, midpoint.z);
    globalState.camera.lookAt(
      midpoint.x,
      globalState.camera.position.y,
      midpoint.z
    );
    globalState.controls.target.set(
      midpoint.x,
      globalState.camera.position.y,
      midpoint.z
    );
    globalState.camera.zoom = 4;
    globalState.camera.updateProjectionMatrix();
    globalState.controls.enabled = true;

    globalState.controls.update();

    globalState.skybox.visible = true;

    setTimeout(() => {
      gsap.to(sP_p.position, { z: 3.5, duration: 2, ease: "power2.inOut" });
      gsap.to(cP_p.position, { z: -3.5, duration: 2, ease: "power2.inOut" });
      gsap.to(clashSquares[0].position, {
        z: 3.5,
        duration: 2,
        ease: "power2.inOut",
      });
      gsap.to(clashSquares[1].position, {
        z: -3.5,
        duration: 2,
        ease: "power2.inOut",
      });

      const updateLookAt = () => {
        const y = globalState.camera.position.y;
        const x = midpoint.x;
        const z = midpoint.z;
        globalState.camera.lookAt(x, y, z);
      };

      gsap.to(globalState.camera.position, {
        y: globalState.camera.position.y + 0.25,
        duration: 2,
        ease: "power2.inOut",
        onUpdate: updateLookAt,
      });

      gsap.to(globalState.camera, {
        zoom: 2,
        duration: 2,
        ease: "power2.inOut",
        onUpdate: () => {
          globalState.camera.updateProjectionMatrix();
        },
      });
    }, 500);
  }, 500);
}

export function InitClash() {
  clashSceneTriggered = false;
  globalState.controls.enabled = false;
  if (clashSquares.length) {
    clashSquares.forEach((sq) => {
      if (sq.parent) sq.parent.remove(sq);
      if (sq.geometry) sq.geometry.dispose();
      if (sq.material) sq.material.dispose();
    });
    clashSquares = [];
  }
  FlickerClash();
}
