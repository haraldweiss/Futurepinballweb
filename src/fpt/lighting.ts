// SPDX-License-Identifier: AGPL-3.0-or-later

import * as THREE from 'three';

// ─── Helper: Light-Parameter aus Farbbelligkeit ───────────────────────────────
export function getLightConfigFromColor(color: number): { intensity: number; distance: number } {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;  // Perceived brightness

  // Hell → weniger Licht nötig, kürzere Distanz (fokussierter)
  // Dunkel → mehr Licht nötig, längere Distanz (breiter)
  // Capped intensities to reduce overall glare
  const intensity = brightness > 0.7 ? 0.6 : brightness > 0.4 ? 0.7 : 0.9;
  const distance = brightness > 0.7 ? 3.0 : brightness > 0.4 ? 4.0 : 5.0;
  return { intensity, distance };
}

// ─── Auto-Licht-Generierung aus Spielfeld-Textur ─────────────────────────────
export function suggestTableLights(texture: THREE.Texture): Array<{ color: number; intensity: number; dist: number; x: number; y: number; z: number }> {
  if (!texture?.image) return [];

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    // Analysiere Textur in 64x64 Raster
    canvas.width = 64;
    canvas.height = 64;
    const img = texture.image as HTMLImageElement;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Finde dominante Farbe und Helligkeit
    const colorSamples = new Map<number, { brightness: number; count: number }>();
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
      const quantized = ((Math.round(r/32)*32 << 16) | (Math.round(g/32)*32 << 8) | (Math.round(b/32)*32));
      const existing = colorSamples.get(quantized) ?? { brightness: 0, count: 0 };
      colorSamples.set(quantized, { brightness: (existing.brightness + brightness) / 2, count: existing.count + 1 });
    }

    // Finde Top 3 Farben
    const topColors = Array.from(colorSamples.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([color]) => color);

    // Durchschnittliche Helligkeit berechnen
    let totalBrightness = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      totalBrightness += (r * 0.299 + g * 0.587 + b * 0.114) / 255;
    }
    const avgBrightness = totalBrightness / (data.length / 4);

    // Generiere Lichter basierend auf Farben und Helligkeit
    const lights: Array<{ color: number; intensity: number; dist: number; x: number; y: number; z: number }> = [];

    // Hauptlicht: Top-Farbe oben center
    const primaryColor = topColors[0] ?? 0xff8800;
    const mainIntensity = avgBrightness < 0.3 ? 1.2 : avgBrightness < 0.6 ? 0.8 : 0.5;
    lights.push({ color: primaryColor, intensity: mainIntensity, dist: 10, x: 0, y: 2, z: 4 });

    // Fülllichter: links/rechts
    if (topColors.length > 1) {
      const secondColor = topColors[1];
      const fillIntensity = mainIntensity * 0.6;
      lights.push({ color: secondColor, intensity: fillIntensity, dist: 8, x: -2, y: -2, z: 3 });
      lights.push({ color: secondColor, intensity: fillIntensity, dist: 8, x: 2, y: -2, z: 3 });
    }

    // Hinterlicht (Komplementärfarbe): subtle
    if (topColors.length > 2) {
      const accentColor = topColors[2];
      lights.push({ color: accentColor, intensity: mainIntensity * 0.3, dist: 6, x: 0, y: -4, z: 2 });
    }

    return lights;
  } catch (e) {
    console.debug('[fpt-parser] Light extraction failed:', (e || 'unknown'));
    return [];
  }
}

// ─── Material-Farb-Analyse aus Texturen (global + per-element) ────────────────
export function extractDominantColors(texture: THREE.Texture): { primary: number; accent: number } | null {
  if (!texture?.image) return null;

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = 64;
    canvas.height = 64;
    const img = texture.image as HTMLImageElement;

    // Skaliere Bild herunter für Analyse
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Finde dominante Farben (RGB-Histogramm)
    const colorMap = new Map<number, number>();
    for (let i = 0; i < data.length; i += 4) {
      const r = Math.round(data[i] / 64) * 64;
      const g = Math.round(data[i+1] / 64) * 64;
      const b = Math.round(data[i+2] / 64) * 64;
      const color = (r << 16) | (g << 8) | b;
      colorMap.set(color, (colorMap.get(color) ?? 0) + 1);
    }

    // Finde Top-2 Farben
    const sorted = Array.from(colorMap.entries()).sort((a,b) => b[1]-a[1]);
    if (sorted.length < 1) return null;

    const primary = sorted[0][0];
    const accent = sorted[1] ? sorted[1][0] : (primary ^ 0xffffff);

    return { primary, accent };
  } catch (e) {
    console.debug('[fpt-parser] Color extraction failed:', (e || 'unknown'));
    return null;
  }
}

// ─── Per-Element Farb-Analyse aus lokalen Texture-Regionen ──────────────────
export function extractElementColors(texture: THREE.Texture, coords: Array<{x:number;y:number}>): Map<number, number> {
  const elementColors = new Map<number, number>();
  if (!texture?.image || coords.length === 0) return elementColors;

  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return elementColors;

    const img = texture.image as HTMLImageElement;
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;

    // Für jede Koordinate: analyse lokale 64x64 Region
    coords.forEach((coord, idx) => {
      // Normalisiere Koordinate zu Texture-Space ([-3,3] → [0,imgW], [-6,6] → [0,imgH])
      const texX = Math.round(((coord.x + 3) / 6) * imgW);
      const texY = Math.round(((coord.y + 6) / 12) * imgH);

      // Definiere 64x64 Analyse-Region
      const regionSize = 64;
      const x0 = Math.max(0, texX - regionSize/2);
      const y0 = Math.max(0, texY - regionSize/2);
      const x1 = Math.min(imgW, x0 + regionSize);
      const y1 = Math.min(imgH, y0 + regionSize);

      canvas.width = x1 - x0;
      canvas.height = y1 - y0;
      ctx.drawImage(img, -x0, -y0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Finde dominante Farbe in dieser Region
      const colorMap = new Map<number, number>();
      for (let i = 0; i < data.length; i += 4) {
        const r = Math.round(data[i] / 64) * 64;
        const g = Math.round(data[i+1] / 64) * 64;
        const b = Math.round(data[i+2] / 64) * 64;
        const color = (r << 16) | (g << 8) | b;
        colorMap.set(color, (colorMap.get(color) ?? 0) + 1);
      }

      const sorted = Array.from(colorMap.entries()).sort((a,b) => b[1]-a[1]);
      if (sorted.length > 0) {
        elementColors.set(idx, sorted[0][0]);
      }
    });

    return elementColors;
  } catch (e) {
    console.debug('[fpt-parser] Element color extraction failed:', (e || 'unknown'));
    return elementColors;
  }
}
