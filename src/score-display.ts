/**
 * score-display.ts — PHASE 9: Score Display Animations & Floating Text
 *
 * Handles visual feedback for scoring events:
 * - Floating score text that appears at impact location
 * - Score milestone celebrations (1000, 5000, 10000 points)
 * - Combo indicator with scaling animation
 * - Bonus round announcements with big bold text
 */

import * as THREE from 'three';

// ─── Floating Score Text System ───────────────────────────────────────────
/**
 * Floating score text that rises from impact location and fades out
 */
class FloatingScoreManager {
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

  /**
   * Show floating score text at world position
   * @param position World position (x, y, z)
   * @param points Points to display
   * @param duration Animation duration in ms
   */
  showFloatingScore(position: THREE.Vector3, points: number, duration: number = 600): void {
    // Create canvas texture for score text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with transparency
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Determine color based on points
    let color: string;
    if (points > 500) {
      color = '#FFFF00';  // Gold for high scores
    } else if (points > 200) {
      color = '#FFAA00';  // Orange for medium scores
    } else {
      color = '#FF6600';  // Light orange for small scores
    }

    // Draw glow effect (multiple strokes for halo)
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.3;
    ctx.font = 'bold 80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeText(`+${points.toLocaleString()}`, 128, 64);

    // Draw main text
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = color;
    ctx.fillText(`+${points.toLocaleString()}`, 128, 64);

    // Create texture
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;

    // Create sprite
    const material = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(material);

    // Scale based on points (larger for bigger scores)
    const scale = 0.8 + (Math.min(points, 1000) / 1000) * 0.8;
    sprite.scale.set(scale * 2, scale, 1);

    sprite.position.copy(position);
    this.scene.add(sprite);

    // Track for animation
    this.floatingTexts.push({
      sprite,
      startTime: Date.now(),
      duration,
      startY: position.y,
    });
  }

  /**
   * Update floating score texts (animation, cleanup)
   */
  update(): void {
    const now = Date.now();

    // Update and remove expired floats
    this.floatingTexts = this.floatingTexts.filter(item => {
      const elapsed = now - item.startTime;
      if (elapsed > item.duration) {
        // Cleanup
        this.scene.remove(item.sprite);
        (item.sprite.material as THREE.SpriteMaterial).map?.dispose();
        (item.sprite.material as THREE.SpriteMaterial).dispose();
        return false;
      }

      // Animate upward
      const progress = elapsed / item.duration;
      const moveDistance = progress * 3.0;  // Move up 3 units over duration
      item.sprite.position.y = item.startY + moveDistance;

      // Fade out
      (item.sprite.material as THREE.SpriteMaterial).opacity = 1.0 - progress;

      return true;
    });
  }

  /**
   * Clear all floating texts immediately
   */
  clear(): void {
    this.floatingTexts.forEach(item => {
      this.scene.remove(item.sprite);
      (item.sprite.material as THREE.SpriteMaterial).map?.dispose();
      (item.sprite.material as THREE.SpriteMaterial).dispose();
    });
    this.floatingTexts = [];
  }
}

// ─── Milestone Celebration System ─────────────────────────────────────────
/**
 * Handles celebration effects for score milestones
 */
class MilestoneSystem {
  private lastMilestone = 0;
  private callbacks: {
    onMilestone?: (milestone: number, bonus: boolean) => void;
    triggerEffect?: (type: 'gold-flash' | 'screen-flash' | 'combo-bonus') => void;
  } = {};

  /**
   * Check for and trigger milestone celebrations
   */
  checkMilestones(currentScore: number): { reached: number; isMilestone: boolean } | null {
    const milestones = [1000, 5000, 10000, 25000, 50000];

    for (const milestone of milestones) {
      if (currentScore >= milestone && currentScore - milestone < 500) {
        // Just crossed this milestone
        if (milestone > this.lastMilestone) {
          this.lastMilestone = milestone;

          // Determine celebration type
          let celebrationType: 'gold-flash' | 'screen-flash' | 'combo-bonus' = 'gold-flash';
          if (milestone === 5000) celebrationType = 'screen-flash';
          if (milestone === 10000) celebrationType = 'combo-bonus';

          // Trigger callback
          if (this.callbacks.triggerEffect) {
            this.callbacks.triggerEffect(celebrationType);
          }

          return { reached: milestone, isMilestone: true };
        }
      }
    }

    return null;
  }

  /**
   * Reset milestone tracking (on new game)
   */
  reset(): void {
    this.lastMilestone = 0;
  }

  /**
   * Register callbacks for milestone events
   */
  setCallbacks(callbacks: typeof this.callbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }
}

// ─── Combo Display System ──────────────────────────────────────────────────
/**
 * Displays and animates combo counter
 */
class ComboDisplay {
  private comboSprite: THREE.Sprite | null = null;
  private scene: THREE.Scene;
  private currentCombo = 0;
  private lastComboTime = 0;
  private maxCombo = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Update combo display with new combo count
   */
  updateCombo(combo: number): void {
    this.currentCombo = combo;
    this.lastComboTime = Date.now();
    this.maxCombo = Math.max(this.maxCombo, combo);

    if (combo <= 1) {
      // Hide combo display
      if (this.comboSprite) {
        this.scene.remove(this.comboSprite);
        (this.comboSprite.material as THREE.SpriteMaterial).map?.dispose();
        (this.comboSprite.material as THREE.SpriteMaterial).dispose();
        this.comboSprite = null;
      }
      return;
    }

    // Create or update combo display
    this.showCombo(combo);
  }

