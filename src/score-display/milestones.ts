// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

export class MilestoneSystem {
  private lastMilestone = 0;
  private callbacks: {
    onMilestone?: (milestone: number, bonus: boolean) => void;
    triggerEffect?: (type: 'gold-flash' | 'screen-flash' | 'combo-bonus') => void;
  } = {};

  checkMilestones(currentScore: number): { reached: number; isMilestone: boolean } | null {
    const milestones = [1000, 5000, 10000, 25000, 50000];

    for (const milestone of milestones) {
      if (currentScore >= milestone && currentScore - milestone < 500) {
        if (milestone > this.lastMilestone) {
          this.lastMilestone = milestone;

          let celebrationType: 'gold-flash' | 'screen-flash' | 'combo-bonus' = 'gold-flash';
          if (milestone === 5000) celebrationType = 'screen-flash';
          if (milestone === 10000) celebrationType = 'combo-bonus';

          if (this.callbacks.triggerEffect) {
            this.callbacks.triggerEffect(celebrationType);
          }

          return { reached: milestone, isMilestone: true };
        }
      }
    }

    return null;
  }

  reset(): void {
    this.lastMilestone = 0;
  }

  setCallbacks(callbacks: typeof this.callbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}
