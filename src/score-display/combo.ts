// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';

export class ComboDisplay {
  private comboSprite: THREE.Sprite | null = null;
  private scene: THREE.Scene;
  private currentCombo = 0;
  private lastComboTime = 0;
  private maxCombo = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  updateCombo(combo: number): void {
    this.currentCombo = combo;
    this.lastComboTime = Date.now();
    this.maxCombo = Math.max(this.maxCombo, combo);

    if (combo <= 1) {
      if (this.comboSprite) {
        this.scene.remove(this.comboSprite);
        (this.comboSprite.material as THREE.SpriteMaterial).map?.dispose();
        (this.comboSprite.material as THREE.SpriteMaterial).dispose();
        this.comboSprite = null;
      }
      return;
    }

    this.showCombo(combo);
  }

  private showCombo(combo: number): void {
    if (this.comboSprite) {
      this.scene.remove(this.comboSprite);
      (this.comboSprite.material as THREE.SpriteMaterial).map?.dispose();
      (this.comboSprite.material as THREE.SpriteMaterial).dispose();
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const intensity = Math.min(combo / 10, 1.0);
    const hue = 30 + intensity * 60;
    const color = `hsl(${hue}, 100%, 50%)`;

    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.4;
    ctx.font = 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(`×${combo} COMBO`, 128, 64);

    ctx.globalAlpha = 1.0;
    ctx.fillStyle = color;
    ctx.fillText(`×${combo} COMBO`, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({ map: texture });
    this.comboSprite = new THREE.Sprite(material);

    const scale = 1.0 + (Math.min(combo, 20) / 20) * 0.5;
    this.comboSprite.scale.set(scale * 2, scale, 1);

    this.comboSprite.position.set(2.0, 5.0, 0);

    this.scene.add(this.comboSprite);
  }

  update(now: number): void {
    if (!this.comboSprite) return;

    const timeSinceCombo = now - this.lastComboTime;
    if (timeSinceCombo > 2000) {
      this.updateCombo(0);
      return;
    }

    const pulseFactor = 0.95 + 0.05 * Math.sin(now / 100);
    const scale = (1.0 + (Math.min(this.currentCombo, 20) / 20) * 0.5) * pulseFactor;
    this.comboSprite.scale.set(scale * 2, scale, 1);
  }

  getMaxCombo(): number {
    return this.maxCombo;
  }

  reset(): void {
    this.currentCombo = 0;
    this.maxCombo = 0;
    this.updateCombo(0);
  }
}
