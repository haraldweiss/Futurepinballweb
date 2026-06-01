// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';

export class FloatingScoreManager {
  private floatingTexts: Array<{
    sprite: THREE.Sprite;
    startTime: number;
    duration: number;
    startY: number;
  }> = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  showFloatingScore(position: THREE.Vector3, points: number, duration: number = 600): void {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let color: string;
    if (points > 500) {
      color = '#FFFF00';
    } else if (points > 200) {
      color = '#FFAA00';
    } else {
      color = '#FF6600';
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.3;
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(`+${points.toLocaleString()}`, 128, 64);

    ctx.globalAlpha = 1.0;
    ctx.fillStyle = color;
    ctx.fillText(`+${points.toLocaleString()}`, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    const scale = 0.8 + (Math.min(points, 1000) / 1000) * 0.8;
    sprite.scale.set(scale * 2, scale, 1);

    sprite.position.copy(position);
    this.scene.add(sprite);

    this.floatingTexts.push({
      sprite,
      startTime: Date.now(),
      duration,
      startY: position.y,
    });
  }

  update(): void {
    const now = Date.now();

    this.floatingTexts = this.floatingTexts.filter(item => {
      const elapsed = now - item.startTime;
      if (elapsed > item.duration) {
        this.scene.remove(item.sprite);
        (item.sprite.material as THREE.SpriteMaterial).map?.dispose();
        (item.sprite.material as THREE.SpriteMaterial).dispose();
        return false;
      }

      const progress = elapsed / item.duration;
      const moveDistance = progress * 3.0;
      item.sprite.position.y = item.startY + moveDistance;

      (item.sprite.material as THREE.SpriteMaterial).opacity = 1.0 - progress;

      return true;
    });
  }

  clear(): void {
    this.floatingTexts.forEach(item => {
      this.scene.remove(item.sprite);
      (item.sprite.material as THREE.SpriteMaterial).map?.dispose();
      (item.sprite.material as THREE.SpriteMaterial).dispose();
    });
    this.floatingTexts = [];
  }
}
