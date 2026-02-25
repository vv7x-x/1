/* ============================================
   ULTRA-CINEMATIC 3D PORTAL
   Psychological, Minimalistic, Existential Void
   Modern Three.js (r158) with Post-Processing
   ============================================ */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ——————————————————————————————
// CONFIGURATION
// ——————————————————————————————
const CONFIG = {
  // Existential Void colors
  fogColor: 0x010102,
  fogDensity: 0.045,
  backgroundColor: 0x010102,

  portalRadius: 2.5,
  portalTube: 0.45,
  portalSegments: 256,

  // Mobile optimization for particles
  particleCount: window.innerWidth < 768 ? 800 : 2500,
  particleSpread: 18,
  particleSize: 1.2,

  cameraZ: window.innerWidth < 768 ? 9 : 7.5, // Push camera back on mobile
  breathingAmplitude: 0.05,
  breathingSpeed: 0.3,
  parallaxStrength: 0.25,

  portalExpandScale: window.innerWidth < 768 ? 3.5 : 5.5, // Smaller expansion to fit mobile screen
  expandDuration: 4.5,
  downloadRevealDelay: 3.5,

  hallucinationBase: 0.08,
  hallucinationMax: 0.8,
};

// Dynamic helper to get scale factor based on screen size
function getResponsiveScale() {
  const width = window.innerWidth;
  if (width < 480) return 0.5; // Small mobile
  if (width < 768) return 0.7; // Tablet/Large mobile
  return 1.0; // Desktop
}

// ——————————————————————————————
// STATE
// ——————————————————————————————
const state = {
  mouse: { x: 0, y: 0, targetX: 0, targetY: 0 },
  isEntered: false,
  isReturning: false,
  clock: new THREE.Clock(),
  audioPlaying: false,
  interactionProgress: 0, // 0 to 1 scaling factor for effects
  hallucinationIntensity: 0.08,
  exposure: 0.9,
  character: {
    mesh: null,
    mixer: null,
  }
};

// ——————————————————————————————
// DOM ELEMENTS
// ——————————————————————————————
const container = document.getElementById('canvas-container');
const loadingScreen = document.getElementById('loadingScreen');
const loadingBar = document.getElementById('loadingBar');
const uiOverlay = document.getElementById('uiOverlay');
const titleSection = document.getElementById('titleSection');
const enterBtn = document.getElementById('enterBtn');
const downloadSection = document.getElementById('downloadSection');
const flashOverlay = document.getElementById('flashOverlay');
const backBtn = document.getElementById('backBtn');
const soundToggle = document.getElementById('soundToggle');

// ——————————————————————————————
// LOADING MANAGER & AUDIO
// ——————————————————————————————
const manager = new THREE.LoadingManager();
manager.onProgress = function (url, itemsLoaded, itemsTotal) {
  loadingBar.style.width = (itemsLoaded / itemsTotal * 100) + '%';
};

let textures = {};
const textureLoader = new THREE.TextureLoader(manager);
const gltfLoader = new GLTFLoader(manager);

textures.smoke = textureLoader.load('assets/smoke.png');
// ... other textures
textures.metal = textureLoader.load('assets/metal.png');
textures.noise = textureLoader.load('assets/noise.png');

// Wrap handling
[textures.metal, textures.noise].forEach(tex => {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
});

// ——————————————————————————————
// CHARACTER LOADING & ANIMATION
// ——————————————————————————————
// Using a placeholder or loading from a URL. Since I cannot provide local files, 
// I will setup the logic for GLTF and use a high-quality human silhouette/model if possible.
// For now, I'll setup the structure for the user to drop their GLB.
function loadCharacter() {
  // Replace this URL with a valid glb when possible or let the logic handle it
  // Example: 'assets/psychological_human.glb'
  gltfLoader.load('https://vazxmixjsiawhamofees.supabase.co/storage/v1/object/public/models/man/model.gltf', (gltf) => {
    const model = gltf.scene;
    state.character.mesh = model;

    // Position deep behind portal - responsive Y position
    const responsiveY = window.innerWidth < 768 ? -2.2 : -1.8;
    model.position.set(0, responsiveY, -6);

    const scale = getResponsiveScale();
    model.scale.set(scale, scale, scale);

    // Material adjustments for psychological look
    model.traverse((child) => {
      if (child.isMesh) {
        child.material.color.setHex(0x222222);
        child.material.roughness = 0.8;
      }
    });

    scene.add(model);

    // Animation setup (shivering/trembling logic handled in animate loop if no clips)
    state.character.mixer = new THREE.AnimationMixer(model);
    if (gltf.animations.length > 0) {
      const action = state.character.mixer.clipAction(gltf.animations[0]);
      action.play();
    }
  });
}
loadCharacter();

