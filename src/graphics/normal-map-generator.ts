import * as THREE from 'three';

/**
 * NormalMapGenerator - Generates normal maps from height/color textures
 * Produces detailed surface normal information for enhanced lighting
 */

let generatorInstance: NormalMapGenerator | null = null;

export class NormalMapGenerator {
  private normalCache: Map<string, THREE.Texture> = new Map();

  /**
   * Generate a normal map from a texture or create procedural normals
   */
  generateNormalMap(
    sourceTexture?: THREE.Texture,
    width: number = 512,
    height: number = 512,
    strength: number = 1.0
  ): THREE.Texture {
    // Check cache
    const cacheKey = sourceTexture?.uuid || `procedural_${width}_${height}`;
    if (this.normalCache.has(cacheKey)) {
      return this.normalCache.get(cacheKey)!;
    }

    let normalTexture: THREE.Texture;

    if (sourceTexture) {
      normalTexture = this.generateFromHeightmap(sourceTexture, width, height, strength);
    } else {
      normalTexture = this.generateProceduralNormals(width, height);
    }

    // Cache result
    this.normalCache.set(cacheKey, normalTexture);

    return normalTexture;
  }

  /**
   * Generate normal map from height/color texture
   */
  private generateFromHeightmap(
    texture: THREE.Texture,
    width: number,
    height: number,
    strength: number
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');

    // Get height data
    const heightCanvas = document.createElement('canvas');
    const heightCtx = heightCanvas.getContext('2d');
    if (!heightCtx) throw new Error('Failed to create height canvas context');

    heightCanvas.width = width;
    heightCanvas.height = height;

    // Draw texture to temporary canvas
    const image = (texture.source.data as any);
    if (image instanceof HTMLImageElement) {
      heightCtx.drawImage(image, 0, 0, width, height);
    }

    const heightData = heightCtx.getImageData(0, 0, width, height);
    const heights = heightData.data;

    // Generate normals
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Sample neighboring heights
        const h_l = this.getHeight(heights, x - 1, y, width);
        const h_r = this.getHeight(heights, x + 1, y, width);
        const h_u = this.getHeight(heights, x, y - 1, width);
        const h_d = this.getHeight(heights, x, y + 1, width);

        // Calculate normal using Sobel operator
        const nx = (h_r - h_l) * strength;
        const ny = (h_d - h_u) * strength;
        const nz = 1.0;

        // Normalize
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        const nnx = (nx / len) * 0.5 + 0.5;
        const nny = (ny / len) * 0.5 + 0.5;
        const nnz = (nz / len) * 0.5 + 0.5;

        // Store in texture
        pixels[idx] = Math.floor(nnx * 255);
        pixels[idx + 1] = Math.floor(nny * 255);
        pixels[idx + 2] = Math.floor(nnz * 255);
        pixels[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Create texture
    const normalTexture = new THREE.CanvasTexture(canvas);
    normalTexture.magFilter = THREE.LinearFilter;
    normalTexture.minFilter = THREE.LinearMipmapLinearFilter;
    normalTexture.generateMipmaps = true;

    return normalTexture;
  }

  /**
   * Generate procedural normal map (wavy/bumpy surface)
   */
  private generateProceduralNormals(width: number, height: number): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');

    const imageData = ctx.createImageData(width, height);
    const pixels = imageData.data;

    const scale = 0.02;
    const strength = 2.0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;

        // Perlin-like noise simulation using sin waves
        const nx = Math.sin(x * scale) * 0.5;
        const ny = Math.sin(y * scale) * 0.5;
        const nz = Math.sqrt(1 - nx * nx - ny * ny);

        // Normalize
        const len = Math.sqrt(nx * nx * strength + ny * ny * strength + nz * nz);
        const nnx = (nx * strength / len) * 0.5 + 0.5;
        const nny = (ny * strength / len) * 0.5 + 0.5;
        const nnz = (nz / len) * 0.5 + 0.5;

        pixels[idx] = Math.floor(nnx * 255);
        pixels[idx + 1] = Math.floor(nny * 255);
        pixels[idx + 2] = Math.floor(nnz * 255);
        pixels[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;

    return texture;
  }

  /**
   * Get height value at (x, y) from height data array
   */
  private getHeight(heightData: Uint8ClampedArray, x: number, y: number, width: number): number {
    // Clamp coordinates
    x = Math.max(0, Math.min(width - 1, x));
    y = Math.max(0, Math.min(width - 1, y));

    const idx = (y * width + x) * 4;
    // Convert RGB to grayscale
    return (
      (heightData[idx] + heightData[idx + 1] + heightData[idx + 2]) /
      (3 * 255)
    );
  }

  /**
   * Clear caches to free memory
   */
  dispose(): void {
    for (const texture of this.normalCache.values()) {
      texture.dispose();
    }
    this.normalCache.clear();
  }
}

/**
 * Get or create singleton instance
 */
export function getNormalMapGenerator(): NormalMapGenerator {
  if (!generatorInstance) {
    generatorInstance = new NormalMapGenerator();
  }
  return generatorInstance;
}

/**
 * Dispose singleton
 */
export function disposeNormalMapGenerator(): void {
  if (generatorInstance) {
    generatorInstance.dispose();
    generatorInstance = null;
  }
}
