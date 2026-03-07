/**
 * ─── Phase 4: Backglass 3D Renderer ───────────────────────────────────────
 *
 * Renders the pinball machine backglass with:
 * - 3D cabinet frame
 * - Artwork display (from FPT or default)
 * - Dynamic overlays (score, mode indicators, animations)
 * - Decorative lighting effects
 * - Adaptive rendering (3D on desktop, 2D fallback on mobile)
 */

import * as THREE from 'three';
import { state, currentTableConfig } from './game';

/**
 * ─── Phase 4: Adaptive Rendering Configuration ───
 */
export interface BackglassRenderConfig {
  enabled: boolean;
  use3D: boolean;  // true = 3D, false = 2D canvas fallback
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1200) return 'tablet';
  return 'desktop';
}

/**
 * ─── BackglassRenderer: Main 3D backglass system ───
 */
export class BackglassRenderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderTarget: THREE.WebGLRenderTarget;
  private width: number;
  private height: number;
  private config: BackglassRenderConfig;

  // Scene objects
  private cabinetFrame: THREE.Group;
  private artworkMesh: THREE.Mesh | null = null;
  private overlayGroup: THREE.Group;
  private decorativeLights: THREE.Light[] = [];

  // Animated overlays
  private animatingElements: Array<{
    mesh: THREE.Object3D;
    duration: number;
    startTime: number;
    animation: (progress: number) => void;
  }> = [];

  // Dynamic text meshes (for score display, etc.)
  private scoreDisplay: THREE.Mesh | null = null;
  private modeIndicator: THREE.Mesh | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    // ─── Phase 4: Adaptive Rendering Configuration ───
    const deviceType = detectDeviceType();
    const shouldUse3D = deviceType === 'desktop' ||
                       (deviceType === 'tablet' && window.devicePixelRatio < 2);

    this.config = {
      enabled: true,
      use3D: shouldUse3D,
      deviceType: deviceType,
    };

    console.log(`📺 Backglass: ${this.config.use3D ? '3D' : '2D'} mode (${deviceType})`);

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    // Orthographic camera for 2D-like rendering
    this.camera = new THREE.OrthographicCamera(
      0, width, 0, height,
      0.1, 1000
    );
    this.camera.position.z = 100;

    // Render target for offscreen rendering
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    // Create groups
    this.cabinetFrame = new THREE.Group();
    this.overlayGroup = new THREE.Group();

    this.scene.add(this.cabinetFrame);
    this.scene.add(this.overlayGroup);

    // Setup scene
    this.setupCabinet();
    this.setupLighting();
  }

  /**
   * ─── Phase 4: Cabinet Frame 3D Geometry ───
   * Creates the 3D cabinet border/frame
   */
  private setupCabinet(): void {
    // Cabinet frame: dark beveled border
    const frameThickness = 15;
    const frameColor = new THREE.Color(0x1a1a1a);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: frameColor,
      metalness: 0.2,
      roughness: 0.6,
    });

    // Top border
    const topBorder = new THREE.Mesh(
      new THREE.BoxGeometry(this.width + frameThickness * 2, frameThickness, 10),
      frameMaterial
    );
    topBorder.position.set(this.width / 2, this.height + frameThickness / 2, -5);
    this.cabinetFrame.add(topBorder);

    // Bottom border
    const bottomBorder = new THREE.Mesh(
      new THREE.BoxGeometry(this.width + frameThickness * 2, frameThickness, 10),
      frameMaterial
    );
    bottomBorder.position.set(this.width / 2, -frameThickness / 2, -5);
    this.cabinetFrame.add(bottomBorder);

    // Left border
    const leftBorder = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, this.height, 10),
      frameMaterial
    );
    leftBorder.position.set(-frameThickness / 2, this.height / 2, -5);
    this.cabinetFrame.add(leftBorder);

    // Right border
    const rightBorder = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, this.height, 10),
      frameMaterial
    );
    rightBorder.position.set(this.width + frameThickness / 2, this.height / 2, -5);
    this.cabinetFrame.add(rightBorder);
  }

  /**
   * ─── Phase 4: Decorative Lighting ───
   * Adds colored corner lights for visual appeal
   */
  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    // Corner lights: adds dimensionality
    const corners = [
      { pos: [20, this.height - 20, 50], color: 0xff6600 },      // Top-left (orange)
      { pos: [this.width - 20, this.height - 20, 50], color: 0x0099ff },  // Top-right (blue)
      { pos: [20, 20, 50], color: 0x00ff66 },                     // Bottom-left (green)
      { pos: [this.width - 20, 20, 50], color: 0xff00cc },        // Bottom-right (magenta)
    ];

    corners.forEach(corner => {
      const light = new THREE.PointLight(corner.color, 0.3, 150);
      light.position.set(...(corner.pos as [number, number, number]));
      this.scene.add(light);
      this.decorativeLights.push(light);
    });
  }

  /**
   * ─── Phase 4: Set Artwork Texture ───
   * Displays artwork on the backglass (from FPT or default)
   */
  public setArtwork(texture: THREE.Texture | null): void {
    // Remove old artwork
    if (this.artworkMesh) {
      this.scene.remove(this.artworkMesh);
      this.artworkMesh = null;
    }

    if (!texture) {
      // Create default artwork placeholder
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 600;
      const ctx = canvas.getContext('2d')!;

      // Dark gradient background
      const gradient = ctx.createLinearGradient(0, 0, 400, 600);
      gradient.addColorStop(0, '#222');
      gradient.addColorStop(1, '#111');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 400, 600);

      // Title text
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('FUTURE PINBALL', 200, 150);

      // Decorative text
      ctx.font = '20px Arial';
      ctx.fillStyle = '#cccccc';
      ctx.fillText('Web Edition', 200, 200);

      // Vertical lines for visual interest
      ctx.strokeStyle = '#444444';
      ctx.lineWidth = 2;
      for (let i = 0; i < 400; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 250);
        ctx.lineTo(i, 550);
        ctx.stroke();
      }

      texture = new THREE.CanvasTexture(canvas);
    }

    // Create artwork mesh
    const artworkGeo = new THREE.PlaneGeometry(this.width * 0.8, this.height * 0.85);
    const artworkMat = new THREE.MeshStandardMaterial({
      map: texture,
      metalness: 0.1,
      roughness: 0.7,
      emissive: 0x111111,
      emissiveIntensity: 0.1,
    });

    this.artworkMesh = new THREE.Mesh(artworkGeo, artworkMat);
    this.artworkMesh.position.set(this.width / 2, this.height / 2, 0);
    this.overlayGroup.add(this.artworkMesh);
  }

  /**
   * ─── Phase 4: Score Display Animation ───
   * Animates score increases with popup effect
   */
  public animateScoreIncrease(points: number, duration: number = 500): void {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;

    // Draw points text
    ctx.fillStyle = '#ffaa00';
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`+${points}`, 100, 60);

    const texture = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(200, 100);
    const mat = new THREE.MeshBasicMaterial({ map: texture, transparent: true });
    const mesh = new THREE.Mesh(geo, mat);

    const startPos = new THREE.Vector3(this.width / 2, this.height / 2 - 100, 10);
    const endPos = new THREE.Vector3(this.width / 2, this.height / 2 + 50, 10);

    mesh.position.copy(startPos);
    this.overlayGroup.add(mesh);

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed > duration) {
        this.overlayGroup.remove(mesh);
        return;
      }

      const progress = elapsed / duration;

      // Move up
      mesh.position.lerpVectors(startPos, endPos, progress);

      // Fade out
      (mat as any).opacity = 1 - (progress * progress);

      // Slight scale up
      mesh.scale.set(1 + progress * 0.3, 1 + progress * 0.3, 1);

      requestAnimationFrame(animate);
    };

    animate();
  }

  /**
   * ─── Phase 4: Mode Indicator ───
   * Shows current game mode or ball info
   */
  public setModeIndicator(text: string): void {
    // Remove old indicator
    if (this.modeIndicator) {
      this.overlayGroup.remove(this.modeIndicator);
      this.modeIndicator = null;
    }

    // Create new indicator
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 50;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 300, 50);

    ctx.fillStyle = '#00ff66';
    ctx.font = 'bold 30px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, 150, 35);

    const texture = new THREE.CanvasTexture(canvas);
    const geo = new THREE.PlaneGeometry(300, 50);
    const mat = new THREE.MeshBasicMaterial({ map: texture });
    const mesh = new THREE.Mesh(geo, mat);

    mesh.position.set(this.width / 2, 30, 5);
    this.overlayGroup.add(mesh);
    this.modeIndicator = mesh;
  }

  /**
   * ─── Phase 4: Parallax Effect ───
   * Shifts backglass slightly based on camera angle
   */
  public updateParallax(cameraRotation: THREE.Euler): void {
    const parallaxX = Math.sin(cameraRotation.y) * 20;
    const parallaxY = Math.sin(cameraRotation.x) * 15;

    this.cabinetFrame.position.x = parallaxX;
    this.overlayGroup.position.x = parallaxX;
    this.overlayGroup.position.y = parallaxY;
  }

  /**
   * ─── Phase 4: Update Method ───
   * Called each frame to update animations and effects
   */
  public update(): void {
    const now = Date.now();

    // Update animating elements
    this.animatingElements = this.animatingElements.filter(item => {
      const elapsed = now - item.startTime;
      if (elapsed > item.duration) {
        this.overlayGroup.remove(item.mesh);
        return false;
      }

      const progress = elapsed / item.duration;
      item.animation(progress);
      return true;
    });

    // Subtle pulsing of decorative lights
    const pulse = Math.sin(now * 0.001) * 0.2 + 0.8;
    this.decorativeLights.forEach(light => {
      (light as any).intensity = light === this.decorativeLights[0]
        ? 0.3 * pulse
        : 0.3 * (1 - pulse);
    });
  }

  /**
   * ─── Phase 4: Configuration Getters/Setters ───
   */
  public getConfig(): BackglassRenderConfig {
    return { ...this.config };
  }

  public setRenderMode(use3D: boolean): void {
    if (this.config.use3D !== use3D) {
      this.config.use3D = use3D;
      console.log(`🎬 Backglass render mode: ${use3D ? '3D' : '2D'}`);
    }
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  /**
   * ─── Phase 4: Adaptive Render to Texture ───
   * Renders backglass to a texture for compositing
   * Adapts quality based on device capabilities
   */
  public render(renderer: THREE.WebGLRenderer): THREE.Texture {
    if (!this.config.enabled) {
      return this.renderTarget.texture;
    }

    if (this.config.use3D) {
      // ─── 3D Rendering: High quality for desktop ───
      renderer.setRenderTarget(this.renderTarget);
      renderer.render(this.scene, this.camera);
      renderer.setRenderTarget(null);
    } else {
      // ─── 2D Canvas Fallback: Simplified for mobile ───
      // For now, render 3D but with lower resolution on mobile
      // In future, this could switch to canvas-based rendering
      const originalSize = this.renderTarget.getSize(new THREE.Vector2());
      if (this.config.deviceType === 'mobile' && originalSize.x > 200) {
        // Reduce resolution for mobile by rendering to smaller target
        this.renderTarget.setSize(200, 300);
      }

      renderer.setRenderTarget(this.renderTarget);
      renderer.render(this.scene, this.camera);
      renderer.setRenderTarget(null);

      if (this.config.deviceType === 'mobile') {
        this.renderTarget.setSize(this.width, this.height);
      }
    }

    return this.renderTarget.texture;
  }

  /**
   * ─── Phase 4: Dispose Resources ───
   */
  public dispose(): void {
    this.renderTarget.dispose();
    this.decorativeLights = [];
    this.animatingElements = [];
  }
}

/**
 * ─── Phase 4: Global Backglass Instance ───
 */
let backglassRenderer: BackglassRenderer | null = null;

export function getBackglassRenderer(width: number, height: number): BackglassRenderer {
  if (!backglassRenderer) {
    backglassRenderer = new BackglassRenderer(width, height);
  }
  return backglassRenderer;
}

export function disposeBackglass(): void {
  if (backglassRenderer) {
    backglassRenderer.dispose();
    backglassRenderer = null;
  }
}