  /**
   * Show combo sprite with animation
   */
  private showCombo(combo: number): void {
    // Remove old sprite if exists
    if (this.comboSprite) {
      this.scene.remove(this.comboSprite);
      (this.comboSprite.material as THREE.SpriteMaterial).map?.dispose();
      (this.comboSprite.material as THREE.SpriteMaterial).dispose();
    }

    // Create canvas for combo text
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Color intensity increases with combo (max at 10+)
    const intensity = Math.min(combo / 10, 1.0);
    const hue = 30 + intensity * 60;  // Yellow to red
    const color = `hsl(${hue}, 100%, 50%)`;

    // Draw combo text
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

    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({ map: texture });
    this.comboSprite = new THREE.Sprite(material);

    // Scale increases with combo
    const scale = 1.0 + (Math.min(combo, 20) / 20) * 0.5;
    this.comboSprite.scale.set(scale * 2, scale, 1);

    // Position in top-right of screen (camera space)
    this.comboSprite.position.set(2.0, 5.0, 0);

    this.scene.add(this.comboSprite);
  }

  /**
   * Update combo display (pulse animation, auto-hide after timeout)
   */
  update(now: number): void {
    if (!this.comboSprite) return;

    // Auto-hide after 2 seconds of no hits
    const timeSinceCombo = now - this.lastComboTime;
    if (timeSinceCombo > 2000) {
      this.updateCombo(0);  // Hide
      return;
    }

    // Pulse animation: scale varies based on combo count
    const pulseFactor = 0.95 + 0.05 * Math.sin(now / 100);
    const scale = (1.0 + (Math.min(this.currentCombo, 20) / 20) * 0.5) * pulseFactor;
    this.comboSprite.scale.set(scale * 2, scale, 1);
  }

  /**
   * Get max combo reached this session
   */
  getMaxCombo(): number {
    return this.maxCombo;
  }

  /**
   * Reset combo tracking
   */
  reset(): void {
    this.currentCombo = 0;
    this.maxCombo = 0;
    this.updateCombo(0);
  }
}

// ─── Bonus Announcement System ─────────────────────────────────────────────
/**
 * Displays big bold text for bonus/special events
 */
class BonusAnnouncement {
  private announceSprite: THREE.Sprite | null = null;
  private scene: THREE.Scene;
  private announceStartTime = 0;
  private announceDuration = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /**
   * Show bonus announcement with animation
   */
  showAnnouncement(text: string, duration: number = 1000): void {
    // Remove old announcement if exists
    this.clearAnnouncement();

    // Create canvas for announcement text
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw bold announcement text with glow
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

    // Create texture and sprite
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      sizeAttenuation: true,
    });

    this.announceSprite = new THREE.Sprite(material);
    this.announceSprite.scale.set(4, 2, 1);
    this.announceSprite.position.set(0, 0, 3);  // Center of screen

    this.scene.add(this.announceSprite);

    this.announceStartTime = Date.now();
    this.announceDuration = duration;
  }

  /**
   * Update announcement (scale/fade animation)
   */
  update(now: number): void {
    if (!this.announceSprite) return;

    const elapsed = now - this.announceStartTime;
    if (elapsed > this.announceDuration) {
      this.clearAnnouncement();
      return;
    }

    const progress = elapsed / this.announceDuration;

    // Scale animation: grow then shrink
    let scale = 1.0;
    if (progress < 0.3) {
      // Scale in quickly
      scale = 0.5 + (progress / 0.3) * 0.5;
    } else if (progress > 0.7) {
      // Scale out slowly (with fade)
      scale = 1.0 - ((progress - 0.7) / 0.3) * 0.3;
    }

    this.announceSprite.scale.set(scale * 4, scale * 2, 1);

    // Fade out in last 30% of duration
    if (progress > 0.7) {
      (this.announceSprite.material as THREE.SpriteMaterial).opacity = 1.0 - ((progress - 0.7) / 0.3);
    } else {
      (this.announceSprite.material as THREE.SpriteMaterial).opacity = 1.0;
    }
  }

  /**
   * Clear announcement immediately
   */
  private clearAnnouncement(): void {
    if (this.announceSprite) {
      this.scene.remove(this.announceSprite);
      (this.announceSprite.material as THREE.SpriteMaterial).map?.dispose();
      (this.announceSprite.material as THREE.SpriteMaterial).dispose();
      this.announceSprite = null;
    }
  }
}

// ─── Main Score Display Manager ────────────────────────────────────────────
/**
 * Central manager for all score display systems
 */
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

  /**
   * Show floating score at world position
   */
  showFloatingScore(position: THREE.Vector3, points: number): void {
    this.floatingScores.showFloatingScore(position, points, 600);
  }

  /**
   * Show combo counter
   */
  updateCombo(combo: number): void {
    this.comboDisplay.updateCombo(combo);
  }

  /**
   * Check and handle score milestones
   */
  checkMilestones(currentScore: number): void {
    this.milestones.checkMilestones(currentScore);
  }

  /**
   * Show bonus announcement (MULTIBALL, RAMP COMPLETE, etc.)
   */
  showAnnouncement(text: string, duration?: number): void {
    this.bonusAnnouncements.showAnnouncement(text, duration || 1000);
  }

  /**
   * Update all displays (call once per frame)
   */
  update(): void {
    const now = Date.now();
    this.floatingScores.update();
    this.comboDisplay.update(now);
    this.bonusAnnouncements.update(now);
  }

  /**
   * Reset all displays on new game
   */
  reset(): void {
    this.floatingScores.clear();
    this.comboDisplay.reset();
    this.milestones.reset();
  }

  /**
   * Get max combo reached this session
   */
  getMaxCombo(): number {
    return this.comboDisplay.getMaxCombo();
  }
}
