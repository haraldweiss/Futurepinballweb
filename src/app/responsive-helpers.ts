// SPDX-License-Identifier: AGPL-3.0-or-later
export function calculateResponsiveZoom(aspectRatio: number): number {
  let zoom: number;
  if (aspectRatio > 2.0) {
    zoom = 12 + (2.0 - aspectRatio) * 2;
  } else if (aspectRatio > 1.5) {
    zoom = 14 + (aspectRatio - 1.5) * 4;
  } else if (aspectRatio > 1.0) {
    zoom = 17 + (1.5 - aspectRatio) * 6;
  } else {
    zoom = 20 + (1.0 - aspectRatio) * 8;
  }
  return Math.max(12, Math.min(28, zoom));
}

export function getResponsiveCameraTilt(aspectRatio: number): number {
  if (aspectRatio < 0.6) return -8;
  if (aspectRatio < 0.9) return -9;
  if (aspectRatio < 1.3) return -9.5;
  return -10;
}

export function getResponsiveFOV(): number {
  const width = window.innerWidth;
  if (width < 500) return 65;
  if (width < 768) {
    const t = (width - 500) / 268;
    return 65 - (3 * t * t);
  }
  if (width < 1200) {
    const t = (width - 768) / 432;
    return 62 - (4 * t * t);
  }
  return 58;
}

export function getResponsiveFlipperX(aspectRatio: number): number {
  const minFlipperX = 0.90;
  const maxFlipperX = 1.40;
  if (aspectRatio < 1.0) {
    return minFlipperX + (aspectRatio - 0.5) * (1.05 - minFlipperX) / 0.5;
  }
  return 1.05 + Math.min((aspectRatio - 1.0) * 0.18, maxFlipperX - 1.05);
}

export function getOptimalPixelRatio(): number {
  const physWidth = window.screen.width * window.devicePixelRatio;
  if (physWidth >= 3840) return Math.min(window.devicePixelRatio, 3);
  if (physWidth >= 1920) return Math.min(window.devicePixelRatio, 2);
  return Math.min(window.devicePixelRatio, 1.5);
}

export function calcSafeFlipperLength(flipperX: number): number {
  const cos35 = Math.cos(35 * Math.PI / 180);
  const ballRadius = 0.22;
  const maxLen = (flipperX - ballRadius) / cos35;
  return Math.min(2.1, Math.max(1.2, maxLen));
}

export function getAutoQualityPreset(): string {
  const physWidth = window.screen.width * window.devicePixelRatio;
  if (physWidth >= 3840) return 'ultra';
  if (physWidth >= 1920) return 'high';
  if (physWidth >= 1280) return 'medium';
  return 'low';
}

export function detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1200) return 'tablet';
  return 'desktop';
}
