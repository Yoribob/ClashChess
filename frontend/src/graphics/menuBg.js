import * as THREE from "three";
import { globalState } from "../config/globalState.js";
import { gsap } from "gsap";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { NotationToCoords } from "./pieces.js";

const rows = {};
let frontLight = null;
let savedCameraState = null;

const objLoader = new OBJLoader();
const mtlLoader = new MTLLoader();
mtlLoader.setPath("/assets/pieces/");
objLoader.setPath("/assets/pieces/");

export function InitMenuBg() {
  if (globalState.camera && !savedCameraState) {
    savedCameraState = {
      position: globalState.camera.position.clone(),
      zoom: globalState.camera.zoom,
      left: globalState.camera.left,
      right: globalState.camera.right,
      top: globalState.camera.top,
      bottom: globalState.camera.bottom,
      near: globalState.camera.near,
      far: globalState.camera.far,
    };
  }

  const types = [
    "p",
    "r",
    "k",
    "b",
    "q",
    "n",
    "p",
    "r",
    "k",
    "b",
    "q",
    "n",
    "p",
    "r",
    "k",
    "b",
    "q",
    "n",
  ];
  let count = -2;

  for (let i = 0; i < 3; i++) {
    rows[i] = [];
    const rowTypes = types;
    rowTypes.forEach((type) => {
      const color = count % 2 === 0 ? "w" : "b";
      const position = `a${count}`;

      const mtlPath = `${type}_${color}.mtl`;
      const objPath = `${type}_${color}.obj`;

      mtlLoader.load(
        mtlPath,
        (materials) => {
          materials.preload();
          objLoader.setMaterials(materials);

          objLoader.load(
            objPath,
            (obj) => {
              obj.scale.set(0.4, 0.4, 0.4);

              const pieceGroup = new THREE.Group();

              const box = new THREE.Box3().setFromObject(obj);
              const center = box.getCenter(new THREE.Vector3());
              obj.position.x = -center.x;
              obj.position.y = -box.min.y;
              obj.position.z = -center.z;

              pieceGroup.add(obj);

              if (type === "n") {
                let angle = 0;
                if (color === "b") angle = Math.PI;
                pieceGroup.rotation.y = angle;
              }

              const { x, z } = NotationToCoords(position);
              pieceGroup.position.set(x, 0.1, z);
              pieceGroup.position.y += -i * 2.2 + 1.12;

              const currentTheme = globalState.activeTheme;
              if (currentTheme && currentTheme.pieces) {
                obj.traverse((child) => {
                  if (child.isMesh) {
                    child.castShadow = false;
                    child.receiveShadow = false;

                    let pieceColor = 0xf5f5dc;
                    let emissive = 0x000000;
                    let emissiveIntensity = 0.0;

                    if (color === "w") {
                      pieceColor = currentTheme.pieces.white.color;
                      emissive = currentTheme.pieces.white.emissive;
                      emissiveIntensity =
                        currentTheme.pieces.white.emissiveIntensity;
                    } else {
                      pieceColor = currentTheme.pieces.black.color;
                      emissive = currentTheme.pieces.black.emissive;
                      emissiveIntensity =
                        currentTheme.pieces.black.emissiveIntensity;
                    }

                    child.material = new THREE.MeshLambertMaterial({
                      color: pieceColor,
                      emissive: emissive,
                      emissiveIntensity: emissiveIntensity,
                      flatShading: true,
                    });
                  }
                });
              } else {
                obj.traverse((child) => {
                  if (child.isMesh) {
                    child.castShadow = false;
                    child.receiveShadow = false;
                  }
                });
              }

              pieceGroup.userData.type = "menuBg";
              pieceGroup.userData.isMenuBg = true;

              globalState.scene.add(pieceGroup);
              rows[i].push({ mesh: pieceGroup });

              const direction = i % 2 === 0 ? 1 : -1;
              const stepDistance = direction * 0.8;
              const totalSteps = 6;
              const delay = i * 0.1;

              const tl = gsap.timeline({
                repeat: -1,
                repeatDelay: 0,
                yoyo: true,
                delay,
              });

              for (let s = 0; s < totalSteps; s++) {
                tl.to(pieceGroup.position, {
                  x: `+=${stepDistance}`,
                  duration: 1.25,
                  ease: "power2.inOut",
                });
              }
            },
            undefined,
            (error) => {
              console.error(
                `Error loading OBJ for menu bg ${type}_${color}:`,
                error,
              );
            },
          );
        },
        undefined,
        (error) => {
          console.error(
            `Error loading MTL for menu bg ${type}_${color}:`,
            error,
          );
        },
      );

      count++;
    });
    count = -2;
  }
  console.log(globalState.camera.position);
  globalState.camera.position.set(4, 0, 1);
  globalState.camera.lookAt(0, 0, 0);
  globalState.camera.near = 0.01;
  globalState.camera.far = 2000;
  globalState.camera.zoom = 1.2;
  globalState.camera.updateProjectionMatrix();

  frontLight = new THREE.DirectionalLight(0xffffff, 2.5);
  frontLight.userData.keepLight = true;
  frontLight.userData.isMenuLight = true;
  frontLight.position.set(5, 2, 5);
  frontLight.target.position.set(0, 0, 0);
  globalState.scene.add(frontLight);

  console.log(globalState.lights);
  if (globalState.lights && globalState.lights.point) {
    globalState.lights.point.visible = false;
  }
}

export function UndoMenuBg() {
  for (let i = 0; i < 3; i++) {
    if (rows[i]) {
      rows[i].forEach((item) => {
        if (item && item.mesh) {
          globalState.scene.remove(item.mesh);
          if (item.mesh.position) {
            gsap.killTweensOf(item.mesh.position);
          }
          item.mesh.traverse((child) => {
            if (child.isMesh) {
              if (child.geometry) child.geometry.dispose();
              if (child.material) {
                if (Array.isArray(child.material)) {
                  child.material.forEach((mat) => mat.dispose());
                } else {
                  child.material.dispose();
                }
              }
            }
          });
        }
      });
      rows[i] = [];
    }
  }

  if (frontLight) {
    globalState.scene.remove(frontLight);
    frontLight = null;
  }

  if (globalState.camera) {
    if (savedCameraState) {
      globalState.camera.position.copy(savedCameraState.position);
      globalState.camera.zoom = savedCameraState.zoom;
      globalState.camera.left = savedCameraState.left;
      globalState.camera.right = savedCameraState.right;
      globalState.camera.top = savedCameraState.top;
      globalState.camera.bottom = savedCameraState.bottom;
      globalState.camera.near = savedCameraState.near;
      globalState.camera.far = savedCameraState.far;
      globalState.camera.lookAt(0, 0, 0);
      globalState.camera.updateProjectionMatrix();
      savedCameraState = null;
    } else {
      const aspect = window.innerWidth / window.innerHeight;
      const frustumSize = 8;
      globalState.camera.position.set(10, 10, 10);
      globalState.camera.lookAt(0, 0, 0);
      globalState.camera.zoom = 1;
      globalState.camera.left = (-frustumSize * aspect) / 2;
      globalState.camera.right = (frustumSize * aspect) / 2;
      globalState.camera.top = frustumSize / 2;
      globalState.camera.bottom = -frustumSize / 2;
      globalState.camera.near = 0.01;
      globalState.camera.far = 1000;
      globalState.camera.updateProjectionMatrix();
    }
  }

  if (globalState.lights && globalState.lights.point) {
    globalState.lights.point.visible = true;
  }
}
