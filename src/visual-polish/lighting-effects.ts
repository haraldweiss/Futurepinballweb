// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
import * as THREE from 'three';

export class LightingEffects {
  private scene: THREE.Scene;
  private activeLights: Array<{
    light: THREE.Light;
    startTime: number;
    duration: number;
    targetIntensity: number;
  }> = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  addBumperImpactLight(position: THREE.Vector3, intensity: number = 1.0): void {
    const light = new THREE.PointLight(0xff8800, intensity * 2, 6);
    light.position.copy(position);
    light.position.z += 1;
    this.scene.add(light);

    this.activeLights.push({
      light,
      startTime: Date.now(),
      duration: 200,
      targetIntensity: 0,
    });
  }

  addDrainWarningLight(): void {
    const light = new THREE.PointLight(0xff3333, 2.0, 12);
    light.position.set(0, -4, 5);
    light.castShadow = true;
    this.scene.add(light);

    this.activeLights.push({
      light,
      startTime: Date.now(),
      duration: 500,
      targetIntensity: 0,
    });
  }

  addRampCompletionLight(): void {
    const light = new THREE.PointLight(0x00ff66, 2.0, 12);
    light.position.set(0, 2, 8);
    light.castShadow = true;
    this.scene.add(light);

    this.activeLights.push({
      light,
      startTime: Date.now(),
      duration: 400,
      targetIntensity: 0,
    });
  }

  addMultiballLight(): void {
    const light = new THREE.PointLight(0xffcc00, 3.0, 15);
    light.position.set(0, 1, 6);
    light.castShadow = true;
    this.scene.add(light);

    this.activeLights.push({
      light,
      startTime: Date.now(),
      duration: 1000,
      targetIntensity: 0,
    });
  }

  update(): void {
    const now = Date.now();

    this.activeLights = this.activeLights.filter(item => {
      const elapsed = now - item.startTime;
      if (elapsed > item.duration) {
        this.scene.remove(item.light);
        return false;
      }

      const progress = elapsed / item.duration;
      const fade = Math.pow(1 - progress, 2);
      const currentIntensity = item.light.intensity;
      const maxIntensity = currentIntensity / Math.pow(1, 2);

      if (item.duration === 1000) {
        const pulse = 0.5 + 0.5 * Math.sin(progress * Math.PI * 4);
        item.light.intensity = maxIntensity * fade * pulse;
      } else {
        item.light.intensity = maxIntensity * fade;
      }

      return true;
    });
  }

  dispose(): void {
    this.activeLights.forEach(item => {
      this.scene.remove(item.light);
    });
    this.activeLights = [];
  }
}