const bgAudio = new Audio();
bgAudio.loop = true;
bgAudio.volume = 0;
manager.itemStart('assets/ambient.mp3');
bgAudio.addEventListener('canplaythrough', () => {
  manager.itemEnd('assets/ambient.mp3');
}, { once: true });
bgAudio.src = 'assets/ambient.mp3';
bgAudio.load();

manager.onLoad = function () {
  setTimeout(() => {
    loadingScreen.classList.add('hidden');
    setTimeout(() => {
      enterBtn.style.opacity = '1';
      titleSection.style.opacity = '1';
    }, 1500);
  }, 500);
};

// ——————————————————————————————
// THREE.JS SETUP
// ——————————————————————————————
const renderer = new THREE.WebGLRenderer({
  antialias: false,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(CONFIG.backgroundColor);
// Filmic mapping + dynamic exposure controlled later
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(CONFIG.fogColor, CONFIG.fogDensity);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, CONFIG.cameraZ);

// ——————————————————————————————
// POST PROCESSING PIPELINE
// ——————————————————————————————
const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// Subtle cinematic bloom
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8,  // strength
  0.6,  // radius
  0.4   // threshold
);
composer.addPass(bloomPass);

// Film grain (Subtle)
const filmPass = new FilmPass(
  0.15, // noise intensity
  0.0,  // scanlines disabled for psychological feel, keeping just grain
  0,
  false
);
filmPass.renderToScreen = false;
composer.addPass(filmPass);

// RGB Shift (Chromatic Aberration - Low intensity)
const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.uniforms['amount'].value = 0.001;
composer.addPass(rgbShiftPass);

// Custom Vignette Pass
const VignetteShader = {
  uniforms: {
    "tDiffuse": { value: null },
    "offset": { value: 1.0 },
    "darkness": { value: 1.8 }
  },
  vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
  fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float offset;
        uniform float darkness;
        varying vec2 vUv;
        void main() {
            vec4 texel = texture2D(tDiffuse, vUv);
            vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
            gl_FragColor = vec4(mix(texel.rgb, vec3(0.0), dot(uv, uv) * darkness), texel.a);
        }
    `
};
const vignettePass = new ShaderPass(VignetteShader);
vignettePass.renderToScreen = false;
composer.addPass(vignettePass);

// ——————————————————————————————
// HALLUCINATION & GHOSTING
// ——————————————————————————————

// Custom Hallucination Shader (Breathing & UV Warps)
const HallucinationShader = {
  uniforms: {
    "tDiffuse": { value: null },
    "uTime": { value: 0 },
    "uIntensity": { value: 0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    varying vec2 vUv;

    // Pseudo-random noise
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.7, 311.1))) * 43758.5); }
    float noise(vec2 p) {
      vec2 i = floor(p); vec2 f = fract(p);
      float a = hash(i); float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0)); float d = hash(i + vec2(1.0, 1.0));
      vec2 u = f*f*(3.0-2.0*f);
      return mix(a, b, u.x) + (c - a)* u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    void main() {
      vec2 uv = vUv;
      float distToCenter = length(uv - 0.5);

      // 1) Breathing Warp (Radial distortion)
      float breathing = sin(uTime * 1.2) * 0.002 * uIntensity;
      uv += normalize(uv - 0.5) * breathing * distToCenter;

      // 2) Perlin UV Warp (Edge focused)
      float edgeMask = smoothstep(0.0, 0.5, distToCenter);
      float n = noise(uv * 10.0 + uTime * 0.5);
      uv += (n - 0.5) * 0.012 * uIntensity * edgeMask;

      gl_FragColor = texture2D(tDiffuse, uv);
    }
  `
};

const hallucinationPass = new ShaderPass(HallucinationShader);
hallucinationPass.renderToScreen = false;
composer.addPass(hallucinationPass);

