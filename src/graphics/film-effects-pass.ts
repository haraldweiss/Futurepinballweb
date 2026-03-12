/**
 * film-effects-pass.ts — Film Effects (Grain + Chromatic Aberration + Distortion)
 *
 * Implements cinematic post-processing effects:
 * - Film grain with temporal coherence
 * - Chromatic aberration (RGB channel separation)
 * - Screen distortion waves
 * - Event-triggered effects
 * - Quality-based scaling
 *
 * Features:
 * - 3D noise-based film grain
 * - Temporal coherence for smooth grain animation
 * - Per-event aberration triggers
 * - Wave distortion with decay
 * - Per-event intensity control
 * - Quality-based effect scaling
 */

import * as THREE from 'three';

/**
 * Film Effects Shader - Combined grain, aberration, and distortion
 */
const FilmEffectsShader = {
  uniforms: {
    tDiffuse: { value: null },                  // Scene color
    time: { value: 0.0 },                       // Animation time
    grainIntensity: { value: 0.15 },           // Film grain strength (0.0-0.3)
    chromaticAberrationAmount: { value: 0.0 }, // Aberration intensity
    distortionAmount: { value: 0.0 },          // Wave distortion intensity
    distortionFrequency: { value: 1.0 },       // Wave frequency
  },

  vertexShader: `
    varying vec2 vUv;

    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    #include <common>

    uniform sampler2D tDiffuse;
    uniform float time;
    uniform float grainIntensity;
    uniform float chromaticAberrationAmount;
    uniform float distortionAmount;
    uniform float distortionFrequency;

    varying vec2 vUv;

    // Pseudo-random noise function
    float noise(vec3 p) {
      return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453);
    }

    // 3D noise for temporal coherence
    float perlinNoise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      f = f * f * (3.0 - 2.0 * f);

      float n000 = noise(i);
      float n100 = noise(i + vec3(1.0, 0.0, 0.0));
      float n010 = noise(i + vec3(0.0, 1.0, 0.0));
      float n110 = noise(i + vec3(1.0, 1.0, 0.0));
      float n001 = noise(i + vec3(0.0, 0.0, 1.0));
      float n101 = noise(i + vec3(1.0, 0.0, 1.0));
      float n011 = noise(i + vec3(0.0, 1.0, 1.0));
      float n111 = noise(i + vec3(1.0, 1.0, 1.0));

      float nx0 = mix(n000, n100, f.x);
      float nx1 = mix(n010, n110, f.x);
      float nxy0 = mix(nx0, nx1, f.y);

      float nx0z = mix(n001, n101, f.x);
      float nx1z = mix(n011, n111, f.x);
      float nxyz = mix(nx0z, nx1z, f.y);

      return mix(nxy0, nxyz, f.z);
    }

    // Film grain effect
    float getFilmGrain(vec2 uv) {
      return perlinNoise(vec3(uv * 100.0, time * 0.5)) - 0.5;
    }

    // Screen distortion wave
    vec2 getDistortion(vec2 uv) {
      float wave = sin(uv.y * distortionFrequency * 6.28 + time * 3.0) * distortionAmount;
      return vec2(wave, 0.0);
    }

    void main() {
      vec2 uv = vUv;

      // Apply screen distortion
      uv += getDistortion(uv);

      // Sample with chromatic aberration
      vec3 color = vec3(0.0);

      if (chromaticAberrationAmount > 0.0) {
        // Separate RGB channels
        float aberration = chromaticAberrationAmount * 0.01;

        color.r = texture2D(tDiffuse, uv + vec2(aberration, 0.0)).r;
        color.g = texture2D(tDiffuse, uv).g;
        color.b = texture2D(tDiffuse, uv - vec2(aberration, 0.0)).b;
      } else {
        color = texture2D(tDiffuse, uv).rgb;
      }

      // Apply film grain
      float grain = getFilmGrain(uv) * grainIntensity;
      color += grain;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

/**
 * Film Effects Pass
 */
export class FilmEffectsPass {
  private shader: THREE.ShaderMaterial;
  private enabled = true;
  private grainIntensity: number = 0.15;
  private chromaticAberrationEnabled = false;
  private distortionEnabled = false;
  private aberrationIntensity = 0.0;
  private distortionIntensity = 0.0;
  private distortionDecay = 0.95;
  private time: number = 0;

  constructor(private renderer: THREE.WebGLRenderer) {
    // Create shader material
    this.shader = new THREE.ShaderMaterial({
      uniforms: FilmEffectsShader.uniforms,
      vertexShader: FilmEffectsShader.vertexShader,
      fragmentShader: FilmEffectsShader.fragmentShader,
    });

    console.log('✓ Film Effects Pass initialized');
  }

  /**
   * Update shader time for animation
   */
  update(deltaTime: number): void {
    this.time += deltaTime;
    this.shader.uniforms.time.value = this.time;

    // Decay aberration and distortion over time
    if (this.aberrationIntensity > 0) {
      this.aberrationIntensity *= this.distortionDecay;
      this.shader.uniforms.chromaticAberrationAmount.value = this.aberrationIntensity;
    }

    if (this.distortionIntensity > 0) {
      this.distortionIntensity *= this.distortionDecay;
      this.shader.uniforms.distortionAmount.value = this.distortionIntensity;
    }
  }

  /**
   * Set film grain intensity
   */
  setGrainIntensity(intensity: number): void {
    this.grainIntensity = Math.max(0, Math.min(0.3, intensity));
    this.shader.uniforms.grainIntensity.value = this.grainIntensity;
  }

  /**
   * Trigger chromatic aberration effect
   */
  triggerChromaticAberration(intensity: number = 3.0, duration: number = 0.3): void {
    if (!this.chromaticAberrationEnabled) return;

    this.aberrationIntensity = intensity;
    this.distortionDecay = Math.pow(0.01, 1 / (duration * 60)); // Decay to near-zero over duration
    this.shader.uniforms.chromaticAberrationAmount.value = this.aberrationIntensity;
  }

  /**
   * Trigger screen distortion wave
   */
  triggerScreenDistortion(intensity: number = 0.05, duration: number = 0.5): void {
    if (!this.distortionEnabled) return;

    this.distortionIntensity = intensity;
    this.distortionDecay = Math.pow(0.01, 1 / (duration * 60)); // Decay over duration
    this.shader.uniforms.distortionAmount.value = this.distortionIntensity;
  }

  /**
   * Enable/disable chromatic aberration
   */
  setAberrationEnabled(enabled: boolean): void {
    this.chromaticAberrationEnabled = enabled;
    if (!enabled) {
      this.aberrationIntensity = 0;
      this.shader.uniforms.chromaticAberrationAmount.value = 0;
    }
  }

  /**
   * Enable/disable screen distortion
   */
  setDistortionEnabled(enabled: boolean): void {
    this.distortionEnabled = enabled;
    if (!enabled) {
      this.distortionIntensity = 0;
      this.shader.uniforms.distortionAmount.value = 0;
    }
  }

  /**
   * Set quality preset
   */
  setQualityPreset(preset: 'low' | 'medium' | 'high' | 'ultra'): void {
    const presetConfig = {
      'low': { grain: 0.05, aberration: false, distortion: false },
      'medium': { grain: 0.1, aberration: false, distortion: false },
      'high': { grain: 0.15, aberration: true, distortion: false },
      'ultra': { grain: 0.2, aberration: true, distortion: true },
    };

    const config = presetConfig[preset];
    this.setGrainIntensity(config.grain);
    this.setAberrationEnabled(config.aberration);
    this.setDistortionEnabled(config.distortion);
  }

  /**
   * Enable/disable film effects
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Get shader material for EffectComposer
   */
  getShaderMaterial(): THREE.ShaderMaterial {
    return this.shader;
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.shader.dispose();
  }
}

/**
 * Global film effects instance
 */
let globalFilmEffectsPass: FilmEffectsPass | null = null;

export function initializeFilmEffects(renderer: THREE.WebGLRenderer): FilmEffectsPass {
  if (globalFilmEffectsPass) {
    globalFilmEffectsPass.dispose();
  }

  globalFilmEffectsPass = new FilmEffectsPass(renderer);
  return globalFilmEffectsPass;
}

export function getFilmEffectsPass(): FilmEffectsPass | null {
  return globalFilmEffectsPass;
}

export function disposeFilmEffects(): void {
  if (globalFilmEffectsPass) {
    globalFilmEffectsPass.dispose();
    globalFilmEffectsPass = null;
  }
}
