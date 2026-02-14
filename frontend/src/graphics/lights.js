import * as THREE from "three";
import { globalState } from "../config/globalState.js";
export function initLights(scene) {
  return initLightsWithTheme(scene, getDefaultTheme());
}

export function initLightsWithTheme(scene, theme) {
  const ambient = new THREE.AmbientLight(0x1a1a2e, 0.4);
  ambient.userData.isThemeLight = true;
  scene.add(ambient);

  const directional = new THREE.DirectionalLight(
    theme.lights.main.color,
    theme.lights.main.intensity
  );
  directional.userData.isThemeLight = true;
  directional.castShadow = true;
  directional.shadow.mapSize.set(8192, 8192);
  directional.shadow.camera.near = 0.5;
  directional.shadow.camera.far = 50;
  directional.shadow.camera.left = -15;
  directional.shadow.camera.right = 15;
  directional.shadow.camera.top = 15;
  directional.shadow.camera.bottom = -15;
  directional.shadow.bias = -0.0001;
  directional.position.set(8, 20, 6);
  scene.add(directional);

  const fill = new THREE.DirectionalLight(0xff9f40, 1.2);
  fill.userData.isThemeLight = true;
  fill.position.set(-6, 10, -4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(
    theme.lights.rim.color,
    theme.lights.rim.intensity
  );
  rim.userData.isThemeLight = true;
  rim.position.set(2, 8, -10);
  scene.add(rim);

  const point = new THREE.PointLight(
    theme.lights.point.color,
    theme.lights.point.intensity,
    25
  );
  point.userData.isThemeLight = true;
  point.position.set(0, 4, 0);
  point.castShadow = true;
  point.shadow.mapSize.set(4096, 4096);
  point.shadow.bias = -0.0005;
  scene.add(point);

  const accent1 = new THREE.PointLight(
    theme.lights.accent1.color,
    theme.lights.accent1.intensity,
    20
  );
  accent1.userData.isThemeLight = true;
  accent1.position.set(-6, 3, -6);
  scene.add(accent1);

  const accent2 = new THREE.PointLight(
    theme.lights.accent2.color,
    theme.lights.accent2.intensity,
    20
  );
  accent2.userData.isThemeLight = true;
  accent2.position.set(6, 3, 6);
  scene.add(accent2);

  const skyLight = new THREE.HemisphereLight(0x6495ed, 0x8b4513, 0.8);
  skyLight.userData.isThemeLight = true;
  scene.add(skyLight);

  return { directional, rim, point, fill, accent1, accent2, ambient, skyLight };
}

export function removeLightsFromScene(scene, lights) {
  if (!lights) return;

  const lightTypes = [
    "directional",
    "rim",
    "point",
    "fill",
    "accent1",
    "accent2",
    "ambient",
    "skyLight",
  ];
  lightTypes.forEach((lightType) => {
    if (lights[lightType]) {
      scene.remove(lights[lightType]);
      if (lights[lightType].shadow && lights[lightType].shadow.map) {
        lights[lightType].shadow.map.dispose();
      }
      if (lights[lightType].target && lights[lightType].target !== scene) {
        if (lights[lightType].target.parent) {
          lights[lightType].target.parent.remove(lights[lightType].target);
        }
      }
    }
  });

  const objectsToRemove = [];
  scene.traverse((object) => {
    if (
      object instanceof THREE.Light &&
      object.userData.isThemeLight &&
      !object.userData.keepLight
    ) {
      objectsToRemove.push(object);
    }
  });
  objectsToRemove.forEach((light) => {
    scene.remove(light);
    if (light.shadow && light.shadow.map) {
      light.shadow.map.dispose();
    }
  });
}

function getDefaultTheme() {
  return {
    lights: {
      main: { color: 0xffdd88, intensity: 2.5 },
      rim: { color: 0xe74c3c, intensity: 1.0 },
      point: { color: 0x4a90e2, intensity: 1.8 },
      accent1: { color: 0xff6b9d, intensity: 1.2 },
      accent2: { color: 0x9b59b6, intensity: 1.2 },
    },
  };
}

export function animateLights(
  { directional, rim, point, fill, accent1, accent2 },
  time
) {
  const lightRadius = 15;
  const lightSpeed = 0.003;
  const angle = time * lightSpeed * 60;

  directional.position.set(
    Math.cos(angle) * lightRadius,
    18 + Math.sin(time * 0.2) * 3,
    Math.sin(angle) * lightRadius
  );
  directional.target.position.set(0, 0, 0);

  point.position.y = 4 + Math.sin(time * 0.7) * 1.5;
  point.intensity = 1.8 + Math.sin(time * 0.4) * 0.6;

  const hue1 = (time * 15) % 360;
  rim.color.setHSL(hue1 / 360, 0.8, 0.7);
  rim.intensity = 1.0 + Math.sin(time * 0.3) * 0.3;

  fill.intensity = 1.2 + Math.sin(time * 0.5) * 0.4;

  const accent1Angle = angle + Math.PI / 3;
  accent1.position.set(
    Math.cos(accent1Angle) * 10,
    3 + Math.sin(time * 0.8) * 1,
    Math.sin(accent1Angle) * 10
  );

  const accent2Angle = angle - Math.PI / 3;
  accent2.position.set(
    Math.cos(accent2Angle) * 10,
    3 + Math.sin(time * 0.6) * 1,
    Math.sin(accent2Angle) * 10
  );

  const hue2 = (time * 20 + 120) % 360;
  const hue3 = (time * 25 + 240) % 360;

  accent1.color.setHSL(hue2 / 360, 0.8, 0.6);
  accent2.color.setHSL(hue3 / 360, 0.8, 0.6);

  accent1.intensity = 1.2 + Math.sin(time * 0.9) * 0.5;
  accent2.intensity = 1.2 + Math.sin(time * 0.7) * 0.5;
}
