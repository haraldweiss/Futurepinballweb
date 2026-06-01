import * as THREE from 'three';
import { fptResources } from '../game';
import { logMsg } from './log';

export function getBackglassArtwork(): THREE.Texture | null {
  const patterns = [
    /backglass|artwork|backdrop|translite|marquee|background/i,
  ];

  for (const pattern of patterns) {
    for (const [name, texture] of Object.entries(fptResources.textures)) {
      if (pattern.test(name) && texture) {
        logMsg(`✓ Backglass artwork found: "${name}"`, 'info');
        return texture;
      }
    }
  }

  let largestTexture: THREE.Texture | null = null;
  let largestArea = 0;

  for (const [_name, texture] of Object.entries(fptResources.textures)) {
    if (!texture?.image) continue;
    const img = texture.image as HTMLImageElement;
    const area = (img.width || 0) * (img.height || 0);

    if (area > largestArea && area > 10000) {
      largestArea = area;
      largestTexture = texture;
    }
  }

  if (largestTexture) {
    logMsg(`✓ Using largest texture as backglass artwork (${largestArea} pixels)`, 'info');
    return largestTexture;
  }

  logMsg('⚠ No suitable backglass artwork found in FPT file', 'warn');
  return null;
}
