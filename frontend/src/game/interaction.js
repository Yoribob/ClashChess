import * as THREE from "three";
import { loadedMeshes, pieces } from "../graphics/pieces.js";
import { addOutlineToPieces } from "../postprocessing.js";
import { getLegalMovesWithCheckValidation } from "./gameLogic.js";
import { InitClash } from "./clashManager.js";
import { globalState } from "../config/globalState.js";
let selectedPiece = null;
let currentPlayer = "w";
let moveHighlights = [];

export function setupClickHandler(renderer, camera, board) {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function getPieceFromHit(hit) {
    let obj = hit;
    while (obj && !obj.userData.type) obj = obj.parent;
    return obj?.userData.type === "piece" ? obj.userData.piece : null;
  }

  function getSquareFromHit(hit) {
    return hit.userData && hit.userData.type === "square"
      ? hit.userData.notation
      : null;
  }

  function createMoveHighlight(squareNotation, isCapture = false) {
    const file = squareNotation.charCodeAt(0) - "a".charCodeAt(0);
    const rank = parseInt(squareNotation[1]) - 1;
    const x = file - 3.5;
    const z = 3.5 - rank;

    const color = isCapture ? 0xff4444 : 0x00ff88;
    const opacity = isCapture ? 0.8 : 0.7;

    const geometry = new THREE.CircleGeometry(0.4, 32);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: opacity,
      side: THREE.DoubleSide,
    });

    if (typeof material.customProgramCacheKey !== "function") {
      material.customProgramCacheKey = function () {
        return `${material.name || "highlight"}_${material.type}`;
      };
    }

    const highlight = new THREE.Mesh(geometry, material);
    highlight.position.set(x, 0.11, z);
    highlight.rotation.x = -Math.PI / 2;
    highlight.userData.type = "highlight";
    highlight.userData.square = squareNotation;
    highlight.userData.originalOpacity = opacity;
    highlight.userData.animationTime = 0;
    highlight.userData.isCapture = isCapture;

    return highlight;
  }

  function animateHighlights() {
    moveHighlights.forEach((highlight) => {
      if (highlight.userData) {
        highlight.userData.animationTime += 0.05;
        const pulse = Math.sin(highlight.userData.animationTime) * 0.3 + 0.7;
        highlight.material.opacity = highlight.userData.originalOpacity * pulse;
        highlight.scale.setScalar(0.8 + pulse * 0.2);
      }
    });
  }

  function showMoveHighlights(legalMoves, board) {
    clearMoveHighlights(board);

    legalMoves.forEach((squareNotation) => {
      const isCapture = Object.values(pieces).some(
        (p) => p.position === squareNotation
      );
      const highlight = createMoveHighlight(squareNotation, isCapture);
      board.add(highlight);
      moveHighlights.push(highlight);
    });
  }

  function clearMoveHighlights(board) {
    moveHighlights.forEach((highlight) => {
      board.remove(highlight);
    });
    moveHighlights = [];
  }

  function selectPiece(piece, board) {
    deselectPiece(board);

    selectedPiece = piece;
    globalState.selectedPiece = piece;

    if (piece.mesh) {
      piece.mesh.scale.set(1.1, 1.1, 1.1);
      addOutlineToPieces([piece.mesh]);
    }

    const legalMoves = getLegalMovesWithCheckValidation(piece.position, piece);
    showMoveHighlights(legalMoves, board);
    console.log(`Selected ${piece.color}${piece.type} at ${piece.position}`);
    console.log("Legal moves:", legalMoves);
  }

  function deselectPiece(board) {
    if (selectedPiece && selectedPiece.mesh) {
      selectedPiece.mesh.scale.set(1, 1, 1);
    }
    selectedPiece = null;
    addOutlineToPieces([]);
    clearMoveHighlights(board);
  }

  function movePiece(piece, newPosition) {
    const capturedPiece = Object.values(pieces).find(
      (p) => p.position === newPosition
    );
    if (capturedPiece) {
      globalState.capturedPiece = capturedPiece;
      console.log(
        `⚔️ CLASH! ${piece.color}${piece.type} vs ${capturedPiece.color}${capturedPiece.type}`
      );
      InitClash();
      return;
    }

    piece.position = newPosition;
    piece.move(newPosition);

    console.log(`Moved ${piece.color}${piece.type} to ${newPosition}`);
  }

  function switchPlayer() {
    currentPlayer = currentPlayer === "w" ? "b" : "w";
    console.log(`Current player: ${currentPlayer === "w" ? "White" : "Black"}`);
  }

  document.addEventListener("click", (event) => {
    mouse.set(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);

    let intersects = raycaster.intersectObjects(loadedMeshes, true);
    let piece =
      intersects.length > 0 ? getPieceFromHit(intersects[0].object) : null;

    if (piece) {
      if (piece.color !== currentPlayer) {
        console.log("Not your turn!");
        return;
      }

      if (selectedPiece === piece) {
        deselectPiece(board);
        return;
      }

      selectPiece(piece, board);
      return;
    }

    intersects = raycaster.intersectObjects(board.children, true);
    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;

      if (clickedObject.userData.type === "highlight") {
        const squareNotation = clickedObject.userData.square;

        if (selectedPiece) {
          const legalMoves = getLegalMovesWithCheckValidation(
            selectedPiece.position,
            selectedPiece
          );

          if (legalMoves.includes(squareNotation)) {
            movePiece(selectedPiece, squareNotation);
            deselectPiece(board);
            switchPlayer();
          }
        }
        return;
      }

      const squareNotation = getSquareFromHit(clickedObject);

      if (selectedPiece && squareNotation) {
        const legalMoves = getLegalMovesWithCheckValidation(
          selectedPiece.position,
          selectedPiece
        );

        if (legalMoves.includes(squareNotation)) {
          movePiece(selectedPiece, squareNotation);
          deselectPiece(board);
          switchPlayer();
        } else {
          console.log("Invalid move!");
        }
      }
    }
  });
}

export function ChashFlickerScene(scene) {
  if (selectedPiece && selectedPiece.mesh) {
    selectedPiece.mesh.scale.set(1, 1, 1);
  }
  selectedPiece = null;
  addOutlineToPieces([]);

  let objectsChanged = 0;

  scene.traverse((object) => {
    if (object.isMesh && object.material) {
      object.scale.set(1.1, 1.1, 1.1);

      if (Array.isArray(object.material)) {
        object.material.forEach((material) => {
          material.color.setHex(0x000000);
          material.emissive.setHex(0x000000);
          material.emissiveIntensity = 0.0;
          material.needsUpdate = true;
        });
      } else {
        object.material.color.setHex(0x000000);
        object.material.emissive.setHex(0x000000);
        object.material.emissiveIntensity = 0.0;
        object.material.needsUpdate = true;
      }

      objectsChanged++;
    }
  });

}

export function animateMoveHighlights() {
  if (moveHighlights.length > 0) {
    moveHighlights.forEach((highlight) => {
      if (highlight.userData) {
        highlight.userData.animationTime += 0.05;

        if (highlight.userData.isCapture) {
          const pulse =
            Math.sin(highlight.userData.animationTime * 1.5) * 0.4 + 0.6;
          highlight.material.opacity =
            highlight.userData.originalOpacity * pulse;
          highlight.scale.setScalar(0.7 + pulse * 0.3);
        } else {
          const pulse = Math.sin(highlight.userData.animationTime) * 0.3 + 0.7;
          highlight.material.opacity =
            highlight.userData.originalOpacity * pulse;
          highlight.scale.setScalar(0.8 + pulse * 0.2);
        }
      }
    });
  }
}
