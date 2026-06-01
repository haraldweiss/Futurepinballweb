// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

export type DeviceType = 'mobile' | 'tablet' | 'desktop';

export interface BackglassRenderConfig {
  enabled: boolean;
  use3D: boolean;
  deviceType: DeviceType;
}
