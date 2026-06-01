// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

export interface CabinetProfile {
  id: string;
  name: string;
  rotation: 0 | 90 | 180 | 270;
  screenRatio: 'vertical' | 'horizontal' | 'wide';
  flipperLayout: 'standard' | 'rotated';
  description: string;

  cameraPosition: { x: number; y: number; z: number };
  cameraLookAt: { x: number; y: number; z: number };
  cameraFOV: number;

  scorePosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  multiplierPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  ballCounterPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

  leftFlipperKey: string;
  rightFlipperKey: string;
}

export const CABINET_VERTICAL: CabinetProfile = {
  id: 'vertical',
  name: 'Vertikal Upright (Portrait)',
  rotation: 90,
  screenRatio: 'vertical',
  flipperLayout: 'rotated',
  description: 'Authentisches arcade Automaten-Layout mit vertikalem Monitor',

  cameraPosition: { x: 0, y: -8, z: 16 },
  cameraLookAt: { x: 0, y: 0, z: 0 },
  cameraFOV: 60,

  scorePosition: 'top-left',
  multiplierPosition: 'top-right',
  ballCounterPosition: 'bottom-right',

  leftFlipperKey: 'ShiftLeft',
  rightFlipperKey: 'ShiftRight',
};

export const CABINET_HORIZONTAL: CabinetProfile = {
  id: 'horizontal',
  name: 'Horizontal Upright (Landscape)',
  rotation: 0,
  screenRatio: 'horizontal',
  flipperLayout: 'standard',
  description: 'Standard arcade Automaten-Layout mit horizontalem Monitor',

  cameraPosition: { x: 0, y: -9.5, z: 14 },
  cameraLookAt: { x: 0, y: 0.5, z: 0 },
  cameraFOV: 58,

  scorePosition: 'top-left',
  multiplierPosition: 'top-right',
  ballCounterPosition: 'bottom-left',

  leftFlipperKey: 'ShiftLeft',
  rightFlipperKey: 'ShiftRight',
};

export const CABINET_WIDE: CabinetProfile = {
  id: 'wide',
  name: 'Ultrawide (21:9+)',
  rotation: 0,
  screenRatio: 'wide',
  flipperLayout: 'standard',
  description: 'Ultrawide Monitor für immersives Spielerlebnis',

  cameraPosition: { x: 0, y: -10, z: 12 },
  cameraLookAt: { x: 0, y: 0.5, z: 0 },
  cameraFOV: 65,

  scorePosition: 'center',
  multiplierPosition: 'top-right',
  ballCounterPosition: 'top-left',

  leftFlipperKey: 'ShiftLeft',
  rightFlipperKey: 'ShiftRight',
};

export const CABINET_INVERTED: CabinetProfile = {
  id: 'inverted',
  name: 'Rotated 180° (Invertiert)',
  rotation: 180,
  screenRatio: 'horizontal',
  flipperLayout: 'rotated',
  description: '180° gedrehter Spielfeldblick',

  cameraPosition: { x: 0, y: -9.5, z: -14 },
  cameraLookAt: { x: 0, y: 0.5, z: 0 },
  cameraFOV: 58,

  scorePosition: 'bottom-right',
  multiplierPosition: 'bottom-left',
  ballCounterPosition: 'top-right',

  leftFlipperKey: 'ShiftLeft',
  rightFlipperKey: 'ShiftRight',
};
