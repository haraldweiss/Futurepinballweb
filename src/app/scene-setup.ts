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
  scene.fog = new THREE.Fog(0x1a1a22, 20, 50);

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
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#4a4a6a');
    gradient.addColorStop(1, '#2a2a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);
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
