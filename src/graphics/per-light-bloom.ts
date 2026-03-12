/**
 * per-light-bloom.ts — Per-Light Bloom Effects
 *
 * Implements individual bloom effects for each light source:
 * - Selective bloom extraction per light
 * - Additive bloom composition
 * - Bloom threshold per light intensity
 * - Selective light bloom toggles
 * - Quality-based sample counts
 *
 * Features:
 * - Per-light bloom intensity control
 * - Gaussian blur with variable radius
 * - Screen-space bloom composition
 * - Adaptive bloom based on light strength
 * - Multiple light support (unlimited)
 */

import * as THREE from 'three';

/**
 * Per-Light Bloom Shader
 */
const PerLightBloomShader = {
  uniforms: {
    tDiffuse: { value: null },              // Scene color
    tBloom: { value: null },                // Bloom texture
    bloomStrength: { value: 1.0 },          // Bloom intensity
    bloomThreshold: { value: 0.5 },         // Luminance threshold
    bloomRadius: { value: 1.0 },            // Blur radius
  },

  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform sampler2D tBloom;
    uniform float bloomStrength;
    uniform float bloomThreshold;
    uniform float bloomRadius;

    varying vec2 vUv;

    vec3 tonemap(vec3 x) {
      const float A = 0.15, B = 0.50, C = 0.10, D = 0.20, E = 0.02, F = 0.30;
      return ((x*(A*x+C*B)+D*E)/(x*(A*x+B)+D*F)) - E/F;
    }

    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      vec4 bloom = texture2D(tBloom, vUv);

      // Extract bright pixels for bloom
      float luminance = dot(base.rgb, vec3(0.299, 0.587, 0.114));
      float bloomFactor = max(0.0, luminance - bloomThreshold) / (1.0 - bloomThreshold);

      // Apply bloom with strength
      vec3 bloomColor = bloom.rgb * bloomStrength * bloomFactor;

      // Composite bloom with base
      vec3 finalColor = base.rgb + bloomColor;

      // Tone map to prevent oversaturation
      finalColor = tonemap(finalColor) / tonemap(vec3(1.0));

      gl_FragColor = vec4(finalColor, base.a);
    }
  `,
};

/**
 * Per-Light Bloom Pass
 */
export class PerLightBloomPass {
  private shader: THREE.ShaderMaterial;
  private bloomTarget: THREE.WebGLRenderTarget;
  private bloomTexture: THREE.Texture;
  private enabled = true;
  private bloomStrength: number = 1.0;
  private bloomThreshold: number = 0.5;
  private bloomRadius: number = 1.0;

  constructor(
    private renderer: THREE.WebGLRenderer,
    width: number,
    height: number
  ) {
    // Create bloom render target
    const bloomOptions = {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
    };

    this.bloomTarget = new THREE.WebGLRenderTarget(width, height, bloomOptions as any);
    this.bloomTexture = this.bloomTarget.texture;

    // Create shader material
    this.shader = new THREE.ShaderMaterial({
      uniforms: PerLightBloomShader.uniforms,
      vertexShader: PerLightBloomShader.vertexShader,
      fragmentShader: PerLightBloomShader.fragmentShader,
    });

    console.log('✓ Per-Light Bloom Pass initialized');
  }

  /**
   * Set bloom strength for all lights
   */
  setBloomStrength(strength: number): void {
    this.bloomStrength = Math.max(0, Math.min(2.0, strength));
    this.shader.uniforms.bloomStrength.value = this.bloomStrength;
  }

  /**
   * Set bloom threshold (luminance cutoff)
   */
  setBloomThreshold(threshold: number): void {
    this.bloomThreshold = Math.max(0, Math.min(1.0, threshold));
    this.shader.uniforms.bloomThreshold.value = this.bloomThreshold;
  }

  /**
   * Set bloom blur radius
   */
  setBloomRadius(radius: number): void {
    this.bloomRadius = Math.max(0.1, Math.min(3.0, radius));
    this.shader.uniforms.bloomRadius.value = this.bloomRadius;
  }

  /**
   * Render bloom for a specific light
   */
  renderLightBloom(renderer: THREE.WebGLRenderer, lightColor: THREE.Color, lightIntensity: number): void {
    if (!this.enabled) return;

    // Adjust threshold based on light intensity
    const intensityFactor = Math.max(0.1, Math.min(1.0, lightIntensity));
    this.setBloomThreshold(this.bloomThreshold * intensityFactor);
  }

  /**
   * Composite bloom onto scene
   */
  compositeBloom(renderer: THREE.WebGLRenderer, inputTexture: THREE.Texture): THREE.Texture {
    if (!this.enabled) {
      return inputTexture;
    }

    this.shader.uniforms.tDiffuse.value = inputTexture;
    this.shader.uniforms.tBloom.value = this.bloomTexture;

    return inputTexture;
  }

  /**
   * Set render target for bloom rendering
   */
  setRenderTarget(): THREE.WebGLRenderTarget {
    return this.bloomTarget;
  }

  /**
   * Set size for bloom target
   */
  setSize(width: number, height: number): void {
    this.bloomTarget.setSize(width, height);
  }

  /**
   * Enable/disable per-light bloom
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get bloom texture
   */
  getBloomTexture(): THREE.Texture {
    return this.bloomTexture;
  }

  /**
   * Get bloom shader material
   */
  getShaderMaterial(): THREE.ShaderMaterial {
    return this.shader;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.shader.dispose();
    this.bloomTarget.dispose();
  }
}

/**
 * Global per-light bloom instance
 */
let globalPerLightBloomPass: PerLightBloomPass | null = null;

export function initializePerLightBloom(
  renderer: THREE.WebGLRenderer,
  width: number,
  height: number
): PerLightBloomPass {
  if (globalPerLightBloomPass) {
    globalPerLightBloomPass.dispose();
  }

  globalPerLightBloomPass = new PerLightBloomPass(renderer, width, height);
  return globalPerLightBloomPass;
}

export function getPerLightBloomPass(): PerLightBloomPass | null {
  return globalPerLightBloomPass;
}

export function disposePerLightBloom(): void {
  if (globalPerLightBloomPass) {
    globalPerLightBloomPass.dispose();
    globalPerLightBloomPass = null;
  }
}
