// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Keyframe {
  time: number;
  position: Vector3;
  rotation: Vector3;
  scale: Vector3;
  duration: number;
}

export interface AnimationSequence {
  name: string;
  frameRate: number;
  frames: Keyframe[];
  looping: boolean;
  duration: number;
}

export interface BAMConfig {
  mode: 'desktop' | 'cabinet' | 'vr';

  camera: {
    fov: number;
    near: number;
    far: number;
  };

  lighting: {
    lightStrength: number;
    ambientIntensity: number;
    diffuseIntensity: number;
  };

  physics: {
    tiltSensitivity: number;
    gravityCompensation: boolean;
    flipperPower: number;
    multiballMode: boolean;
  };

  animation: {
    enabled: boolean;
    interpolation: 'linear' | 'cubic';
    autoPlay: boolean;
  };
}
