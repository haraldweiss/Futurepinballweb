/**
 * ssao-pass.ts — Screen-Space Ambient Occlusion (SSAO) for Playfield Enhancement
 *
 * Provides realistic shadowing in crevices and contact points to improve visual depth.
 * Particularly effective for bumpers, targets, ramps, and playfield surface details.
 */

import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ──────────────────────────────────────────────────────────────────────────
// SSAO Shader Configuration
// ──────────────────────────────────────────────────────────────────────────

const SSAOShader = {
  uniforms: {
    tDiffuse: { value: null },
    tNormal: { value: null },
    tDepth: { value: null },
    resolution: { value: new THREE.Vector2(800, 600) },
    kernel: { value: [] },
    radius: { value: 0.5 },
    intensity: { value: 1.0 },
    bias: { value: 0.01 },
    samples: { value: 8 },
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
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform vec2 resolution;
    uniform float radius;
    uniform float intensity;
    uniform float bias;
    uniform int samples;

    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec3 normal = normalize(texture2D(tNormal, vUv).rgb * 2.0 - 1.0);
      float depth = texture2D(tDepth, vUv).r;

      float occlusion = 0.0;
      float pixelSize = 1.0 / resolution.x;

      // Sample occlusion in a circular pattern
      for (int i = 0; i < 16; i++) {
        if (i >= samples) break;

        float angle = float(i) * 6.28318 / float(samples);
        float dist = (float(i) + 1.0) / float(samples);

        vec2 offset = vec2(cos(angle), sin(angle)) * dist * radius * pixelSize;
        vec2 sampleUv = vUv + offset;

        float sampleDepth = texture2D(tDepth, sampleUv).r;
        float depthDiff = depth - sampleDepth;

        if (depthDiff > bias && depthDiff < radius) {
          occlusion += 1.0;
        }
      }

      occlusion = clamp(occlusion / float(samples), 0.0, 1.0);
      occlusion = mix(occlusion, 0.0, 0.3); // Reduce effect strength
      float ao = 1.0 - (occlusion * intensity);

      gl_FragColor = color * vec4(vec3(ao), 1.0);
    }
  `,
};

/**
 * SSAOPass — Screen-Space Ambient Occlusion effect for playfield depth
 */
export class SSAOPass extends ShaderPass {
  private renderTargetNormal: THREE.WebGLRenderTarget;
  private renderTargetDepth: THREE.WebGLRenderTarget;
  private normalMaterial: THREE.ShaderMaterial;
  private depthMaterial: THREE.ShaderMaterial;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;

  private _radius: number = 0.5;
  private _intensity: number = 1.0;
  private _bias: number = 0.01;
  private _samples: number = 8;

  constructor(scene: THREE.Scene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
    super(SSAOShader);

    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    // Setup render targets for normal and depth
    const width = renderer.domElement.clientWidth || 800;
    const height = renderer.domElement.clientHeight || 600;

    this.renderTargetNormal = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      magFilter: THREE.NearestFilter,
      minFilter: THREE.NearestFilter,
    });

    this.renderTargetDepth = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RedFormat,
      type: THREE.FloatType,
      magFilter: THREE.NearestFilter,
      minFilter: THREE.NearestFilter,
    });

    // Materials for rendering normals and depth
    this.normalMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          gl_FragColor = vec4(normalize(vNormal) * 0.5 + 0.5, 1.0);
        }
      `,
    });

    this.depthMaterial = new THREE.ShaderMaterial({
      uniforms: {
        cameraNear: { value: camera.near },
        cameraFar: { value: camera.far },
      },
      vertexShader: `
        void main() {
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float cameraNear;
        uniform float cameraFar;
        void main() {
          float depth = gl_FragCoord.z;
          depth = (depth - cameraNear) / (cameraFar - cameraNear);
          gl_FragColor = vec4(vec3(depth), 1.0);
        }
      `,
    });

    this.uniforms.resolution.value.set(width, height);
    this.uniforms.radius.value = this._radius;
    this.uniforms.intensity.value = this._intensity;
    this.uniforms.bias.value = this._bias;
    this.uniforms.samples.value = this._samples;
  }

  /**
   * Render pass: Generate SSAO
   */
  render(renderer: THREE.WebGLRenderer, writeBuffer: THREE.WebGLRenderTarget, readBuffer: THREE.WebGLRenderTarget): void {
    // Render normals
    const originalClearColor = renderer.getClearColor(new THREE.Color());
    const originalClearAlpha = renderer.getClearAlpha();
    renderer.setClearColor(0x000000, 1);
    renderer.setRenderTarget(this.renderTargetNormal);
    renderer.clear();

    const originalOverrideMaterial = this.scene.overrideMaterial;
    this.scene.overrideMaterial = this.normalMaterial;
    renderer.render(this.scene, this.camera);
    this.scene.overrideMaterial = originalOverrideMaterial;

    // Render depth
    renderer.setRenderTarget(this.renderTargetDepth);
    renderer.clear();

    this.scene.overrideMaterial = this.depthMaterial;
    renderer.render(this.scene, this.camera);
    this.scene.overrideMaterial = originalOverrideMaterial;

    // Apply SSAO shader
    this.uniforms.tDiffuse.value = readBuffer.texture;
    this.uniforms.tNormal.value = this.renderTargetNormal.texture;
    this.uniforms.tDepth.value = this.renderTargetDepth.texture;

    renderer.setRenderTarget(writeBuffer);
    renderer.setClearColor(originalClearColor, originalClearAlpha);
    renderer.render(this.scene, this.camera, writeBuffer);
  }

  /**
   * Set SSAO radius (affects occlusion falloff distance)
   */
  setRadius(value: number): void {
    this._radius = value;
    this.uniforms.radius.value = value;
  }

  /**
   * Set SSAO intensity (0-2, higher = more prominent)
   */
  setIntensity(value: number): void {
    this._intensity = value;
    this.uniforms.intensity.value = value;
  }

  /**
   * Set SSAO bias (prevents over-occlusion from nearby surfaces)
   */
  setBias(value: number): void {
    this._bias = value;
    this.uniforms.bias.value = value;
  }

  /**
   * Set number of occlusion samples (4, 8, 16, higher = better quality but slower)
   */
  setSamples(value: number): void {
    this._samples = Math.max(4, Math.min(16, value));
    this.uniforms.samples.value = this._samples;
  }

  /**
   * Adjust based on quality preset
   */
  setQualityPreset(preset: 'low' | 'medium' | 'high' | 'ultra'): void {
    switch (preset) {
      case 'low':
        this.setRadius(0.25);
        this.setIntensity(0.12);     // Further reduced: prevents SSAO from darkening low/medium displays
        this.setSamples(4);
        break;
      case 'medium':
        this.setRadius(0.4);
        this.setIntensity(0.25);     // Further reduced: preserves playfield visibility
        this.setSamples(8);
        break;
      case 'high':
        this.setRadius(0.55);
        this.setIntensity(0.35);     // Further reduced: maintains depth without excessive darkening
        this.setSamples(12);
        break;
      case 'ultra':
        this.setRadius(0.7);
        this.setIntensity(0.45);     // Further reduced: high quality without darkening artifacts
        this.setSamples(16);
        break;
    }
  }

  /**
   * Handle window resize
   */
  setSize(width: number, height: number): void {
    this.renderTargetNormal.setSize(width, height);
    this.renderTargetDepth.setSize(width, height);
    this.uniforms.resolution.value.set(width, height);
  }

  /**
   * Cleanup
   */
  dispose(): void {
    this.renderTargetNormal.dispose();
    this.renderTargetDepth.dispose();
    this.normalMaterial.dispose();
    this.depthMaterial.dispose();
    super.dispose();
  }
}
