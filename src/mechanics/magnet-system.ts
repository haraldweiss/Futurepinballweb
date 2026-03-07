/**
 * magnet-system.ts — Phase 12 Task 4: Magnet Zones Physics
 *
 * Manages ball capture zones (magnets) that temporarily hold balls.
 * - Zone detection: Ball enters magnet zone → physics disabled, visual hold
 * - Hold tracking: Maintains time-based release schedule
 * - Release mechanics: Auto-release after timeout or script-triggered
 */

import * as THREE from 'three';
import { state } from '../game';

export interface MagnetZone {
  id: string;
  x: number;
  y: number;
  radius: number;
  holdTime: number; // milliseconds
  releaseTime: number; // timestamp for release
  ballIndices: number[];
  active: boolean;
  power: number; // 0-10 strength
}

export class MagnetSystem {
  private zones: Map<string, MagnetZone> = new Map();
  private nextId = 0;

  constructor() {}

  /**
   * Create a new magnet zone
   */
  createZone(x: number, y: number, radius: number, holdTime: number, power: number = 5): string {
    const id = `magnet_${this.nextId++}`;
    const zone: MagnetZone = {
      id,
      x: Number(x) || 0,
      y: Number(y) || 0,
      radius: Math.max(0.1, Number(radius) || 1.0),
      holdTime: Math.max(100, Number(holdTime) || 3000),
      releaseTime: 0,
      ballIndices: [],
      active: true,
      power: Math.max(0, Math.min(10, Number(power) || 5)),
    };
    this.zones.set(id, zone);
    return id;
  }

  /**
   * Remove a magnet zone
   */
  removeZone(zoneId: string): void {
    this.zones.delete(zoneId);
  }

  /**
   * Get a magnet zone
   */
  getZone(zoneId: string): MagnetZone | undefined {
    return this.zones.get(zoneId);
  }

  /**
   * Capture a ball in a zone
   */
  holdBallInZone(ballIndex: number, zoneId: string, holdTime?: number): boolean {
    const zone = this.zones.get(zoneId);
    if (!zone || !zone.active) return false;

    const holdMs = Math.max(100, Number(holdTime) || zone.holdTime);
    zone.ballIndices.push(ballIndex);
    zone.releaseTime = Date.now() + holdMs;
    return true;
  }

  /**
   * Release balls from a zone with optional direction
   */
  releaseBallsFromZone(zoneId: string, directionX?: number, directionY?: number, power?: number): number {
    const zone = this.zones.get(zoneId);
    if (!zone) return 0;

    const count = zone.ballIndices.length;
    const p = Math.max(0, Math.min(10, Number(power) || zone.power));

    // In full implementation, would apply impulse based on direction/power
    // For now, just clear the zone
    zone.ballIndices = [];
    zone.releaseTime = 0;

    return count;
  }

  /**
   * Check if zone is active and update timeouts
   */
  updateZones(currentTime: number): void {
    this.zones.forEach((zone) => {
      if (!zone.active) return;

      // Check if hold time expired
      if (zone.releaseTime > 0 && currentTime >= zone.releaseTime) {
        zone.ballIndices = [];
        zone.releaseTime = 0;
      }
    });
  }

  /**
   * Get all held balls across all zones
   */
  getAllHeldBalls(): number[] {
    const held: number[] = [];
    this.zones.forEach((zone) => {
      held.push(...zone.ballIndices);
    });
    return held;
  }

  /**
   * Get held ball count
   */
  getHeldBallCount(): number {
    return this.getAllHeldBalls().length;
  }

  /**
   * Check if zone exists and is active
   */
  isZoneActive(zoneId: string): boolean {
    const zone = this.zones.get(zoneId);
    return zone ? zone.active : false;
  }

  /**
   * Set zone power (0-10)
   */
  setZonePower(zoneId: string, power: number): void {
    const zone = this.zones.get(zoneId);
    if (zone) {
      zone.power = Math.max(0, Math.min(10, Math.floor(power)));
    }
  }

  /**
   * Detect collisions with magnet zones
   * Returns true if ball should be held
   */
  checkMagnetCollisions(ballX: number, ballY: number): string | null {
    for (const zone of this.zones.values()) {
      if (!zone.active) continue;

      const dx = ballX - zone.x;
      const dy = ballY - zone.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= zone.radius) {
        return zone.id; // Return zone that ball collided with
      }
    }
    return null;
  }

  /**
   * Clear all zones
   */
  clear(): void {
    this.zones.clear();
    this.nextId = 0;
  }

  /**
   * Get all zones (for debugging)
   */
  getAllZones(): MagnetZone[] {
    return Array.from(this.zones.values());
  }
}

// Global magnet system instance
export let magnetSystem: MagnetSystem | null = null;

export function initializeMagnetSystem(): MagnetSystem {
  magnetSystem = new MagnetSystem();
  return magnetSystem;
}

export function getMagnetSystem(): MagnetSystem | null {
  return magnetSystem;
}
