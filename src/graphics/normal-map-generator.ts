import * as THREE from 'three';

/**
 * NormalMapGenerator - Generates normal maps from textures using Sobel edge detection
 * Converts texture brightness gradients into normal direction vectors
 */

export class NormalMapGenerator {
  private cache: Map<string, THREE.Texture> = new Map();

  /**
   * Generate a normal map from a texture using Sobel filter
   */
  generateFromTexture(texture: THREE.Texture, strength: number = 1.0, textureId?: string): THREE.Texture {
    // Check cache
    if (textureId && this.cache.has(textureId)) {
      return this.cache.get(textureId)!;
    }

    // Convert texture to canvas
    const canvas = this.textureToCanvas(texture);

    // Apply Sobel filter
    const normalCanvas = this.applySobelFilter(canvas, strength);

    // Add procedural detail layer
    this.enhanceWithDetailMap(normalCanvas, strength * 0.5);

    // Convert canvas to THREE.Texture
    const normalTexture = new THREE.CanvasTexture(normalCanvas);
    normalTexture.magFilter = THREE.LinearFilter;
    normalTexture.minFilter = THREE.LinearMipmapLinearFilter;
    normalTexture.colorSpace = THREE.NoColorSpace;  // Normal maps are not sRGB
    normalTexture.generateMipmaps = true;

    // Cache result
    if (textureId) {
      this.cache.set(textureId, normalTexture);
    }

    return normalTexture;
  }

  /**
   * Convert THREE.Texture to canvas for processing
   */
  private textureToCanvas(texture: THREE.Texture): HTMLCanvasElement {
    const image = texture.source.data;

    if (image instanceof HTMLCanvasElement) {
      return image;
    }

    // Create canvas from image
    const canvas = document.createElement('canvas');
    canvas.width = image.width || 512;
    canvas.height = image.height || 512;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');

    if (image instanceof HTMLImageElement) {
      ctx.drawImage(image, 0, 0);
    }

    return canvas;
  }

  /**
   * Apply Sobel edge detection filter to generate normal map
   * Uses X and Y gradients to create normal direction vectors
   */
  private applySobelFilter(canvas: HTMLCanvasElement, strength: number): HTMLCanvasElement {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Create output canvas
    const outCanvas = document.createElement('canvas');
    outCanvas.width = width;
    outCanvas.height = height;
    const outCtx = outCanvas.getContext('2d')!;
    const outData = outCtx.createImageData(width, height);
    const outPixels = outData.data;

    // Sobel kernels
    const sobelX = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ];

    const sobelY = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ];

    // Process each pixel
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        // Get surrounding pixels (grayscale)
        const samples: number[] = [];
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 / 255;
            samples.push(gray);
          }
        }

        // Apply Sobel kernels
        let gx = 0, gy = 0;
        for (let i = 0; i < 9; i++) {
          const row = Math.floor(i / 3);
          const col = i % 3;
          gx += sobelX[row][col] * samples[i];
          gy += sobelY[row][col] * samples[i];
        }

        // Normalize gradients
        const length = Math.sqrt(gx * gx + gy * gy);
        if (length > 0) {
          gx /= length;
          gy /= length;
        }

        // Apply strength multiplier
        gx *= strength;
        gy *= strength;

        // Clamp to [-1, 1]
        gx = Math.max(-1, Math.min(1, gx));
        gy = Math.max(-1, Math.min(1, gy));

        // Calculate Z component (height from XY gradients)
        const gz = Math.sqrt(Math.max(0, 1 - gx * gx - gy * gy));

        // Encode normal to RGBA: (X+1)/2, (Y+1)/2, Z, 1.0
        const outIdx = (y * width + x) * 4;
        outPixels[outIdx] = Math.round(((gx + 1) / 2) * 255);      // R = X
        outPixels[outIdx + 1] = Math.round(((gy + 1) / 2) * 255);  // G = Y
        outPixels[outIdx + 2] = Math.round(gz * 255);              // B = Z
        outPixels[outIdx + 3] = 255;                               // A = 1.0
      }
    }

    outCtx.putImageData(outData, 0, 0);
    return outCanvas;
  }

  /**
   * Add procedural detail layer to enhance normal map
   * Blends Perlin-like noise for micro-details
   */
  private enhanceWithDetailMap(canvas: HTMLCanvasElement, detailStrength: number): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');

    const width = canvas.width;
    const height = canvas.height;
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    // Generate Perlin-like noise pattern
    const noiseScale = 0.05; // Fine detail
    const noiseOctaves = 3;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let noise = 0;
        let amplitude = 1;
        let frequency = 1;
        let maxValue = 0;

        // Multi-octave noise
        for (let octave = 0; octave < noiseOctaves; octave++) {
          const sx = x * noiseScale * frequency;
          const sy = y * noiseScale * frequency;

          // Simple sine-based pseudo-noise
          const n = Math.sin(sx * 12.9898 + sy * 78.233) * 43758.5453;
          const value = (n - Math.floor(n)) * 2 - 1; // -1 to 1

          noise += value * amplitude;
          maxValue += amplitude;
          amplitude *= 0.5;
          frequency *= 2;
        }

        // Normalize noise
        noise = (noise / maxValue) * detailStrength;

        // Blend with existing normal
        const idx = (y * width + x) * 4;

        // Decode current normal
        const nx = (data[idx] / 255) * 2 - 1;           // -1 to 1
        const ny = (data[idx + 1] / 255) * 2 - 1;       // -1 to 1
        const nz = (data[idx + 2] / 255);               // 0 to 1

        // Apply detail noise
        const detailNx = nx + noise * 0.1;
        const detailNy = ny + noise * 0.05;

        // Clamp and re-normalize
        const len = Math.sqrt(detailNx * detailNx + detailNy * detailNy + nz * nz);
        const finalNx = len > 0 ? detailNx / len : 0;
        const finalNy = len > 0 ? detailNy / len : 0;
        const finalNz = len > 0 ? nz / len : 1;

        // Encode back
        data[idx] = Math.round(((finalNx + 1) / 2) * 255);
        data[idx + 1] = Math.round(((finalNy + 1) / 2) * 255);
        data[idx + 2] = Math.round(finalNz * 255);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  /**
   * Cache a normal map for a texture
   */
  cacheNormalMap(textureId: string, normalMap: THREE.Texture): void {
    this.cache.set(textureId, normalMap);
  }

  /**
   * Get cached normal map
   */
  getCachedNormalMap(textureId: string): THREE.Texture | undefined {
    return this.cache.get(textureId);
  }

  /**
   * Clear cache and dispose textures
   */
  clearCache(): void {
    for (const texture of this.cache.values()) {
      texture.dispose();
    }
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}

// Singleton instance
let generatorInstance: NormalMapGenerator | null = null;

export function getNormalMapGenerator(): NormalMapGenerator {
  if (!generatorInstance) {
    generatorInstance = new NormalMapGenerator();
  }
  return generatorInstance;
}
