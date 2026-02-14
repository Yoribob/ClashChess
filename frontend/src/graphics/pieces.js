import * as THREE from "three";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { globalState } from "../config/globalState.js";
const objLoader = new OBJLoader();
const mtlLoader = new MTLLoader();
mtlLoader.setPath("./assets/pieces/");
objLoader.setPath("./assets/pieces/");

export const pieces = {};
export const loadedMeshes = [];
export let currentTheme = null;

export class Piece {
  constructor(type, color, position) {
    this.type = type;
    this.color = color;
    this.position = position;
    this.mesh = null;
  }

  load(callback) {
    const mtlPath = `${this.type}_${this.color}.mtl`;
    const objPath = `${this.type}_${this.color}.obj`;

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

            if (this.type === "n") {
              const { x, z } = NotationToCoords(this.position);
              const centerX = 0;
              const centerZ = 0;
              let angle = 0;
              if (this.color === "b") angle = Math.PI;
              pieceGroup.rotation.y = angle;
            }

            const { x, z } = NotationToCoords(this.position);
            pieceGroup.position.set(x, 0.1, z);

            this.mesh = pieceGroup;
            pieceGroup.userData.type = "piece";
            pieceGroup.userData.piece = this;
            loadedMeshes.push(this.mesh);

            obj.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                let pieceColor = 0xf5f5dc;
                let emissive = 0x000000;
                let emissiveIntensity = 0.0;

                if (currentTheme && currentTheme.pieces) {
                  if (this.color === "w") {
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
                }

                child.material = new THREE.MeshLambertMaterial({
                  color: pieceColor,
                  emissive: emissive,
                  emissiveIntensity: emissiveIntensity,
                  flatShading: true,
                });
              }
            });

            if (callback) callback(pieceGroup);
          },
          (progress) => {
            console.log(
              `OBJ loading progress: ${
                (progress.loaded / progress.total) * 100
              }%`
            );
          },
          (error) => {
            console.error(
              `Error loading OBJ for ${this.type}_${this.color}:`,
              error
            );
          }
        );
      },
      (progress) => {
        console.log(
          `MTL loading progress: ${(progress.loaded / progress.total) * 100}%`
        );
      },
      (error) => {
        console.error(
          `Error loading MTL for ${this.type}_${this.color}:`,
          error
        );
      }
    );
  }

  move(newPosition, duration = 30) {
    if (!this.mesh) {
      console.warn(
        `Cannot move piece: mesh is null for ${this.color}${this.type}`
      );
      return;
    }

    const { x, z } = NotationToCoords(newPosition);
    const target = new THREE.Vector3(x, 0.1, z);
    const start = this.mesh.position.clone();
    let frame = 0;

    const animateMove = () => {
      if (frame <= duration) {
        const t = frame / duration;
        this.mesh.position.lerpVectors(start, target, t);
        frame++;
        requestAnimationFrame(animateMove);
      } else {
        this.mesh.position.copy(target);
      }
    };

    animateMove();
  }
}

export function NotationToCoords(square) {
  if (typeof square !== "string" || square.length < 2) {
    return { x: 0, z: 0 };
  }

  const file = square[0].toLowerCase();
  const rank = parseInt(square.slice(1));

  if (isNaN(rank)) return { x: 0, z: 0 };

  const fileIndex = file.charCodeAt(0) - "a".charCodeAt(0);

  const x = fileIndex - 3.5;
  const z = 3.5 - (rank - 1);

  return { x, z };
}

export function setPieceTheme(theme) {
  currentTheme = theme;

  if (theme && theme.pieces && loadedMeshes) {
    loadedMeshes.forEach((mesh) => {
      mesh.traverse((child) => {
        if (child.isMesh && child.userData && child.userData.piece) {
          const piece = child.userData.piece;
          let pieceColor = 0xf5f5dc;
          let emissive = 0x000000;
          let emissiveIntensity = 0.0;

          if (piece.color === "w") {
            pieceColor = theme.pieces.white.color;
            emissive = theme.pieces.white.emissive;
            emissiveIntensity = theme.pieces.white.emissiveIntensity;
          } else {
            pieceColor = theme.pieces.black.color;
            emissive = theme.pieces.black.emissive;
            emissiveIntensity = theme.pieces.black.emissiveIntensity;
          }

          if (child.material) {
            child.material.color.setHex(pieceColor);
            child.material.emissive.setHex(emissive);
            child.material.emissiveIntensity = emissiveIntensity;
          }
        }
      });
    });
  }
}