// Temporal Ghosting (After-image)
const afterimagePass = new AfterimagePass();
afterimagePass.uniforms["damp"].value = 0.92; // Persistence balance
afterimagePass.renderToScreen = false;
composer.addPass(afterimagePass);

// Local Character Distortion (Spatial Warp near the character)
const CharDistortShader = {
  uniforms: {
    "tDiffuse": { value: null },
    "uTime": { value: 0 },
    "uIntensity": { value: 0 },
    "uCharPos": { value: new THREE.Vector2(0.5, 0.5) } // Normalized screen space
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    uniform vec2 uCharPos;
    varying vec2 vUv;

    void main() {
      vec2 uv = vUv;
      float d = distance(uv, uCharPos);
      
      // Local warp around head area
      float warpMask = smoothstep(0.3, 0.0, d);
      float noise = sin(uv.x * 50.0 + uTime * 10.0) * cos(uv.y * 50.0 + uTime * 10.0);
      
      uv += noise * 0.005 * uIntensity * warpMask;
      
      gl_FragColor = texture2D(tDiffuse, uv);
    }
  `
};
const charDistortPass = new ShaderPass(CharDistortShader);
charDistortPass.renderToScreen = true;
composer.addPass(charDistortPass);


// ——————————————————————————————
// ADVANCED PORTAL SHADER (Torus)
// ——————————————————————————————
const portalVertexShader = `
  uniform float uTime;
  uniform vec2 uMouse;
  uniform float uInteraction;
  uniform sampler2D uMetalTex;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;

    // Metal texture displacement
    float metalDisp = texture2D(uMetalTex, uv * 2.0 + uTime * 0.05).r;
    
    // Mouse interaction displacement
    float mouseDist = length(position.xy - uMouse * 2.0);
    float mouseInfluence = smoothstep(3.5, 0.0, mouseDist);
    
    // Subtle displacement combined
    float displacement = (metalDisp * 0.04) + (mouseInfluence * 0.15 * (1.0 + uInteraction));
    
    // Anisotropic rotation distortion
    vec3 pos = position;
    float twist = pos.y * 0.2 * uInteraction;
    float s = sin(twist);
    float c = cos(twist);
    mat2 rot = mat2(c, -s, s, c);
    pos.xz = rot * pos.xz;

    vec3 displaced = pos + normal * displacement;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const portalFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uInteraction;
  uniform sampler2D uMetalTex;
  uniform sampler2D uNoiseTex;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    // Fresnel
    vec3 viewDir = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 2.5);

    // UV Distortion map using noise
    vec2 noiseUv = vUv * 2.0 + vec2(uTime * 0.03, uTime * 0.05);
    float noiseDistort = texture2D(uNoiseTex, noiseUv).r * 0.1;
    
    vec2 st = vUv;
    st += noiseDistort;

    // Metal Roughness/Surface
    vec4 metalData = texture2D(uMetalTex, st * 3.0);
    float roughness = metalData.r;

    // Emissive mask from noise pulsing with time
    float noiseMask = texture2D(uNoiseTex, st * 1.5 - uTime * 0.08).g;
    float pulse = sin(uTime * 2.0 + noiseMask * 10.0) * 0.5 + 0.5;
    
    // Colors (Cold blue-gray)
    vec3 baseCore = vec3(0.02, 0.03, 0.05);
    vec3 midGlow = vec3(0.08, 0.15, 0.25);
    vec3 hotEdge = vec3(0.3, 0.5, 0.65);

    // Mixing
    vec3 color = mix(baseCore, midGlow, fresnel + (pulse * 0.3));
    color = mix(color, hotEdge, fresnel * pulse * noiseMask);
    
    // Add roughness variation
    color -= (roughness * 0.05);

    // Interaction spike
    float emissive = uIntensity * (1.0 + uInteraction * 2.0);
    color *= emissive;

    float alpha = smoothstep(0.0, 0.8, fresnel + noiseMask * 0.5 + 0.1);
    
    gl_FragColor = vec4(color, alpha);
  }
