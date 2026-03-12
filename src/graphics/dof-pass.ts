/**
 * dof-pass.ts — Depth of Field (Optional, Performance-Gated)
 *
 * Implements cinematic depth-of-field with focus tracking:
 * - CoC (Circle of Confusion) calculation from depth
 * - Bokeh sampling with adaptive quality
 * - Ball position tracking for dynamic focus
 * - Autofocus zone configuration
 * - Device capability detection
 * - Graceful fallback on unsupported devices
 *
 * Features:
 * - Physically-based depth of field
 * - Adaptive sample count (4-16 based on quality)
 * - Focus distance auto-tracking (ball position)
 * - Aperture control (bokeh size)
 * - Device capability detection
 * - Performance-gated (ultra-only)
 */

import * as THREE from 'three';

/**
 * Depth of Field Shader - Bokeh-based DoF with adaptive sampling
 */
const DepthOfFieldShader = {
  uniforms: {
    tDiffuse: { value: null },              // Scene color
    tDepth: { value: null },                // Depth buffer
    focusDistance: { value: 5.0 },          // Focus plane distance (world units)
    aperture: { value: 0.5 },               // Aperture size (affects bokeh)
    maxBlur: { value: 1.0 },                // Maximum blur radius
    samples: { value: 8 },                  // Bokeh samples (4-16)
    cameraNear: { value: 0.1 },
    cameraFar: { value: 1000.0 },
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
    uniform sampler2D tDepth;
    uniform float focusDistance;
    uniform float aperture;
    uniform float maxBlur;
    uniform int samples;
    uniform float cameraNear;
    uniform float cameraFar;

    varying vec2 vUv;

    // Convert depth to linear
    float getLinearDepth(float depth) {
      float z = depth * 2.0 - 1.0;
      return 2.0 * cameraNear * cameraFar / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
    }

    // Bokeh pattern (Poisson disk distribution)
    const vec2 bokehPattern[16] = vec2[](
      vec2(0.0, 0.0),
      vec2(0.5, 0.2), vec2(-0.3, 0.5), vec2(0.1, -0.7), vec2(-0.6, -0.3),
      vec2(0.4, -0.5), vec2(-0.7, 0.1), vec2(0.2, 0.6), vec2(-0.5, -0.8),
      vec2(0.7, 0.4), vec2(-0.2, -0.6), vec2(0.6, -0.2), vec2(-0.4, 0.7),
      vec2(0.3, 0.3), vec2(-0.8, 0.5), vec2(0.8, -0.4)
    );

    void main() {
      float depth = getLinearDepth(texture2D(tDepth, vUv).r);

      // Calculate circle of confusion (CoC)
      float coc = aperture * abs(depth - focusDistance) / depth;
      coc = clamp(coc, 0.0, maxBlur);

      vec3 color = vec3(0.0);
      float totalWeight = 0.0;

      // Bokeh sampling
      for (int i = 0; i < 16; i++) {
        if (i >= samples) break;

        vec2 offset = bokehPattern[i] * coc;
        vec2 sampleUv = vUv + offset * 0.01;

        // Boundary check
        if (sampleUv.x < 0.0 || sampleUv.x > 1.0 || sampleUv.y < 0.0 || sampleUv.y > 1.0) {
          continue;
        }

        vec4 sampleColor = texture2D(tDiffuse, sampleUv);
        float sampleDepth = getLinearDepth(texture2D(tDepth, sampleUv).r);

        // Weight by depth similarity
        float weight = 1.0 - abs(sampleDepth - depth) * 0.1;
        weight = max(0.0, weight);

        color += sampleColor.rgb * weight;
        totalWeight += weight;
      }

      // Normalize by weight
      if (totalWeight > 0.0) {
        color /= totalWeight;
      } else {
        color = texture2D(tDiffuse, vUv).rgb;
      }

      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

/**
 * Depth of Field Pass
 */
export class DepthOfFieldPass {
  private shader: THREE.ShaderMaterial;
  private enabled = false;
  private focusDistance: number = 5.0;
  private aperture: number = 0.5;
  private maxBlur: number = 1.0;
  private samples: number = 8;
  private isSupported: boolean = true;
  private ballPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private autoFocus: boolean = true;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private camera: THREE.PerspectiveCamera
  ) {
    // Detect device capability (disable on low-end devices)
    this.isSupported = this.detectSupport();

    if (!this.isSupported) {
      console.warn('⚠️  DoF not supported on this device (ES3 limitation)');
      return;
    }

    // Create shader material
    this.shader = new THREE.ShaderMaterial({
      uniforms: DepthOfFieldShader.uniforms,
      vertexShader: DepthOfFieldShader.vertexShader,
      fragmentShader: DepthOfFieldShader.fragmentShader,
    });

    // Set initial camera values
    this.updateCameraUniforms();

    console.log('✓ Depth of Field Pass initialized');
  }

  /**
   * Detect device capability for DoF
   */
  private detectSupport(): boolean {
    const gl = this.renderer.getContext() as WebGLRenderingContext;
    if (!gl) return false;

    // Check for required WebGL2/ES3 features
    const isWebGL2 = gl instanceof WebGL2RenderingContext;
    const hasFloatTexture = !!gl.getExtension('OES_texture_float');
    const hasDepthTexture = !!gl.getExtension('WEBGL_depth_texture');

    return isWebGL2 && hasFloatTexture && hasDepthTexture;
  }

  /**
   * Update camera-dependent uniforms
   */
  private updateCameraUniforms(): void {
    if (!this.shader) return;  // DoF not supported on this device
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.shader.uniforms.cameraNear.value = this.camera.near;
      this.shader.uniforms.cameraFar.value = this.camera.far;
    }
  }

  /**
   * Set focus distance (world units)
   */
  setFocusDistance(distance: number): void {
    if (!this.shader) return;  // DoF not supported on this device
    this.focusDistance = Math.max(0.1, distance);
    this.shader.uniforms.focusDistance.value = this.focusDistance;
  }

  /**
   * Set aperture (affects bokeh size)
   */
  setAperture(aperture: number): void {
    if (!this.shader) return;  // DoF not supported on this device
    this.aperture = Math.max(0.1, Math.min(2.0, aperture));
    this.shader.uniforms.aperture.value = this.aperture;
  }

  /**
   * Set maximum blur radius
   */
  setMaxBlur(maxBlur: number): void {
    if (!this.shader) return;  // DoF not supported on this device
    this.maxBlur = Math.max(0.1, Math.min(2.0, maxBlur));
    this.shader.uniforms.maxBlur.value = this.maxBlur;
  }

  /**
   * Set bokeh sample count
   */
  setSamples(samples: number): void {
    if (!this.shader) return;  // DoF not supported on this device
    this.samples = Math.max(4, Math.min(16, Math.floor(samples)));
    this.shader.uniforms.samples.value = this.samples;
  }

  /**
   * Set ball position for autofocus
   */
  setBallPosition(position: THREE.Vector3): void {
    this.ballPosition.copy(position);

    // Auto-focus on ball if enabled
    if (this.autoFocus) {
      const distanceToBall = this.camera.position.distanceTo(position);
      this.setFocusDistance(Math.max(0.5, distanceToBall));
    }
  }

  /**
   * Enable/disable autofocus
   */
  setAutoFocus(enabled: boolean): void {
    this.autoFocus = enabled;
  }

  /**
   * Set quality preset
   */
  setQualityPreset(preset: 'low' | 'medium' | 'high' | 'ultra'): void {
    if (!this.isSupported) return;

    const presetConfig = {
      'low': { samples: 4, aperture: 0.3, maxBlur: 0.5 },
      'medium': { samples: 4, aperture: 0.3, maxBlur: 0.5 },
      'high': { samples: 4, aperture: 0.3, maxBlur: 0.5 },
      'ultra': { samples: 8, aperture: 0.5, maxBlur: 1.0 },
    };

    const config = presetConfig[preset];
    this.setSamples(config.samples);
    this.setAperture(config.aperture);
    this.setMaxBlur(config.maxBlur);
  }

  /**
   * Enable/disable DoF
   */
  setEnabled(enabled: boolean): void {
    if (!this.isSupported) {
      this.enabled = false;
      return;
    }
    this.enabled = enabled;
  }

  /**
   * Get whether DoF is supported
   */
  isDeviceSupported(): boolean {
    return this.isSupported;
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
 * Global DoF instance
 */
let globalDoFPass: DepthOfFieldPass | null = null;

export function initializeDepthOfField(
  renderer: THREE.WebGLRenderer,
  camera: THREE.PerspectiveCamera
): DepthOfFieldPass {
  if (globalDoFPass) {
    globalDoFPass.dispose();
  }

  globalDoFPass = new DepthOfFieldPass(renderer, camera);
  return globalDoFPass;
}

export function getDepthOfFieldPass(): DepthOfFieldPass | null {
  return globalDoFPass;
}

export function disposeDepthOfField(): void {
  if (globalDoFPass) {
    globalDoFPass.dispose();
    globalDoFPass = null;
  }
}
