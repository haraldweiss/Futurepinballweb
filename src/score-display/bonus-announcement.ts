// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';

export class BonusAnnouncement {
  private announceSprite: THREE.Sprite | null = null;
  private scene: THREE.Scene;
  private announceStartTime = 0;
  private announceDuration = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  showAnnouncement(text: string, duration: number = 1000): void {
    this.clearAnnouncement();

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#FFFF00';
    ctx.lineWidth = 6;
    ctx.globalAlpha = 0.4;
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(text, 256, 128);

    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#FFFF00';
    ctx.fillText(text, 256, 128);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      sizeAttenuation: true,
    });

    this.announceSprite = new THREE.Sprite(material);
    this.announceSprite.scale.set(4, 2, 1);
    this.announceSprite.position.set(0, 0, 3);

    this.scene.add(this.announceSprite);

    this.announceStartTime = Date.now();
    this.announceDuration = duration;
  }

  update(now: number): void {
    if (!this.announceSprite) return;

    const elapsed = now - this.announceStartTime;
    if (elapsed > this.announceDuration) {
      this.clearAnnouncement();
      return;
    }

    const progress = elapsed / this.announceDuration;

    let scale = 1.0;
    if (progress < 0.3) {
      scale = 0.5 + (progress / 0.3) * 0.5;
    } else if (progress > 0.7) {
      scale = 1.0 - ((progress - 0.7) / 0.3) * 0.3;
    }

    this.announceSprite.scale.set(scale * 4, scale * 2, 1);

    if (progress > 0.7) {
      (this.announceSprite.material as THREE.SpriteMaterial).opacity = 1.0 - ((progress - 0.7) / 0.3);
    } else {
      (this.announceSprite.material as THREE.SpriteMaterial).opacity = 1.0;
    }
  }

  private clearAnnouncement(): void {
    if (this.announceSprite) {
      this.scene.remove(this.announceSprite);
      (this.announceSprite.material as THREE.SpriteMaterial).map?.dispose();
      (this.announceSprite.material as THREE.SpriteMaterial).dispose();
      this.announceSprite = null;
    }
  }
}
