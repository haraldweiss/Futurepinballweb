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
  inferMaterialProperties(texture: THREE.Texture, elementType: 'playfield' | 'bumper' | 'target' | 'ramp' = 'playfield'): InferredMaterial {
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

    // Create canvas from image
    const canvas = document.createElement('canvas');
    canvas.width = image.width || 512;
    canvas.height = image.height || 512;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');

    if (image instanceof HTMLImageElement) {
      ctx.drawImage(image, 0, 0);
    } else {
      // Handle other image types
      const imgData = ctx.createImageData(canvas.width, canvas.height);
      ctx.putImageData(imgData, 0, 0);
    }

    return canvas;
  }

  /**
   * Analyze canvas pixel data
   */
  private analyzeCanvas(canvas: HTMLCanvasElement): ColorAnalysis {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Sample 100 random pixels instead of all (performance)
    const sampleSize = Math.min(100, Math.floor(data.length / 4));
    const samples: { r: number; g: number; b: number; a: number }[] = [];

    for (let i = 0; i < sampleSize; i++) {
      const pixelIdx = Math.floor(Math.random() * (data.length / 4)) * 4;
      samples.push({
        r: data[pixelIdx],
        g: data[pixelIdx + 1],
        b: data[pixelIdx + 2],
        a: data[pixelIdx + 3],
      });
    }

    return this.processPixelSamples(samples);
  }

  /**
   * Process pixel samples to extract color analysis
   */
  private processPixelSamples(samples: { r: number; g: number; b: number; a: number }[]): ColorAnalysis {
    // Calculate averages
    let avgR = 0, avgG = 0, avgB = 0;
    let minR = 255, minG = 255, minB = 255;
    let maxR = 0, maxG = 0, maxB = 0;

    for (const sample of samples) {
      avgR += sample.r;
      avgG += sample.g;
      avgB += sample.b;

      minR = Math.min(minR, sample.r);
      minG = Math.min(minG, sample.g);
      minB = Math.min(minB, sample.b);

      maxR = Math.max(maxR, sample.r);
      maxG = Math.max(maxG, sample.g);
      maxB = Math.max(maxB, sample.b);
    }

    avgR /= samples.length;
    avgG /= samples.length;
    avgB /= samples.length;

    // Brightness (luminance)
    const brightness = (0.299 * avgR + 0.587 * avgG + 0.114 * avgB) / 255;

    // Contrast (normalized range)
    const rangeR = (maxR - minR) / 255;
    const rangeG = (maxG - minG) / 255;
    const rangeB = (maxB - minB) / 255;
    const contrast = (rangeR + rangeG + rangeB) / 3;

    // HSV for saturation and hue
    const hsvDominant = this.rgbToHsv(avgR, avgG, avgB);
    const saturation = hsvDominant.s;
    const hue = hsvDominant.h;

    // Warmth: -1 (cool/blue) to +1 (warm/red)
    const warmth = (avgR - avgB) / 255;

    // Identify accent color (brightest sample)
    let accentSample = samples[0];
    for (const sample of samples) {
      const accentBrightness = 0.299 * sample.r + 0.587 * sample.g + 0.114 * sample.b;
      const currentBrightness = 0.299 * accentSample.r + 0.587 * accentSample.g + 0.114 * accentSample.b;
      if (accentBrightness > currentBrightness) {
        accentSample = sample;
      }
    }

    return {
      dominantColor: {
        r: Math.round(avgR) / 255,
        g: Math.round(avgG) / 255,
        b: Math.round(avgB) / 255,
      },
      accentColor: {
        r: accentSample.r / 255,
        g: accentSample.g / 255,
        b: accentSample.b / 255,
      },
      brightness,
      contrast,
      saturation,
      hue,
      warmth,
    };
  }

  /**
   * Convert RGB to HSV
   */
  private rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
      if (max === r) {
        h = 60 * (((g - b) / delta) % 6);
      } else if (max === g) {
        h = 60 * ((b - r) / delta + 2);
      } else {
        h = 60 * ((r - g) / delta + 4);
      }
    }
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : delta / max;
    const v = max;

    return { h, s, v };
  }

  /**
   * Create material properties from texture analysis
   */
  private createMaterialFromAnalysis(analysis: ColorAnalysis, elementType: string): InferredMaterial {
    // Base rules for all materials
    let metalness = 0.2;      // Default: slightly metallic
    let roughness = 0.6;      // Default: matte
    let emissiveIntensity = 0;
    let emissiveColor: number | undefined = undefined;

    // High contrast surfaces are shinier
    if (analysis.contrast > 0.7) {
      roughness = Math.max(0.2, roughness - 0.2);
      metalness = Math.min(0.8, metalness + 0.2);
    }

    // Bright surfaces are less metallic (diffuse)
    if (analysis.brightness > 0.7) {
      metalness = Math.max(0.05, metalness - 0.15);
      roughness = Math.min(0.85, roughness + 0.1);
    }

    // Dark surfaces reflect better
    if (analysis.brightness < 0.3) {
      metalness = Math.min(0.9, metalness + 0.3);
      roughness = Math.max(0.1, roughness - 0.2);
    }

    // Warm colors (red/orange) get slight metalness boost
    if (analysis.warmth > 0.3) {
      metalness = Math.min(0.9, metalness + 0.1);
    }

    // Saturated colors indicate emissive materials
    if (analysis.saturation > 0.6) {
      emissiveIntensity = 0.3 + analysis.saturation * 0.2;

      // Use accent color for emissive
      const accentColor = analysis.accentColor;
      const hex = this.rgbToHex(accentColor.r, accentColor.g, accentColor.b);
      emissiveColor = parseInt(hex, 16);
    }

    // Element-specific adjustments
    switch (elementType) {
      case 'playfield':
        // Playfronts are typically less metallic, more rough
        metalness *= 0.8;
        roughness += 0.1;
        break;

      case 'bumper':
        // Bumpers are reflective
        metalness = Math.min(0.95, metalness + 0.3);
        roughness = Math.max(0.1, roughness - 0.3);
        emissiveIntensity = Math.max(emissiveIntensity, 0.4);
        break;

      case 'target':
        // Targets have moderate reflectivity
        metalness = Math.min(0.8, metalness + 0.2);
        roughness = Math.max(0.15, roughness - 0.2);
        break;

      case 'ramp':
        // Ramps are smooth but not shiny
        roughness = Math.max(0.4, roughness - 0.2);
        metalness *= 0.6;
        break;
    }

    // Clamp values to valid ranges
    metalness = Math.max(0, Math.min(1, metalness));
    roughness = Math.max(0, Math.min(1, roughness));
    emissiveIntensity = Math.max(0, Math.min(1, emissiveIntensity));

    // Get dominant color as hex
    const dominantColor = this.rgbToHex(
      analysis.dominantColor.r,
      analysis.dominantColor.g,
      analysis.dominantColor.b
    );

    return {
      color: parseInt(dominantColor, 16),
      metalness,
      roughness,
      emissive: emissiveColor ?? parseInt(dominantColor, 16),
      emissiveIntensity,
      emissiveColor,
    };
  }

  /**
   * Convert RGB (0-1) to hex color string
   */
  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
      const hex = Math.round(n * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };
    return '0x' + toHex(r) + toHex(g) + toHex(b);
  }

  /**
   * Analyze dominant colors for environment mapping
   */
  analyzeDominantColors(texture: THREE.Texture): { primary: THREE.Color; accent: THREE.Color } {
    const analysis = this.analyzeTexture(texture);

    const primary = new THREE.Color(
      analysis.dominantColor.r,
      analysis.dominantColor.g,
      analysis.dominantColor.b
    );

    const accent = new THREE.Color(
      analysis.accentColor.r,
      analysis.accentColor.g,
      analysis.accentColor.b
    );

    return { primary, accent };
  }

  /**
   * Clear caches to free memory
   */
  clearCache(): void {
    this.colorCache.clear();
    this.materialCache.clear();
  }
}

// Singleton instance
let analyzerInstance: TextureAnalyzer | null = null;

export function getTextureAnalyzer(): TextureAnalyzer {
  if (!analyzerInstance) {
    analyzerInstance = new TextureAnalyzer();
  }
  return analyzerInstance;
}
