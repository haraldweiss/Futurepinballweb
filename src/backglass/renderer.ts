// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';
import { type DeviceType, type BackglassRenderConfig } from './types';
import { devLog } from '../utils/dev-log';

function detectDeviceType(): DeviceType {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1200) return 'tablet';
  return 'desktop';
}

export class BackglassRenderer {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderTarget: THREE.WebGLRenderTarget;
  private width: number;
  private height: number;
  private config: BackglassRenderConfig;

  private cabinetFrame: THREE.Group;
  private artworkMesh: THREE.Mesh | null = null;
  private overlayGroup: THREE.Group;
  private decorativeLights: THREE.Light[] = [];

  private animatingElements: Array<{
    mesh: THREE.Object3D;
    duration: number;
    startTime: number;
    animation: (progress: number) => void;
  }> = [];

  private scoreDisplay: THREE.Mesh | null = null;
  private modeIndicator: THREE.Mesh | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    const deviceType = detectDeviceType();
    const shouldUse3D = deviceType === 'desktop' ||
                       (deviceType === 'tablet' && window.devicePixelRatio < 2);

    this.config = {
      enabled: true,
      use3D: shouldUse3D,
      deviceType: deviceType,
    };

    devLog(`📺 Backglass: ${this.config.use3D ? '3D' : '2D'} mode (${deviceType})`);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a1a);

    this.camera = new THREE.OrthographicCamera(
      0, width, 0, height,
      0.1, 1000
    );
    this.camera.position.z = 100;

    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    });

    this.cabinetFrame = new THREE.Group();
    this.overlayGroup = new THREE.Group();

    this.scene.add(this.cabinetFrame);
    this.scene.add(this.overlayGroup);

    this.setupCabinet();
    this.setupLighting();
  }

  private setupCabinet(): void {
    const frameThickness = 15;
    const frameColor = new THREE.Color(0x1a1a1a);
    const frameMaterial = new THREE.MeshStandardMaterial({
      color: frameColor,
      metalness: 0.2,
      roughness: 0.6,
    });

    const topBorder = new THREE.Mesh(
      new THREE.BoxGeometry(this.width + frameThickness * 2, frameThickness, 10),
      frameMaterial
    );
    topBorder.position.set(this.width / 2, this.height + frameThickness / 2, -5);
    this.cabinetFrame.add(topBorder);

    const bottomBorder = new THREE.Mesh(
      new THREE.BoxGeometry(this.width + frameThickness * 2, frameThickness, 10),
      frameMaterial
    );
    bottomBorder.position.set(this.width / 2, -frameThickness / 2, -5);
    this.cabinetFrame.add(bottomBorder);

    const leftBorder = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, this.height, 10),
      frameMaterial
    );
    leftBorder.position.set(-frameThickness / 2, this.height / 2, -5);
    this.cabinetFrame.add(leftBorder);

    const rightBorder = new THREE.Mesh(
      new THREE.BoxGeometry(frameThickness, this.height, 10),
      frameMaterial
    );
    rightBorder.position.set(this.width + frameThickness / 2, this.height / 2, -5);
    this.cabinetFrame.add(rightBorder);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const corners = [
      { pos: [20, this.height - 20, 50], color: 0xff6600 },
      { pos: [this.width - 20, this.height - 20, 50], color: 0x0099ff },
      { pos: [20, 20, 50], color: 0x00ff66 },
      { pos: [this.width - 20, 20, 50], color: 0xff00cc },
    ];

    corners.forEach(corner => {
      const light = new THREE.PointLight(corner.color, 0.3, 150);
      light.position.set(...(corner.pos as [number, number, number]));
      this.scene.add(light);
      this.decorativeLights.push(light);
    });
  }

  public setArtwork(texture: THREE.Texture | null): void {
    if (this.artworkMesh) {
      this.scene.remove(this.artworkMesh);
      this.artworkMesh = null;
    }

    if (!texture) {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 600;
      const ctx = canvas.getContext('2d')!;

      const gradient = ctx.createLinearGradient(0, 0, 400, 600);
      gradient.addColorStop(0, '#222');
      gradient.addColorStop(1, '#111');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 400, 600);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 40px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('FUTURE PINBALL', 200, 150);

      ctx.font = '20px Arial';
      ctx.fillStyle = '#cccccc';
      ctx.fillText('Web Edition', 200, 200);

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

  public animateScoreIncrease(points: number, duration: number = 500): void {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;

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

      mesh.position.lerpVectors(startPos, endPos, progress);

      (mat as any).opacity = 1 - (progress * progress);

      mesh.scale.set(1 + progress * 0.3, 1 + progress * 0.3, 1);

      requestAnimationFrame(animate);
    };

    animate();
  }

  public setModeIndicator(text: string): void {
    if (this.modeIndicator) {
      this.overlayGroup.remove(this.modeIndicator);
      this.modeIndicator = null;
    }

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

  public updateParallax(cameraRotation: THREE.Euler): void {
    const parallaxX = Math.sin(cameraRotation.y) * 20;
    const parallaxY = Math.sin(cameraRotation.x) * 15;

    this.cabinetFrame.position.x = parallaxX;
    this.overlayGroup.position.x = parallaxX;
    this.overlayGroup.position.y = parallaxY;
  }

  public update(): void {
    const now = Date.now();

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

    const pulse = Math.sin(now * 0.001) * 0.2 + 0.8;
    this.decorativeLights.forEach(light => {
      (light as any).intensity = light === this.decorativeLights[0]
        ? 0.3 * pulse
        : 0.3 * (1 - pulse);
    });
  }

  public getConfig(): BackglassRenderConfig {
    return { ...this.config };
  }

  public setRenderMode(use3D: boolean): void {
    if (this.config.use3D !== use3D) {
      this.config.use3D = use3D;
      devLog(`🎬 Backglass render mode: ${use3D ? '3D' : '2D'}`);
    }
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
  }

  public render(renderer: THREE.WebGLRenderer): THREE.Texture {
    if (!this.config.enabled) {
      return this.renderTarget.texture;
    }

    if (this.config.use3D) {
      renderer.setRenderTarget(this.renderTarget);
      renderer.render(this.scene, this.camera);
      renderer.setRenderTarget(null);
    } else {
      if (this.config.deviceType === 'mobile' && this.width > 200) {
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

  public dispose(): void {
    this.renderTarget.dispose();
    this.decorativeLights = [];
    this.animatingElements = [];
  }
}
