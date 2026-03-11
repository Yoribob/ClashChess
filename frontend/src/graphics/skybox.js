import * as THREE from "three";

const createSkybox = () => {
  return createSkyboxWithTheme("space");
};

const createSkyboxWithTheme = (theme) => {
  const skyboxGeometry = new THREE.SphereGeometry(20, 100, 100);

  const skyboxMaterials = {
    space: () => {
      const loader = new THREE.TextureLoader();
      const spaceTexture = loader.load("https:
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

    void: () => {
      const uniforms = {
        u_time:     { value: 0 },
        u_rotation: { value: 0 },
        u_res:      { value: new THREE.Vector2(window.innerWidth || 1, window.innerHeight || 1) },
        u_holes: {
          value: [
            new THREE.Vector2( 0.0,  0.0),
            new THREE.Vector2(99.0, 99.0),
            new THREE.Vector2(99.0, 99.0),
          ],
        },
      };

      const vertexShader = `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;

      const fragmentShader = `
        precision highp float;
        varying vec3 vPos;
        uniform vec2  u_res;
        uniform float u_time;
        uniform float u_rotation;
        uniform vec2  u_holes[3];
        #define PI 3.14159265358979

        float hash(vec2 p) {
          p = fract(p * vec2(127.1, 311.7));
          p += dot(p, p + 19.31);
          return fract(p.x * p.y);
        }

        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 6; i++) { v += a * noise(p); p *= 2.1; a *= 0.5; }
          return v;
        }

        vec3 vortex(vec2 uv, float t) {
          float len   = length(uv);
          float angle = atan(uv.y, uv.x);

          float twist = -t * 1.8 + len * -6.0;
          float sa = sin(twist), ca = cos(twist);
          vec2 twisted = vec2(ca * uv.x - sa * uv.y, sa * uv.x + ca * uv.y);

          float arms = 0.0;
          for (int k = 0; k < 4; k++) {
            float kf  = float(k);
            float arm = sin(angle + twist + kf * PI * 0.5 + len * 12.0 - t * 4.0);
            arm = pow(max(arm, 0.0), 3.0);
            arm *= smoothstep(0.8, 0.05, len) * smoothstep(0.0, 0.05, len);
            arms += arm;
          }

          float ringR     = 0.38 + sin(t * 0.7) * 0.02;
          float ring      = exp(-pow((len - ringR) / 0.06, 2.0) * 6.0);
          float innerRing = exp(-pow((len - ringR * 0.55) / 0.04, 2.0) * 8.0);

          vec2  fp   = twisted * 3.0 + vec2(t * 0.4, t * 0.2);
          float turb = fbm(fp) * 0.5 + fbm(fp * 2.3 + vec2(t, -t)) * 0.3;

          float core     = smoothstep(0.18, 0.08, len);
          float coreEdge = smoothstep(0.08, 0.20, len) * smoothstep(0.35, 0.20, len);

          vec2  sp     = twisted * 8.0;
          float sparks = 0.0;
          for (int i = 0; i < 5; i++) {
            float fi  = float(i);
            float sa2 = sin(t * 0.6 + fi * 1.3);
            float ca2 = cos(t * 0.4 + fi * 2.1);
            vec2  spp = vec2(ca2 * sp.x - sa2 * sp.y, sa2 * sp.x + ca2 * sp.y);
            float s   = hash(floor(spp + vec2(fi * 3.7, fi * 1.9)));
            sparks += s * s * smoothstep(0.0, 0.05, len) * smoothstep(0.75, 0.3, len);
          }
          sparks *= 0.4;

          vec3 fireDeep  = vec3(0.55, 0.05, 0.0);
          vec3 fireMid   = vec3(1.0,  0.35, 0.05);
          vec3 fireHot   = vec3(1.0,  0.85, 0.4);
          vec3 coreColor = vec3(1.0,  0.95, 0.8);

          float intensity = (arms * 0.6 + ring * 1.2 + turb * 0.3 * ring + innerRing * 0.5) * (1.0 - core) + sparks * 0.3;
          intensity = clamp(intensity, 0.0, 1.0);

          vec3 fc = mix(fireDeep, fireMid,   smoothstep(0.0, 0.5, intensity));
          fc      = mix(fc,       fireHot,   smoothstep(0.5, 0.8, intensity));
          fc      = mix(fc,       coreColor, smoothstep(0.8, 1.0, intensity));
          fc      = mix(fc, vec3(0.0), core * 0.98);
          fc     += coreEdge * vec3(0.8, 0.3, 0.05) * 0.4;

          return fc * intensity;
        }

        void main() {
          vec3 dir = normalize(vPos);
          vec2 uv  = dir.xz * 2.2;

          float sr = sin(-u_rotation);
          float cr = cos(-u_rotation);
          uv = vec2(cr * uv.x - sr * uv.y, sr * uv.x + cr * uv.y);

          float t = u_time * 0.25;

          float nebula = fbm(uv * 1.5 + t * 0.05) * 0.15;
          vec3  col    = vec3(0.01, 0.005, 0.02) + vec3(0.12, 0.02, 0.18) * nebula;

          for (int i = 0; i < 3; i++) {
            col += vortex(uv - u_holes[i], t);
          }

          col += vec3(0.4, 0.05, 0.0) * exp(-length(uv) * 3.0) * 0.15;
          col *= 1.0 - smoothstep(0.5, 1.2, length(uv)) * 0.7;
          col  = col / (col + 0.5);
          col  = pow(col, vec3(0.45));

          gl_FragColor = vec4(col, 1.0);
        }
      `;

      return new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
      });
    },
  };

  const materialFunc  = skyboxMaterials[theme] || skyboxMaterials.space;
  const skyboxMaterial = materialFunc();
  const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
  return skybox;
};

const applyColorScheme = (theme) => {
  console.log("Applying color scheme:", theme);
};

export { createSkybox, createSkyboxWithTheme, applyColorScheme };