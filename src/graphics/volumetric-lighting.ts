import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/**
 * VolumetricLighting - Shader-based god rays / volumetric lighting effect
 * Creates atmospheric light rays from the main spotlight
 */

const VolumetricLightingShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    lightPosition: { value: new THREE.Vector3(0, 14, 16) },
    screenSize: { value: new THREE.Vector2(1, 1) },
    density: { value: 0.8 },
    weight: { value: 0.4 },
    decay: { value: 0.95 },
    samples: { value: 32 },
    exposure: { value: 0.3 },
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
    uniform sampler2D tDepth;
    uniform vec3 lightPosition;
    uniform vec2 screenSize;
    uniform float density;
    uniform float weight;
    uniform float decay;
    uniform int samples;
    uniform float exposure;

    varying vec2 vUv;

    void main() {
      // Get base color
      vec4 baseColor = texture2D(tDiffuse, vUv);

      // Get depth at this pixel
      float depth = texture2D(tDepth, vUv).r;

      // Convert depth to linear (simplified)
      float linear_depth = (2.0 * 0.1) / (100.0 + 0.1 - depth * (100.0 - 0.1));

      // Calculate light contribution with volumetric rays
      vec3 light = vec3(0.0);

      // Sample ray from pixel towards light
      vec2 pixelCoord = vUv;
      vec2 lightScreen = lightPosition.xy / 2.0 + 0.5; // Convert to screen coords

      // Only apply volumetric lighting if light is on screen
      if (lightScreen.x > 0.0 && lightScreen.x < 1.0 && lightScreen.y > 0.0 && lightScreen.y < 1.0) {
        vec2 rayDir = (lightScreen - pixelCoord) / float(samples);
        vec2 sampleCoord = pixelCoord;

        float illumination = 1.0;

        for (int i = 0; i < 32; i++) {
          if (i >= samples) break;

          // Sample depth at ray position
          float sampleDepth = texture2D(tDepth, sampleCoord).r;
          float sampleLinearDepth = (2.0 * 0.1) / (100.0 + 0.1 - sampleDepth * (100.0 - 0.1));

          // If sample is in front of light, accumulate illumination
          if (sampleLinearDepth < 0.5) {
            illumination *= decay;
            light += illumination * vec3(1.0, 0.95, 0.9) * weight;
          }

          sampleCoord += rayDir;
        }

        // Apply exposure
        light *= exposure * density;
      }

      // Blend volumetric light with base
      gl_FragColor = baseColor + vec4(light, 0.0);
    }
  `,
};

export class VolumetricLightingPass extends ShaderPass {
  constructor(renderer: THREE.WebGLRenderer) {
    const shader = { ...VolumetricLightingShader };
    super(shader);
    // Note: uniforms are already inherited from ShaderPass via shader
    (this as any).renderToScreen = false;
  }

  /**
   * Update light position for shader
   */
  setLightPosition(x: number, y: number, z: number): void {
    (this.uniforms as any).lightPosition.value.set(x, y, z);
  }

  /**
   * Set volumetric effect parameters
   */
  setParameters(density: number, weight: number, decay: number, samples: number = 32): void {
    (this.uniforms as any).density.value = Math.max(0, Math.min(1, density));
    (this.uniforms as any).weight.value = Math.max(0, Math.min(1, weight));
    (this.uniforms as any).decay.value = Math.max(0, Math.min(1, decay));
    (this.uniforms as any).samples.value = Math.max(8, Math.min(64, samples));
  }

  /**
   * Set exposure (overall brightness)
   */
  setExposure(exposure: number): void {
    (this.uniforms as any).exposure.value = Math.max(0, Math.min(1, exposure));
  }

  /**
   * Update screen size for ray casting
   */
  setScreenSize(width: number, height: number): void {
    (this.uniforms as any).screenSize.value.set(width, height);
  }
}

export function createVolumetricLightingPass(renderer: THREE.WebGLRenderer): VolumetricLightingPass {
  return new VolumetricLightingPass(renderer);
}
