// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
import * as THREE from 'three';
import { ScreenEffects } from './screen-effects';
import { UIEffects } from './ui-effects';
import { LightingEffects } from './lighting-effects';

export class VisualPolishSystem {
  private screenEffects: ScreenEffects;
  private uiEffects: UIEffects;
  private lightingEffects: LightingEffects;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.screenEffects = new ScreenEffects(scene, camera);
    this.uiEffects = new UIEffects();
    this.lightingEffects = new LightingEffects(scene);

    this.screenEffects.createVignette();
  }

  triggerImpactEffect(intensity: number = 1.0): void {
    this.screenEffects.flashScreen(150, 0.2 * intensity);
  }

  triggerDrainWarning(): void {
    this.screenEffects.applyColorTint(0xff3333, 300, 0.2);
    this.lightingEffects.addDrainWarningLight();
  }

  triggerRampCompletion(): void {
    this.screenEffects.applyColorTint(0x00ff66, 300, 0.2);
    this.lightingEffects.addRampCompletionLight();
  }

  triggerMultiballStart(): void {
    this.screenEffects.flashScreen(200, 0.4);
    this.lightingEffects.addMultiballLight();
  }

  triggerBumperImpact(position: THREE.Vector3, intensity: number = 1.0): void {
    this.screenEffects.flashScreen(100, 0.15 * intensity);
    this.lightingEffects.addBumperImpactLight(position, intensity);
  }

  update(): void {
    this.lightingEffects.update();
    this.uiEffects.updateMultiplierPulse();
  }

  animateScoreUpdate(scoreElement: HTMLElement): void {
    this.uiEffects.animateScoreUpdate(scoreElement);
  }

  updateMultiplierGlow(multiplier: number, element: HTMLElement): void {
    this.uiEffects.updateMultiplierGlow(multiplier, element);
  }

  animateBallCounter(element: HTMLElement): void {
    this.uiEffects.animateBallCounter(element);
  }

  dispose(): void {
    this.screenEffects.dispose();
    this.lightingEffects.dispose();
  }
}