`;

const portalGeometry = new THREE.TorusGeometry(CONFIG.portalRadius, CONFIG.portalTube, 128, CONFIG.portalSegments);
const portalMaterial = new THREE.ShaderMaterial({
  vertexShader: portalVertexShader,
  fragmentShader: portalFragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0, 0) },
    uIntensity: { value: 1.0 },
    uInteraction: { value: 0.0 },
    uMetalTex: { value: textures.metal },
    uNoiseTex: { value: textures.noise },
  },
  transparent: true,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const portal = new THREE.Mesh(portalGeometry, portalMaterial);
const baseScale = getResponsiveScale();
portal.scale.set(baseScale, baseScale, baseScale);
scene.add(portal);


// ——————————————————————————————
// INNER VORTEX CORE
// Plane holding a polar-coordinate radial shader inside the torus
// ——————————————————————————————
const coreVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coreFragmentShader = `
  uniform float uTime;
  uniform float uInteraction;
  uniform sampler2D uNoiseTex;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv - 0.5;
    
    // Polar coordinates
    float radius = length(uv);
    float angle = atan(uv.y, uv.x);
    
    // Depth illusion inward spiral
    float spiral = angle * 2.0 - radius * (20.0 + uInteraction * 10.0) + uTime * 2.0;
    
    // Sample noise using polar driven UVs
    vec2 polarUv = vec2(cos(spiral), sin(spiral)) * radius;
    float noise = texture2D(uNoiseTex, polarUv * 0.5 + uTime * 0.05).r;

    // Void edge fade
    float edgeMask = smoothstep(0.5, 0.0, radius);
    float innerFade = smoothstep(0.0, 0.15, radius); // extremely dark center
    
    // Existential cold gray-blue
    vec3 vortexColor = vec3(0.01, 0.03, 0.08) + vec3(0.05, 0.1, 0.2) * noise;
    
    // Addive intensity based on interaction and noise
    float alpha = noise * edgeMask * innerFade * (0.6 + uInteraction * 0.4);

    gl_FragColor = vec4(vortexColor * (1.0 + uInteraction), alpha);
  }
