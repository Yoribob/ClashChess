import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

function createControls(camera, renderer) {
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;

  controls.enableZoom = true;
  controls.enablePan = true;
  controls.enableRotate = true;

  controls.minDistance = 5;
  controls.maxDistance = 50;

  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN, 
  };

  return controls;
}

export { createControls };
