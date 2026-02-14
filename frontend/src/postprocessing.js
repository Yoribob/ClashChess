import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass.js";
import * as THREE from "three";

let outlinePass;

export function setupPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
  );
  outlinePass.edgeStrength = 10;
  outlinePass.visibleEdgeColor.set(0xff0000);
  composer.addPass(outlinePass);

  return composer;
}

export function addOutlineToPieces(pieceArray) {
  if (!outlinePass) {
    console.warn("OutlinePass not initialized yet!");
    return;
  }
  outlinePass.selectedObjects = pieceArray;
}

export function clearOutlines() {
  if (!outlinePass) return;
  outlinePass.selectedObjects = [];
}
