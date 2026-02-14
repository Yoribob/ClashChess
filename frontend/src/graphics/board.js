import * as THREE from "three";

function createBoard() {
  const board = new THREE.Group();
  const lightSquare = 0xa16f5a;
  const darkSquare = 0xebd2b7;
  const boardSquares = [];

  for (let x = 0; x < 8; x++) {
    for (let z = 0; z < 8; z++) {
      const color = (x + z) % 2 === 0 ? lightSquare : darkSquare;
      const material = new THREE.MeshPhongMaterial({ color });
      const geometry = new THREE.BoxGeometry(1, 0.2, 1);
      const tile = new THREE.Mesh(geometry, material);
      tile.position.set(x - 3.5, 0, z - 3.5);
      tile.receiveShadow = true;

      const notation = String.fromCharCode(97 + x) + (8 - z);
      tile.userData = {
        type: "square",
        position: { x, z },
        notation: notation,
      };

      boardSquares.push(tile);
      board.add(tile);
    }
  }

  window.boardSquares = boardSquares;

  return board;
}

export { createBoard };
