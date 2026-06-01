// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
import * as THREE from 'three';

export class ScreenEffects {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private vignetteOverlay: THREE.Mesh | null = null;
  private screenFlash: THREE.Mesh | null = null;
  private colorTint: THREE.Mesh | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
  }

  createVignette(): void {
    if (this.vignetteOverlay) return;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createRadialGradient(256, 256, 100, 256, 256, 360);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      opacity: 0.3,
    });

    this.vignetteOverlay = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      material
    );
    this.vignetteOverlay.position.z = 2;
    this.scene.add(this.vignetteOverlay);
  }

  flashScreen(duration: number = 150, intensity: number = 0.3): void {
    if (this.screenFlash) {
      this.scene.remove(this.screenFlash);
    }

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: intensity,
    });

    this.screenFlash = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      material
    );
    this.screenFlash.position.z = 3;
    this.scene.add(this.screenFlash);

    const startTime = Date.now();
    const fadeOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (this.screenFlash) {
        (this.screenFlash.material as THREE.MeshBasicMaterial).opacity =
          intensity * (1 - progress);

        if (progress < 1) {
          requestAnimationFrame(fadeOut);
        } else {
          this.scene.remove(this.screenFlash);
          this.screenFlash = null;
        }
      }
    };
    fadeOut();
  }

  applyColorTint(color: number, duration: number = 200, intensity: number = 0.3): void {
    if (this.colorTint) {
      this.scene.remove(this.colorTint);
    }

    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: intensity,
    });

    this.colorTint = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      material
    );
    this.colorTint.position.z = 3;
    this.scene.add(this.colorTint);

    const startTime = Date.now();
    const fadeOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (this.colorTint) {
        (this.colorTint.material as THREE.MeshBasicMaterial).opacity =
          intensity * (1 - progress);

        if (progress < 1) {
          requestAnimationFrame(fadeOut);
        } else {
          this.scene.remove(this.colorTint);
          this.colorTint = null;
        }
      }
    };
    fadeOut();
  }

  dispose(): void {
    if (this.vignetteOverlay) {
      this.scene.remove(this.vignetteOverlay);
      (this.vignetteOverlay.material as THREE.MeshBasicMaterial).map?.dispose();
      (this.vignetteOverlay.material as THREE.MeshBasicMaterial).dispose();
      this.vignetteOverlay = null;
    }
  }
}
