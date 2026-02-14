import * as THREE from "three";

const createSkybox = () => {
  return createSkyboxWithTheme("space");
};

const createSkyboxWithTheme = (theme) => {
  const skyboxGeometry = new THREE.SphereGeometry(20, 100, 100);

  const skyboxMaterials = {
    space: () => {
      const loader = new THREE.TextureLoader();
      const spaceTexture = loader.load(
        "https://cdn.eso.org/images/publicationjpg/eso0932a.jpg"
      );
      return new THREE.MeshBasicMaterial({
        map: spaceTexture,
        side: THREE.BackSide,
        fog: false,
      });
    },

    sky: () => {
      return new THREE.MeshBasicMaterial({
        color: 0x87ceeb,
        transparent: true,
        opacity: 0.6,
        side: THREE.BackSide,
        fog: false,
      });
    },

    indoor: () => {
      return new THREE.MeshBasicMaterial({
        color: 0xd2b48c,
        side: THREE.BackSide,
        fog: false,
      });
    },

    night: () => {
      return new THREE.MeshBasicMaterial({
        color: 0x000511,
        transparent: true,
        opacity: 0.8,
        side: THREE.BackSide,
        fog: false,
      });
    },
  };

  const materialFunc = skyboxMaterials[theme] || skyboxMaterials.space;
  const skyboxMaterial = materialFunc();
  const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
  return skybox;
};

const applyColorScheme = (theme) => {
  console.log("Applying color scheme:", theme);
};

export { createSkybox, createSkyboxWithTheme, applyColorScheme };
