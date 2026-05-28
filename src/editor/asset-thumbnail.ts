// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss

import * as THREE from 'three';

const PLACEHOLDER_DATA_URL =
  'data:image/svg+xml;base64,' +
  btoa('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#888"/></svg>');

/**
 * Convert a Three.js texture to a data URL for display in <img> tags.
 * Returns a grey SVG placeholder for null inputs or extraction failures.
 */
export function textureToDataURL(tex: THREE.Texture | null): string {
  if (!tex) return PLACEHOLDER_DATA_URL;
  const img: any = tex.image;
  if (!img) return PLACEHOLDER_DATA_URL;

  const canvas = document.createElement('canvas');
  const w = img.width  ?? 1;
  const h = img.height ?? 1;
  canvas.width  = Math.min(w, 256);
  canvas.height = Math.min(h, 256);
  const ctx = canvas.getContext('2d');
  if (!ctx) return PLACEHOLDER_DATA_URL;

  try {
    if (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } else if (img.data) {
      const imgData = ctx.createImageData(w, h);
      imgData.data.set(img.data);
      ctx.putImageData(imgData, 0, 0);
    }
    return canvas.toDataURL('image/png');
  } catch {
    return PLACEHOLDER_DATA_URL;
  }
}

/**
 * Format a duration in seconds for display:
 * - <60s: "12.0s"
 * - >=60s: "MM:SS"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format a byte count in human units.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
