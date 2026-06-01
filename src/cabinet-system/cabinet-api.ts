// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import { CabinetProfile } from './cabinet-profile';
import { CabinetSystem } from './cabinet-system-class';

let cabinetSystem: CabinetSystem | null = null;

export function initializeCabinetSystem(): CabinetSystem {
  if (!cabinetSystem) {
    cabinetSystem = new CabinetSystem();
  }
  return cabinetSystem;
}

export function getCabinetSystem(): CabinetSystem | null {
  return cabinetSystem;
}

export function getActiveCabinetProfile(): CabinetProfile {
  if (!cabinetSystem) {
    cabinetSystem = new CabinetSystem();
  }
  return cabinetSystem.getProfile();
}

export function setActiveCabinetProfile(profileId: string): boolean {
  const profile = CabinetSystem.getProfileById(profileId);
  if (!profile) return false;

  if (!cabinetSystem) {
    cabinetSystem = new CabinetSystem();
  }
  cabinetSystem.setProfile(profile);
  return true;
}

export function rotatePlayfieldTo(degrees: 0 | 90 | 180 | 270, duration?: number): Promise<void> {
  if (!cabinetSystem) {
    cabinetSystem = new CabinetSystem();
  }
  return cabinetSystem.rotatePlayfield(degrees, duration);
}

export function getCabinetDiagnostics() {
  if (!cabinetSystem) {
    cabinetSystem = new CabinetSystem();
  }
  return cabinetSystem.getDiagnostics();
}
