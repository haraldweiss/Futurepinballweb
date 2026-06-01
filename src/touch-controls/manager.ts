// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { devLog } from '../utils/dev-log';
import { TouchZone } from './types';
import { getDefaultZones, pointInZone } from './zones';
import { createTouchIndicator, updateTouchPosition, fadeAndRemoveIndicator } from './indicators';

export class TouchControlsManager {
  private enabled: boolean = true;
  private leftFlipperActive: boolean = false;
  private rightFlipperActive: boolean = false;
  private plungerTouching: boolean = false;
  private plungerStartY: number = 0;
  private plungerCurrentY: number = 0;

  private leftFlipperZone: TouchZone = { x: 0, y: 0, width: 0, height: 0 };
  private rightFlipperZone: TouchZone = { x: 0, y: 0, width: 0, height: 0 };
  private plungerZone: TouchZone = { x: 0, y: 0, width: 0, height: 0 };

  private onLeftFlipperPress: (() => void) | null = null;
  private onLeftFlipperRelease: (() => void) | null = null;
  private onRightFlipperPress: (() => void) | null = null;
  private onRightFlipperRelease: (() => void) | null = null;
  private onPlungerChange: ((power: number) => void) | null = null;

  private touchIndicators: Map<number, HTMLElement> = new Map();

  constructor() {
    this.setupTouchZones();
    this.setupEventListeners();
    if (import.meta.env.DEV) { console.log('[Touch Controls] ✓ Initialized'); }
  }

  private setupTouchZones(): void {
    const zones = getDefaultZones();
    this.leftFlipperZone = zones.left;
    this.rightFlipperZone = zones.right;
    this.plungerZone = zones.plunger;

    if (import.meta.env.DEV) { console.log('[Touch] Zones configured:', `Flipper-L: ${this.leftFlipperZone.width}x${this.leftFlipperZone.height}px`, `Flipper-R: ${this.rightFlipperZone.width}x${this.rightFlipperZone.height}px`, `Plunger: ${this.plungerZone.width}x${this.plungerZone.height}px`); }
  }

  private setupEventListeners(): void {
    document.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });
    document.addEventListener('touchcancel', (e) => this.handleTouchCancel(e), { passive: false });

    window.addEventListener('resize', () => this.setupTouchZones());
  }

  private handleTouchStart(e: TouchEvent): void {
    if (!this.enabled) return;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const x = touch.clientX;
      const y = touch.clientY;

      if (pointInZone(x, y, this.leftFlipperZone)) {
        e.preventDefault();
        this.leftFlipperActive = true;
        if (this.onLeftFlipperPress) this.onLeftFlipperPress();
        this.showTouchIndicator(touch.identifier, x, y, '#00ff88');
        devLog('[Touch] Left flipper pressed');
      } else if (pointInZone(x, y, this.rightFlipperZone)) {
        e.preventDefault();
        this.rightFlipperActive = true;
        if (this.onRightFlipperPress) this.onRightFlipperPress();
        this.showTouchIndicator(touch.identifier, x, y, '#ff00ff');
        devLog('[Touch] Right flipper pressed');
      } else if (pointInZone(x, y, this.plungerZone)) {
        e.preventDefault();
        this.plungerTouching = true;
        this.plungerStartY = y;
        this.plungerCurrentY = y;
        this.showTouchIndicator(touch.identifier, x, y, '#ffff00');
        devLog('[Touch] Plunger engaged');
      }
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    if (!this.enabled) return;

    for (let i = 0; i < e.touches.length; i++) {
      const touch = e.touches[i];
      const x = touch.clientX;
      const y = touch.clientY;

      if (this.plungerTouching) {
        e.preventDefault();
        this.plungerCurrentY = y;

        const dragDistance = Math.max(0, this.plungerCurrentY - this.plungerStartY);
        const maxDrag = this.plungerZone.height * 0.6;
        const power = Math.min(1.0, dragDistance / maxDrag);

        if (this.onPlungerChange) {
          this.onPlungerChange(power);
        }

        this.updateTouchIndicator(touch.identifier, x, y);
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (!this.enabled) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const touchId = touch.identifier;

      if (this.leftFlipperActive) {
        const x = touch.clientX;
        const y = touch.clientY;
        if (pointInZone(x, y, this.leftFlipperZone)) {
          this.leftFlipperActive = false;
          if (this.onLeftFlipperRelease) this.onLeftFlipperRelease();
          devLog('[Touch] Left flipper released');
        }
      }

      if (this.rightFlipperActive) {
        const x = touch.clientX;
        const y = touch.clientY;
        if (pointInZone(x, y, this.rightFlipperZone)) {
          this.rightFlipperActive = false;
          if (this.onRightFlipperRelease) this.onRightFlipperRelease();
          devLog('[Touch] Right flipper released');
        }
      }

      if (this.plungerTouching) {
        this.plungerTouching = false;
        if (this.onPlungerChange) {
          this.onPlungerChange(0);
        }
        devLog('[Touch] Plunger released');
      }

      this.removeTouchIndicator(touchId);
    }
  }

  private handleTouchCancel(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      this.removeTouchIndicator(touch.identifier);
    }

    this.leftFlipperActive = false;
    this.rightFlipperActive = false;
    this.plungerTouching = false;
  }

  private showTouchIndicator(touchId: number, x: number, y: number, color: string): void {
    const indicator = createTouchIndicator(x, y, color);
    document.body.appendChild(indicator);
    this.touchIndicators.set(touchId, indicator);
  }

  private updateTouchIndicator(touchId: number, x: number, y: number): void {
    const indicator = this.touchIndicators.get(touchId);
    if (indicator) {
      updateTouchPosition(indicator, x, y);
    }
  }

  private removeTouchIndicator(touchId: number): void {
    const indicator = this.touchIndicators.get(touchId);
    if (indicator) {
      fadeAndRemoveIndicator(indicator);
      this.touchIndicators.delete(touchId);
    }
  }

  onLeftFlipperPressCallback(cb: () => void): void {
    this.onLeftFlipperPress = cb;
  }

  onLeftFlipperReleaseCallback(cb: () => void): void {
    this.onLeftFlipperRelease = cb;
  }

  onRightFlipperPressCallback(cb: () => void): void {
    this.onRightFlipperPress = cb;
  }

  onRightFlipperReleaseCallback(cb: () => void): void {
    this.onRightFlipperRelease = cb;
  }

  onPlungerChangeCallback(cb: (power: number) => void): void {
    this.onPlungerChange = cb;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    devLog(`[Touch Controls] ${enabled ? 'Enabled' : 'Disabled'}`);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  static isTouchDevice(): boolean {
    return (('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            ((navigator as any).msMaxTouchPoints > 0));
  }

  static isMobileDevice(): boolean {
    const userAgent = navigator.userAgent.toLowerCase();
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
  }
}
