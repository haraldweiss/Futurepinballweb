// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';
import { getPlayfieldCanvasSize } from '../responsive-display';
import { calculateResponsiveZoom, getResponsiveCameraTilt, getResponsiveFOV, getOptimalPixelRatio } from './responsive-helpers';

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  playgroundGroup: THREE.Group;
}

export function setupScene(): SceneContext {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a22);
  scene.fog = new THREE.Fog(0x1a1820, 30, 80);

  const playgroundGroup = new THREE.Group();
  playgroundGroup.name = 'playground';
  scene.add(playgroundGroup);

  const aspectRatio = innerWidth / innerHeight;
  const responsiveZoom = calculateResponsiveZoom(aspectRatio);
  const responsiveFOV = getResponsiveFOV();
  const responsiveTilt = getResponsiveCameraTilt(aspectRatio);

  const camera = new THREE.PerspectiveCamera(responsiveFOV, aspectRatio, 0.1, 200);
  camera.position.set(0, responsiveTilt, responsiveZoom);
  camera.lookAt(0, 0.5, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, precision: 'highp' });
  renderer.domElement.id = 'playfield-canvas';
  const initialCanvasSize = getPlayfieldCanvasSize();
  renderer.setPixelRatio(getOptimalPixelRatio());
  renderer.setSize(initialCanvasSize.displayWidth, initialCanvasSize.displayHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Enable maximum anisotropic filtering so playfield textures (wood grain,
  // lane markings) stay sharp at oblique viewing angles typical of pinball.
  THREE.Texture.DEFAULT_ANISOTROPY = renderer.capabilities.getMaxAnisotropy();

  const gl = renderer.getContext()!;
  ['WEBGL_compressed_texture_s3tc', 'WEBGL_compressed_texture_s3tc_srgb',
   'WEBGL_compressed_texture_etc1', 'WEBGL_compressed_texture_etc',
   'WEBGL_compressed_texture_astc'].forEach(ext => gl.getExtension(ext));

  document.body.appendChild(renderer.domElement);

  renderer.domElement.addEventListener('webglcontextlost', (e: Event) => {
    e.preventDefault();
    console.warn('[fpw] WebGL context lost — rendering paused until restore');
  }, false);
  renderer.domElement.addEventListener('webglcontextrestored', () => {
    console.warn('[fpw] WebGL context restored — re-uploading GPU resources');
  }, false);

  (function setupEnvironmentMap() {
    // Procedural equirectangular environment map with distinct light sources.
    // Mirrors a pinball cabinet lighting setup: warm overhead spot, cool side
    // fill, and a dark floor/ceiling. Gives metallic surfaces (ball, rails,
    // flippers) rich, varied reflections instead of a flat gradient.
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Base: dark ambient room
    ctx.fillStyle = '#1a1a22';
    ctx.fillRect(0, 0, 512, 256);

    // Overhead warm spotlight (center-top of equirect = above viewer)
    const spotGrad = ctx.createRadialGradient(256, 64, 0, 256, 64, 120);
    spotGrad.addColorStop(0, 'rgba(255, 240, 200, 1.0)');
    spotGrad.addColorStop(0.3, 'rgba(220, 200, 160, 0.8)');
    spotGrad.addColorStop(0.6, 'rgba(100, 90, 80, 0.3)');
    spotGrad.addColorStop(1, 'rgba(26, 26, 34, 0)');
    ctx.fillStyle = spotGrad;
    ctx.fillRect(0, 0, 512, 128);

    // Cool blue fill light (right side)
    const coolGrad = ctx.createRadialGradient(440, 160, 0, 440, 160, 100);
    coolGrad.addColorStop(0, 'rgba(100, 150, 255, 0.7)');
    coolGrad.addColorStop(0.5, 'rgba(60, 90, 180, 0.3)');
    coolGrad.addColorStop(1, 'rgba(26, 26, 34, 0)');
    ctx.fillStyle = coolGrad;
    ctx.fillRect(320, 80, 192, 160);

    // Warm accent light (left side, lower) — simulates DMD/backlight glow
    const warmGrad = ctx.createRadialGradient(80, 180, 0, 80, 180, 80);
    warmGrad.addColorStop(0, 'rgba(255, 180, 80, 0.6)');
    warmGrad.addColorStop(0.6, 'rgba(180, 120, 50, 0.2)');
    warmGrad.addColorStop(1, 'rgba(26, 26, 34, 0)');
    ctx.fillStyle = warmGrad;
    ctx.fillRect(0, 100, 160, 156);

    // Subtle horizon line for reflection depth
    const horizonGrad = ctx.createLinearGradient(0, 120, 0, 140);
    horizonGrad.addColorStop(0, 'rgba(60, 60, 80, 0.4)');
    horizonGrad.addColorStop(1, 'rgba(20, 20, 30, 0)');
    ctx.fillStyle = horizonGrad;
    ctx.fillRect(0, 120, 512, 20);

    const envMap = new THREE.CanvasTexture(canvas);
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    envMap.colorSpace = THREE.SRGBColorSpace;
    scene.environment = envMap;
  })();

  (function precompileShaders() {
    const dummyScene = new THREE.Scene();
    const dummyGeo = new THREE.BoxGeometry();
    [
      new THREE.MeshStandardMaterial({ color: 0xff0000, metalness: 0.5, roughness: 0.5 }),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1.0, roughness: 0.02 }),
      new THREE.PointsMaterial({ size: 0.1, vertexColors: true }),
    ].forEach(mat => {
      const mesh = new THREE.Mesh(dummyGeo, mat);
      dummyScene.add(mesh);
      renderer.render(dummyScene, camera);
    });
    renderer.compile(dummyScene, camera);
  })();

  return { scene, camera, renderer, playgroundGroup };
}
