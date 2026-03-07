import * as THREE from 'three';

/**
 * TextureAnalyzer - Analyzes texture characteristics to infer material properties
 * Determines metalness, roughness, and emissive values based on texture analysis
 */

export interface ColorAnalysis {
  dominantColor: { r: number; g: number; b: number };
  accentColor: { r: number; g: number; b: number };
  brightness: number;        // 0-1 (average luminance)
  contrast: number;          // 0-1 (variation between pixels)
  saturation: number;        // 0-1 (color purity)
  hue: number;              // 0-360 (dominant color hue in degrees)
  warmth: number;           // -1 to 1 (warm=red/orange vs cool=blue)
}

export interface InferredMaterial {
  color: number;
  metalness: number;
  roughness: number;
  emissive: number;
  emissiveIntensity: number;
  emissiveColor?: number;
}

export class TextureAnalyzer {
  private colorCache: Map<string, ColorAnalysis> = new Map();
  private materialCache: Map<string, InferredMaterial> = new Map();

  /**
   * Analyze a texture and return color characteristics
   */
  analyzeTexture(texture: THREE.Texture, textureId?: string): ColorAnalysis {
    // Check cache first
    if (textureId && this.colorCache.has(textureId)) {
      return this.colorCache.get(textureId)!;
    }

    const canvas = this.textureToCanvas(texture);
    const analysis = this.analyzeCanvas(canvas);

    // Cache result
    if (textureId) {
      this.colorCache.set(textureId, analysis);
    }

    return analysis;
  }

  /**
   * Infer material properties from texture analysis
   */
  inferMaterialProperties(
    texture: THREE.Texture,
    elementType: 'playfield' | 'bumper' | 'target' | 'ramp' = 'playfield'
  ): InferredMaterial {
    const textureId = texture.uuid;

    // Check cache
    if (this.materialCache.has(textureId)) {
      return this.materialCache.get(textureId)!;
    }

    const analysis = this.analyzeTexture(texture, textureId);
    const material = this.createMaterialFromAnalysis(analysis, elementType);

    // Cache result
    this.materialCache.set(textureId, material);

    return material;
  }

  /**
   * Convert THREE.Texture to canvas for pixel analysis
   */
  private textureToCanvas(texture: THREE.Texture): HTMLCanvasElement {
    const image = texture.source.data;

    if (image instanceof HTMLCanvasElement) {
      return image;
    }

    // Create temporary canvas for analysis
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to create canvas context');

    canvas.width = (image as any).width || 256;
    canvas.height = (image as any).height || 256;

    if (image instanceof HTMLImageElement) {
      ctx.drawImage(image, 0, 0);
    } else if (image instanceof ImageData) {
      ctx.putImageData(image, 0, 0);
    }

    return canvas;
  }

  /**
   * Analyze canvas pixel data and extract color statistics
   */
  private analyzeCanvas(canvas: HTMLCanvasElement): ColorAnalysis {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let r = 0, g = 0, b = 0, brightness = 0;
    const colorBuckets = new Map<string, number>();

    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;

      // Track color distribution
      const colorKey = `${Math.floor(data[i] / 32)}_${Math.floor(data[i + 1] / 32)}_${Math.floor(data[i + 2] / 32)}`;
      colorBuckets.set(colorKey, (colorBuckets.get(colorKey) || 0) + 1);
    }

    const pixelCount = data.length / 4;
    r = Math.floor(r / pixelCount);
    g = Math.floor(g / pixelCount);
    b = Math.floor(b / pixelCount);
    brightness = brightness / pixelCount / 255;

    // Find dominant color
    let maxCount = 0;
    let dominantKey = '0_0_0';
    for (const [key, count] of colorBuckets) {
      if (count > maxCount) {
        maxCount = count;
        dominantKey = key;
      }
    }

    const [dr, dg, db] = dominantKey.split('_').map((v) => parseInt(v) * 32);

    // Calculate contrast, saturation, hue
    const maxVal = Math.max(r, g, b);
    const minVal = Math.min(r, g, b);
    const saturation = maxVal === 0 ? 0 : (maxVal - minVal) / maxVal;

    // Hue calculation (simplified)
    let hue = 0;
    if (maxVal === r) hue = 60 * (((g - b) / (maxVal - minVal)) % 6);
    else if (maxVal === g) hue = 60 * (((b - r) / (maxVal - minVal)) + 2);
    else hue = 60 * (((r - g) / (maxVal - minVal)) + 4);

    // Warmth (red/orange = warm, blue = cool)
    const warmth = (r - b) / 255; // -1 to 1

    // Contrast (simple std dev approximation)
    const contrast = Math.abs(maxVal - minVal) / 255;

    return {
      dominantColor: { r: dr, g: dg, b: db },
      accentColor: { r, g, b },
      brightness,
      contrast,
      saturation,
      hue,
      warmth,
    };
  }

  /**
   * Create material config from color analysis
   */
  private createMaterialFromAnalysis(analysis: ColorAnalysis, elementType: string): InferredMaterial {
    const { brightness, contrast, saturation, warmth } = analysis;
    const { r, g, b } = analysis.accentColor;

    // Determine roughness from contrast (high contrast = rough)
    const roughness = 0.3 + contrast * 0.5; // 0.3 - 0.8 range

    // Determine metalness from saturation (low saturation = more metallic)
    const metalness = Math.max(0, 0.5 - saturation * 0.3); // 0.2 - 0.5 range

    // Emissive based on brightness
    const isEmissive = brightness > 0.6;
    const emissiveIntensity = isEmissive ? (brightness - 0.6) * 1.5 : 0;
    const emissiveColor = isEmissive ? ((r << 16) | (g << 8) | b) : 0x000000;

    const color = (r << 16) | (g << 8) | b;

    return {
      color,
      metalness,
      roughness,
      emissive: emissiveColor,
      emissiveIntensity,
      emissiveColor,
    };
  }
}
