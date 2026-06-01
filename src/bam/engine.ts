// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';
import { TablePhysics, FlipperAdvanced, AnimationSequencer, LightingController, ConfigManager } from './systems';

export class BAMEngine {
  private config: ConfigManager;
  private tablePhysics: TablePhysics;
  private flipperAdvanced: FlipperAdvanced;
  private animationSequencer: AnimationSequencer;
  private lightingController: LightingController;
  private enabled: boolean = true;

  constructor(tableName: string = 'default', mainLight: THREE.SpotLight | null = null) {
    const configManager = new ConfigManager(tableName);
    this.config = configManager;

    const bamConfig = configManager.getAll();
    this.tablePhysics = new TablePhysics(bamConfig);
    this.flipperAdvanced = new FlipperAdvanced(bamConfig);
    this.animationSequencer = new AnimationSequencer();
    this.lightingController = new LightingController(mainLight, bamConfig.lighting.lightStrength);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  step(deltaTime: number, substeps: number = 1): void {
    if (!this.enabled) return;

    const dt = deltaTime / substeps;

    for (let i = 0; i < substeps; i++) {
      this.tablePhysics.dampTilt(dt);
      this.animationSequencer.update(dt);
      this.lightingController.update(dt);
    }
  }

  getTablePhysics(): TablePhysics {
    return this.tablePhysics;
  }

  getFlipperAdvanced(): FlipperAdvanced {
    return this.flipperAdvanced;
  }

  getAnimationSequencer(): AnimationSequencer {
    return this.animationSequencer;
  }

  getLightingController(): LightingController {
    return this.lightingController;
  }

  getConfig(): ConfigManager {
    return this.config;
  }
}
