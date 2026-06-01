// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
import * as THREE from 'three';

export interface ParticleEmitterConfig {
  position: THREE.Vector3;
  color: number;
  count: number;
  speed: number;
  spread: number;
  lifetime: number;
  size: number;
  decay: boolean;
}

export function emitAdvancedParticles(
  config: ParticleEmitterConfig,
  particleSystem: any
): void {
  if (!particleSystem) return;

  const r = ((config.color >> 16) & 0xff) / 255;
  const g = ((config.color >> 8) & 0xff) / 255;
  const b = (config.color & 0xff) / 255;

  for (let i = 0; i < config.count; i++) {
    const angle = (Math.random() - 0.5) * config.spread;
    const velocity = config.speed * (0.8 + Math.random() * 0.4);

    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;
    const vz = (Math.random() - 0.5) * velocity;

    particleSystem.addParticle(
      config.position.x,
      config.position.y,
      config.position.z,
      vx,
      vy,
      vz,
      r,
      g,
      b,
      config.size,
      config.lifetime,
      config.decay
    );
  }
}

export function emitBallTrail(
  ballPos: THREE.Vector3,
  ballVel: THREE.Vector3,
  particleSystem: any
): void {
  const speed = Math.hypot(ballVel.x, ballVel.y);
  if (speed < 2) return;

  const color = 0x99ccff;
  const count = Math.floor(speed * 0.5);

  emitAdvancedParticles(
    {
      position: ballPos,
      color: color,
      count: Math.min(count, 5),
      speed: 1.0,
      spread: 30,
      lifetime: 0.3,
      size: 0.08,
      decay: true,
    },
    particleSystem
  );
}

export function emitFlipperDust(
  flipperPos: THREE.Vector3,
  particleSystem: any
): void {
  emitAdvancedParticles(
    {
      position: flipperPos,
      color: 0xbbbbbb,
      count: 4,
      speed: 2.5,
      spread: 60,
      lifetime: 0.8,
      size: 0.06,
      decay: true,
    },
    particleSystem
  );
}

export function emitMilestoneSparkles(
  position: THREE.Vector3,
  particleSystem: any
): void {
  emitAdvancedParticles(
    {
      position: position,
      color: 0xffff00,
      count: 12,
      speed: 3.0,
      spread: 360,
      lifetime: 1.0,
      size: 0.12,
      decay: true,
    },
    particleSystem
  );
}
