import * as THREE from "three";

const frustumSize = 8;

function createCamera() {
  const aspect = window.innerWidth / window.innerHeight;
  const camera = new THREE.OrthographicCamera(
    -frustumSize * aspect / 2,
    frustumSize * aspect / 2,
    frustumSize / 2,
    -frustumSize / 2,
    0.01,
    1000
  );
  camera.position.set(10, 10, 10);
  camera.lookAt(0, 0, 0);
  return { camera, frustumSize };
}

export { createCamera };