`;

const coreGeo = new THREE.PlaneGeometry(CONFIG.portalRadius * 2.2, CONFIG.portalRadius * 2.2);
const coreMat = new THREE.ShaderMaterial({
  vertexShader: coreVertexShader,
  fragmentShader: coreFragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uInteraction: { value: 0 },
    uNoiseTex: { value: textures.noise }
  },
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const portalCore = new THREE.Mesh(coreGeo, coreMat);
portalCore.position.z = -0.5; // push slightly back inside the torus
portal.add(portalCore);


// ——————————————————————————————
// 3 LAYER LAYERED SMOKE PLANES
// ——————————————————————————————
const smokeLayers = [];
const smokeSettings = [
  { scale: 12, rotSpeed: 0.05, opacity: 0.08, zOffset: 1.0 }, // Foreground huge
  { scale: 9, rotSpeed: -0.08, opacity: 0.12, zOffset: 0.0 }, // Mid
  { scale: 7, rotSpeed: 0.15, opacity: 0.15, zOffset: -1.0 }  // Background fast
];

smokeSettings.forEach(setting => {
  const geo = new THREE.PlaneGeometry(setting.scale, setting.scale);
  const mat = new THREE.MeshBasicMaterial({
    map: textures.smoke,
    transparent: true,
    opacity: setting.opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    color: 0x4a6a8a, // Cold blue-gray tint
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.z = setting.zOffset;
  mesh.userData = { rotSpeed: setting.rotSpeed };
  scene.add(mesh);
  smokeLayers.push(mesh);
});

// ——————————————————————————————
// ADVANCED PARTICLE SYSTEM
// ——————————————————————————————
const particleGeometry = new THREE.BufferGeometry();
const pPositions = new Float32Array(CONFIG.particleCount * 3);
const pVelocities = new Float32Array(CONFIG.particleCount * 3);
const pSizes = new Float32Array(CONFIG.particleCount);
const pOpacities = new Float32Array(CONFIG.particleCount);

for (let i = 0; i < CONFIG.particleCount; i++) {
  const i3 = i * 3;
  // Depth distribution (focusing behind the portal to give void depth)
  const z = (Math.random() - 0.2) * CONFIG.particleSpread;
  const xySpread = (CONFIG.particleSpread - Math.abs(z)) * 0.8;
  const theta = Math.random() * Math.PI * 2;
  const radius = Math.pow(Math.random(), 0.7) * xySpread;

  pPositions[i3] = radius * Math.cos(theta);
  pPositions[i3 + 1] = radius * Math.sin(theta);
  pPositions[i3 + 2] = z;

  pVelocities[i3] = (Math.random() - 0.5) * 0.001;
  pVelocities[i3 + 1] = (Math.random() - 0.5) * 0.001;
  pVelocities[i3 + 2] = (Math.random() - 0.5) * 0.001;

  pSizes[i] = Math.random() * CONFIG.particleSize + 0.3;
  pOpacities[i] = Math.random() * 0.6 + 0.1;
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1));
particleGeometry.setAttribute('aOpacity', new THREE.BufferAttribute(pOpacities, 1));

const pShaderMat = new THREE.ShaderMaterial({
  vertexShader: `
    attribute float aSize;
    attribute float aOpacity;
    varying float vAlpha;
    uniform float uInteraction;
    
    void main() {
      vAlpha = aOpacity;
      vec3 pos = position;
      
      // Depth zoom stretch during interaction
      if(uInteraction > 0.0) {
          pos.z += uInteraction * abs(pos.x + pos.y) * 2.0; 
      }
      
      vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
      gl_PointSize = aSize * (300.0 / -mvPosition.z) * (1.0 + uInteraction * 0.5);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    varying float vAlpha;
    void main() {
      vec2 xy = gl_PointCoord.xy - vec2(0.5);
      float ll = length(xy);
      if(ll > 0.5) discard;
      float alpha = smoothstep(0.5, 0.1, ll) * vAlpha;
      gl_FragColor = vec4(0.3, 0.45, 0.65, alpha); // Cold gray blue
    }
  `,
  uniforms: { uInteraction: { value: 0.0 } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const particles = new THREE.Points(particleGeometry, pShaderMat);
scene.add(particles);

// ——————————————————————————————
// LIGHTING
// ——————————————————————————————
const ambientLight = new THREE.AmbientLight(0x050a14, 0.4);
scene.add(ambientLight);

// Main Portal Light
const pointLight = new THREE.PointLight(0x2a4f7a, 1.5, 30, 2.0);
pointLight.position.set(0, 0, 1.5);
scene.add(pointLight);

// Character Rim Light (Cold Blue)
const charLight = new THREE.PointLight(0x4a8aff, 0.8, 15, 2.0);
charLight.position.set(-2, 1, -5);
scene.add(charLight);

// ——————————————————————————————
// AUDIO CONTROLS
// ——————————————————————————————
function fadeInAudio(duration = 4.5) {
  if (bgAudio.paused) bgAudio.play().catch(e => console.warn('Audio play failed', e));
  gsap.to(bgAudio, { volume: 0.6, duration: duration, ease: 'power2.inOut' });
  state.audioPlaying = true;
}

function fadeOutAudio(duration = 2) {
  gsap.to(bgAudio, {
    volume: 0,
    duration: duration,
    ease: 'power2.inOut',
    onComplete: () => bgAudio.pause()
  });
  state.audioPlaying = false;
}

// ——————————————————————————————
// MOUSE INTERACTION (Lerped)
// ——————————————————————————————
function onMouseMove(e) {
  state.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
  state.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
}
window.addEventListener('mousemove', onMouseMove, { passive: true });

// ——————————————————————————————
// ENTER PORTAL ANIMATION (GSAP Timeline)
// ——————————————————————————————
function enterPortal() {
  if (state.isEntered) return;
  state.isEntered = true;

  const tl = gsap.timeline();

  // 1) PHASE 1 FADE OUT: Title and Button dissolve
  tl.to(titleSection, { opacity: 0, y: -40, duration: 1.2, ease: 'power2.inOut' }, 0);
  tl.to(enterBtn, {
    opacity: 0, scale: 0.95, y: 10, duration: 1.0, ease: 'power2.inOut',
    onComplete: () => {
      enterBtn.style.display = 'none';
      titleSection.style.display = 'none';
      uiOverlay.style.pointerEvents = 'none';
    },
  }, 0.1);

  // 2) PORTAL INTERACTION: Crossing into the unknown
  tl.to(state, { interactionProgress: 1.0, duration: CONFIG.expandDuration, ease: 'power4.inOut' }, 0.5);
  tl.to(bloomPass, { strength: 2.8, duration: CONFIG.expandDuration, ease: 'power2.inOut' }, 0.5);
  tl.to(rgbShiftPass.uniforms.amount, { value: 0.008, duration: CONFIG.expandDuration, ease: 'power2.inOut' }, 0.5);
  tl.to(pointLight, { intensity: 8.0, distance: 60, duration: CONFIG.expandDuration, ease: 'power2.inOut' }, 0.5);

  // 3) DEPTH ZOOM: Camera push and Portal expansion
  tl.to(portal.scale, {
    x: CONFIG.portalExpandScale, y: CONFIG.portalExpandScale, z: CONFIG.portalExpandScale,
    duration: CONFIG.expandDuration, ease: 'expo.inOut'
  }, 0.5);

  tl.to(camera.position, {
    z: CONFIG.cameraZ - 4.5, duration: CONFIG.expandDuration, ease: 'expo.inOut'
  }, 0.5);

  // 4) THE FLASH: Transition threshold
  tl.to(flashOverlay, { opacity: 1, duration: 1.0, ease: 'power2.in' }, CONFIG.expandDuration - 1.5);
  // Exposure spike during flash
  tl.to(state, { exposure: 5.0, duration: 0.2, ease: 'power2.in' }, CONFIG.expandDuration - 0.5);
  tl.to(state, { exposure: 1.1, duration: 2.0, ease: 'power2.out' }, CONFIG.expandDuration - 0.3);
  tl.to(flashOverlay, { opacity: 0, duration: 2.5, ease: 'power2.out', delay: 0.2 }, CONFIG.expandDuration - 0.5);

  // 5) PHASE 2 REVEAL: Crossing into the psychological layer
  // First, make the section visible (logic state)
  tl.add(() => {
    downloadSection.classList.add('visible');
    // Ensure sound toggle becomes visible as a quiet companion
    soundToggle.classList.add('visible');
    fadeInAudio(CONFIG.expandDuration);
  }, CONFIG.expandDuration - 1.0);

  // Staggered entrance for existential consequence (the download elements)
  const downloadItemsTime = CONFIG.expandDuration - 0.2;
  tl.fromTo('.download-title', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.5, ease: 'power3.out' }, downloadItemsTime);
  tl.fromTo('.download-subtitle', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.5, ease: 'power3.out' }, downloadItemsTime + 0.3);
  tl.fromTo('.download-btn', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1.5, ease: 'power3.out' }, downloadItemsTime + 0.6); // Delayed 0.3s after subtitle
  tl.fromTo('.back-btn', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power3.out' }, downloadItemsTime + 1.2);

  // 6) SETTLE: Calm the void effects
  tl.to(state, { interactionProgress: 0.2, duration: 4, ease: 'power2.out' }, CONFIG.expandDuration + 0.5);
  tl.to(bloomPass, { strength: 1.2, duration: 4, ease: 'power2.out' }, CONFIG.expandDuration + 0.5);
  tl.to(rgbShiftPass.uniforms.amount, { value: 0.001, duration: 4, ease: 'power2.out' }, CONFIG.expandDuration + 0.5);
}

// ——————————————————————————————
// RETURN / BACK
// ——————————————————————————————
function returnToPortal() {
  if (state.isReturning) return;
  state.isReturning = true;

  const tl = gsap.timeline({
    onComplete: () => {
      state.isEntered = false;
      state.isReturning = false;
    },
  });

  // 1) PHASE 2 FADE OUT
  tl.to(['.download-title', '.download-subtitle', '.download-btn', '.back-btn'], {
    opacity: 0, y: 20, duration: 0.8, ease: 'power2.inOut', stagger: 0.05,
  }, 0);
  tl.add(() => { downloadSection.classList.remove('visible'); }, 0.8);

  // 2) COLLAPSE PORTAL: Returning to the starting surface
  tl.to(portal.scale, { x: 1, y: 1, z: 1, duration: 3.5, ease: 'expo.inOut' }, 0.5);
  tl.to(state, { interactionProgress: 0.0, duration: 3.5, ease: 'power2.inOut' }, 0.5);
  tl.to(bloomPass, { strength: 0.8, duration: 3.5, ease: 'power2.inOut' }, 0.5);
  tl.to(rgbShiftPass.uniforms.amount, { value: 0.001, duration: 3.5, ease: 'power2.inOut' }, 0.5);
  tl.to(pointLight, { intensity: 1.5, distance: 30, duration: 3.5, ease: 'power2.inOut' }, 0.5);
  tl.to(state, { exposure: 0.9, duration: 3.5, ease: 'power2.inOut' }, 0.5);
  tl.to(camera.position, { z: CONFIG.cameraZ, duration: 3.5, ease: 'expo.inOut' }, 0.5);

  // 3) RESTORE PHASE 1 UI
  tl.add(() => {
    enterBtn.style.display = 'block';
    titleSection.style.display = 'block';
    uiOverlay.style.pointerEvents = 'all';
  }, 1.5);

  tl.to(titleSection, { opacity: 1, y: 0, duration: 1.5, ease: 'power3.out' }, 2.0);
  tl.to(enterBtn, { opacity: 1, scale: 1, y: 0, duration: 1.2, ease: 'power3.out' }, 2.3);

  fadeOutAudio(2.5);
}

enterBtn.addEventListener('click', enterPortal);
backBtn.addEventListener('click', returnToPortal);
soundToggle.addEventListener('click', () => {
  if (state.audioPlaying) fadeOutAudio();
  else fadeInAudio();
});

// ——————————————————————————————
// ANIMATION LOOP
// ——————————————————————————————
function animate() {
  requestAnimationFrame(animate);
  const elapsed = state.clock.getElapsedTime();

  // Lerp mouse
  state.mouse.x += (state.mouse.targetX - state.mouse.x) * 0.08;
  state.mouse.y += (state.mouse.targetY - state.mouse.y) * 0.08;

  // Update uniforms
  [portalMaterial, coreMat].forEach(mat => {
    mat.uniforms.uTime.value = elapsed;
    mat.uniforms.uInteraction.value = state.interactionProgress;
  });
  portalMaterial.uniforms.uMouse.value.set(state.mouse.x, state.mouse.y);
  pShaderMat.uniforms.uInteraction.value = state.interactionProgress;

  // Hallucination updates
  state.hallucinationIntensity = CONFIG.hallucinationBase + (state.interactionProgress * (CONFIG.hallucinationMax - CONFIG.hallucinationBase));
  hallucinationPass.uniforms.uIntensity.value = state.hallucinationIntensity;
  hallucinationPass.uniforms.uTime.value = elapsed;

  // Ghosting / Afterimage dampening dynamics
  // Lower damp = faster clear = less trail. User requested 0.92 base, 0.85 during expansion.
  afterimagePass.uniforms["damp"].value = 0.92 - (state.interactionProgress * 0.07);

  // RGB Shift / Chromatic Aberration Spike
  rgbShiftPass.uniforms['amount'].value = 0.001 + (state.interactionProgress * 0.006);

  // Vignette darkness tied to interaction
  vignettePass.uniforms.darkness.value = 1.8 + (state.interactionProgress * 1.2);

  // Portal base rotation
  portal.rotation.y = Math.sin(elapsed * 0.1) * 0.1;
  portal.rotation.z += 0.0005;

  // Exposure breathing tied to uInteraction + baseline state
  const exposureBreathing = Math.sin(elapsed * 1.5) * 0.05;
  renderer.toneMappingExposure = state.exposure + (state.interactionProgress * 0.4) + exposureBreathing;

  // Camera Parallax & Breathing
  const breathX = Math.sin(elapsed * CONFIG.breathingSpeed) * CONFIG.breathingAmplitude;
  const breathY = Math.cos(elapsed * CONFIG.breathingSpeed * 0.8) * CONFIG.breathingAmplitude;
  const targetCamX = breathX + state.mouse.x * CONFIG.parallaxStrength;
  const targetCamY = breathY + state.mouse.y * CONFIG.parallaxStrength;

  // Micro Camera Jitter during high interaction
  let jitterX = 0;
  let jitterY = 0;
  if (state.interactionProgress > 0.05) {
    jitterX = Math.sin(elapsed * 45.0) * 0.003 * state.interactionProgress;
    jitterY = Math.cos(elapsed * 40.0) * 0.003 * state.interactionProgress;
  }

  camera.position.x += (targetCamX + jitterX - camera.position.x) * 0.05;
  camera.position.y += (targetCamY + jitterY - camera.position.y) * 0.05;
  if (!state.isEntered && !state.isReturning) {
    camera.position.z += (CONFIG.cameraZ - camera.position.z) * 0.05;
  }
  camera.lookAt(0, 0, 0);

  // Smoke Layers Animation
  smokeLayers.forEach((layer, idx) => {
    // Rotation
    layer.rotation.z += layer.userData.rotSpeed * (1.0 + state.interactionProgress * 2.0) * 0.02;
    // Slight scale breathing
    const scaleBase = smokeSettings[idx].scale;
    const s = scaleBase + Math.sin(elapsed * (0.2 + idx * 0.1)) * 0.5;
    layer.scale.set(s, s, 1);
  });

  // Update Particles
  const posArray = particleGeometry.attributes.position.array;
  const speedScale = 1.0 + state.interactionProgress * 6.0; // Significant acceleration upon entry

  for (let i = 0; i < CONFIG.particleCount; i++) {
    const i3 = i * 3;

    posArray[i3] += pVelocities[i3] * speedScale;
    posArray[i3 + 1] += pVelocities[i3 + 1] * speedScale;
    posArray[i3 + 2] += pVelocities[i3 + 2] * speedScale;

    const x = posArray[i3];
    const y = posArray[i3 + 1];
    const dist = Math.sqrt(x * x + y * y);
    if (dist > 0.5) {
      posArray[i3] += (-y / dist) * 0.001 * speedScale;
      posArray[i3 + 1] += (x / dist) * 0.001 * speedScale;
    }

    const d3 = Math.sqrt(x * x + y * y + posArray[i3 + 2] * posArray[i3 + 2]);
    if (d3 > CONFIG.particleSpread) {
      pVelocities[i3] *= -1;
      pVelocities[i3 + 1] *= -1;
      pVelocities[i3 + 2] *= -1;
    }
  }
  particleGeometry.attributes.position.needsUpdate = true;
  // Particles rotation sensitive to interaction
  particles.rotation.z += 0.0003 * speedScale;

  // Character animation & Shivering & Local Projection
  if (state.character.mesh) {
    const char = state.character.mesh;
    const shiverScale = 0.002 + state.interactionProgress * 0.008; // Peak shivering during portal peak

    // Shivering/Trembling (High-frequency micro movement)
    char.position.x += (Math.random() - 0.5) * shiverScale;
    char.position.y += (Math.random() - 0.5) * shiverScale;

    // Body sway (Slow, unstable)
    char.rotation.y = Math.sin(elapsed * 0.5) * 0.08;
    char.rotation.z = Math.cos(elapsed * 0.3) * 0.03;

    // Project character head position to screen space for the local distortion pass
    const headPos = new THREE.Vector3(0, 1.5, -6); // approximate head location relative to model origin
    headPos.project(camera);
    charDistortPass.uniforms.uCharPos.value.set(
      (headPos.x + 1) / 2,
      (headPos.y + 1) / 2
    );
    charDistortPass.uniforms.uIntensity.value = 0.2 + state.interactionProgress * 1.5;
    charDistortPass.uniforms.uTime.value = elapsed;

    if (state.character.mixer) {
      state.character.mixer.update(0.016);
    }
  }

  // Light flickering logic
  pointLight.intensity = (state.isEntered ? 4.0 : 1.5) + Math.sin(elapsed * 5.0) * 0.3;
  charLight.intensity = 0.8 + Math.sin(elapsed * 3.0) * 0.2 + state.interactionProgress * 1.5;

  // Render via Composer
  composer.render();
}

// ——————————————————————————————
// RESPONSIVE
// ——————————————————————————————
function onResize() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  // Adjust Camera FOV for mobile vertical screens
  camera.aspect = w / h;
  if (w < 768) {
    camera.fov = 65; // Wider field of view for vertical screens
  } else {
    camera.fov = 45;
  }
  camera.updateProjectionMatrix();

  // Adjust Portal base scale
  const scale = getResponsiveScale();
  if (!state.isEntered && !state.isReturning) {
    portal.scale.set(scale, scale, scale);
  }

  // Update Renderer and Composer
  renderer.setSize(w, h);
  composer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}
window.addEventListener('resize', onResize, { passive: true });

// Run once to initialize
onResize();

// Start animation loop immediately, loading manager handles UI blanking
animate();
