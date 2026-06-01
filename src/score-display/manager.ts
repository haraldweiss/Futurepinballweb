// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';
import { FloatingScoreManager } from './floating-scores';
import { MilestoneSystem } from './milestones';
import { ComboDisplay } from './combo';
import { BonusAnnouncement } from './bonus-announcement';

export class ScoreDisplayManager {
  private floatingScores: FloatingScoreManager;
  private milestones: MilestoneSystem;
  private comboDisplay: ComboDisplay;
  private bonusAnnouncements: BonusAnnouncement;

  constructor(scene: THREE.Scene) {
    this.floatingScores = new FloatingScoreManager(scene);
    this.milestones = new MilestoneSystem();
    this.comboDisplay = new ComboDisplay(scene);
    this.bonusAnnouncements = new BonusAnnouncement(scene);
  }

  showFloatingScore(position: THREE.Vector3, points: number): void {
    this.floatingScores.showFloatingScore(position, points, 600);
  }

  updateCombo(combo: number): void {
    this.comboDisplay.updateCombo(combo);
  }

  checkMilestones(currentScore: number): void {
    this.milestones.checkMilestones(currentScore);
  }

  showAnnouncement(text: string, duration?: number): void {
    this.bonusAnnouncements.showAnnouncement(text, duration || 1000);
  }

  update(): void {
    const now = Date.now();
    this.floatingScores.update();
    this.comboDisplay.update(now);
    this.bonusAnnouncements.update(now);
  }

  reset(): void {
    this.floatingScores.clear();
    this.comboDisplay.reset();
    this.milestones.reset();
  }

  getMaxCombo(): number {
    return this.comboDisplay.getMaxCombo();
  }
}
