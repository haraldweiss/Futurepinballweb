/**
 * editor-3d-preview.ts — Real-time 3D Table Preview
 *
 * Renders a lightweight 3D preview of the table using Three.js
 * Synchronized with the 2D editor canvas
 *
 * Features:
 * - Top-down camera view matching 2D editor layout
 * - Real-time updates as elements are added/modified
 * - Proper lighting and materials
 * - No physics simulation (lightweight)
 */

import * as THREE from 'three';

interface Bumper { type: 'bumper'; x: number; y: number; color: number; }
interface Target { type: 'target'; x: number; y: number; color: number; }
interface Ramp { type: 'ramp'; x1: number; y1: number; x2: number; y2: number; color: number; }
type Elem = Bumper | Target | Ramp;

export class Editor3DPreview {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private previewGroup: THREE.Group;
  private canvas: HTMLCanvasElement;
  private animationId: number | null = null;

  // State
  private elements: Elem[] = [];
  private tableColor = 0x1a4a15;
  private accentColor = 0x00ff66;
  private meshCache: Map<string, THREE.Object3D> = new Map();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050508);

    // Create camera (top-down view)
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    this.camera.position.set(0, 10, 0);
    this.camera.lookAt(0, 0, 0);

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x050508, 1);

    // Create group for table elements
    this.previewGroup = new THREE.Group();
    this.scene.add(this.previewGroup);

    // Add lighting
    this.setupLighting();

    // Add playfield background
    this.createPlayfieldBackground();

    // Start render loop
    this.startRenderLoop();

    // Handle resize
    window.addEventListener('resize', () => this.onWindowResize());
  }

  /**
   * Update elements in preview
   */
  setElements(elements: Elem[]): void {
    this.elements = elements;
    this.updatePreview();
  }

  /**
   * Update table colors
   */
  updateTableColors(tableColor: number, accentColor: number): void {
    this.tableColor = tableColor;
    this.accentColor = accentColor;
    this.updatePreview();
  }

  /**
   * Dispose renderer and clean up
   */
  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.meshCache.forEach(mesh => {
      if (mesh instanceof THREE.Mesh) {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    this.previewGroup.clear();
    this.renderer.dispose();
    window.removeEventListener('resize', () => this.onWindowResize());
  }

  /**
   * Set canvas size
   */
  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Setup scene lighting
   */
  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Main directional light (from top)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(0, 8, 5);
    dirLight.castShadow = false;
    this.scene.add(dirLight);

    // Accent light
    const accentLight = new THREE.PointLight(this.accentColor, 0.5, 20);
    accentLight.position.set(0, 5, -3);
    this.scene.add(accentLight);
  }

  /**
   * Create playfield background mesh
   */
  private createPlayfieldBackground(): void {
    // Table background plane
    const geometry = new THREE.PlaneGeometry(6, 12);
    const material = new THREE.MeshStandardMaterial({
      color: this.tableColor,
      roughness: 0.4,
      metalness: 0.1,
    });

    const plane = new THREE.Mesh(geometry, material);
    plane.rotation.x = -Math.PI / 2;  // Rotate to lie flat
    plane.position.y = -0.01;  // Slightly below elements
    this.scene.add(plane);

    // Border walls
    const wallMaterial = new THREE.LineBasicMaterial({ color: 0x4488ff, linewidth: 2 });

    const corners = [
      [-3, -6], [3, -6], [3, 6], [-3, 6], [-3, -6],
    ];

    const wallGeometry = new THREE.BufferGeometry();
    const positions: number[] = [];

    corners.forEach(([x, y]) => {
      positions.push(x, 0, y);
    });

    wallGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    const walls = new THREE.LineSegments(wallGeometry, wallMaterial);
    this.scene.add(walls);
  }

  /**
   * Update preview with current elements
   */
  private updatePreview(): void {
    // Clear old elements
    const toRemove: THREE.Object3D[] = [];
    this.previewGroup.children.forEach(child => {
      if (child.userData.isElement) {
        toRemove.push(child);
      }
    });
    toRemove.forEach(child => this.previewGroup.remove(child));

    // Add new elements
    this.elements.forEach((el, index) => {
      const mesh = this.createElementMesh(el, index);
      if (mesh) {
        this.previewGroup.add(mesh);
      }
    });
  }

  /**
   * Create 3D mesh for an element
   */
  private createElementMesh(el: Elem, index: number): THREE.Object3D | null {
    const group = new THREE.Group();
    group.userData.isElement = true;
    group.userData.elementIndex = index;

    if (el.type === 'bumper') {
      // Bumper: sphere with emissive glow
      const color = new THREE.Color(el.color);
      const geometry = new THREE.SphereGeometry(0.25, 16, 16);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        roughness: 0.2,
        metalness: 0.8,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(el.x, 0.3, el.y);
      mesh.castShadow = false;
      mesh.receiveShadow = false;

      // Add ring around bumper
      const ringGeometry = new THREE.TorusGeometry(0.3, 0.05, 8, 32);
      const ringMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.2,
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.05;

      group.add(mesh);
      group.add(ring);

    } else if (el.type === 'target') {
      // Target: cube
      const color = new THREE.Color(el.color);
      const geometry = new THREE.BoxGeometry(0.3, 0.15, 0.3);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.2,
        roughness: 0.3,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(el.x, 0.1, el.y);

      group.add(mesh);

    } else if (el.type === 'ramp') {
      // Ramp: inclined plane
      const color = new THREE.Color(el.color);
      const dx = el.x2 - el.x1;
      const dy = el.y2 - el.y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const geometry = new THREE.PlaneGeometry(length, 0.3);
      const material = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.15,
        roughness: 0.4,
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Position and rotate
      const cx = (el.x1 + el.x2) / 2;
      const cy = (el.y1 + el.y2) / 2;
      mesh.position.set(cx, 0.05, cy);
      mesh.rotation.z = -angle;
      mesh.rotation.x = 0.2;  // Slight tilt

      group.add(mesh);
    }

    if (el.type === 'bumper' || el.type === 'target') {
      group.position.set(el.x, 0, el.y);
    } else if (el.type === 'ramp') {
      const cx = (el.x1 + el.x2) / 2;
      const cy = (el.y1 + el.y2) / 2;
      group.position.set(cx, 0, cy);
    }

    return group;
  }

  /**
   * Start render loop
   */
  private startRenderLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);

      // Subtle rotation of light for visual interest
      const time = Date.now() * 0.0001;
      if (this.scene.children.length > 0) {
        const lights = this.scene.children.filter(child => child instanceof THREE.Light);
        lights.forEach(light => {
          if (light instanceof THREE.PointLight) {
            light.position.x = Math.sin(time) * 3;
            light.position.z = Math.cos(time * 0.7) * 2;
          }
        });
      }

      // Rotate preview group slightly
      this.previewGroup.rotation.x = 0.1;  // Slight tilt for better visibility

      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }

  /**
   * Handle window resize
   */
  private onWindowResize(): void {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;

    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
