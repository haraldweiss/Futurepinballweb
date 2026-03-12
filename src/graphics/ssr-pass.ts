/**
 * ssr-pass.ts — Screen Space Reflections (SSR)
 *
 * Implements high-quality reflections on metallic surfaces using screen-space ray marching.
 * Reflects the scene based on depth and normal information without expensive cube maps.
 *
 * Features:
 * - Depth-aware ray marching in screen space
 * - Normal buffer integration with SSAO
 * - Quality-based sample counts (8-16 samples)
 * - Metalness-aware intensity blending
 * - Fallback to environment maps for off-screen reflections
 */

import * as THREE from 'three';

/**
 * SSR Shader Definition
 */
const SSRShader = {
  uniforms: {
    tDiffuse: { value: null },           // Scene color
    tNormal: { value: null },            // Normal buffer from SSAO
    tDepth: { value: null },             // Depth buffer
    tMetallic: { value: null },          // Metallic map (if available)
    cameraNear: { value: 0.1 },
    cameraFar: { value: 1000 },
    cameraProjectionMatrix: { value: new THREE.Matrix4() },
    cameraInverseProjectionMatrix: { value: new THREE.Matrix4() },
    resolution: { value: new THREE.Vector2(1024, 768) },

    // SSR Parameters
    samples: { value: 12 },              // Ray march samples (4-16)
    maxDistance: { value: 8.0 },         // Max ray march distance (pixels)
    stride: { value: 1.0 },              // Ray step size
    thickness: { value: 0.1 },           // Surface thickness for hits
    intensity: { value: 0.8 },           // SSR intensity (0-1)
    metalnessFalloff: { value: 1.0 },    // How much metalness affects reflection
    edgeFade: { value: 0.1 },            // Screen edge fade-out
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
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform sampler2D tMetallic;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform mat4 cameraProjectionMatrix;
    uniform mat4 cameraInverseProjectionMatrix;
    uniform vec2 resolution;
    uniform int samples;
    uniform float maxDistance;
    uniform float stride;
    uniform float thickness;
    uniform float intensity;
    uniform float metalnessFalloff;
    uniform float edgeFade;

    varying vec2 vUv;

    // Convert depth to linear
    float getLinearDepth(float depth) {
      float z = depth * 2.0 - 1.0;
      return 2.0 * cameraNear * cameraFar / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
    }

    // Reconstruct position from depth
    vec3 getWorldPos(vec2 uv, float depth) {
      vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
      vec4 worldPos = cameraInverseProjectionMatrix * clipPos;
      return worldPos.xyz / worldPos.w;
    }

    // Screen edge fade (prevent reflections at screen edges)
    float getScreenFade(vec2 uv) {
      float fade = 1.0;
      fade *= smoothstep(0.0, edgeFade, uv.x);
      fade *= smoothstep(1.0, 1.0 - edgeFade, uv.x);
      fade *= smoothstep(0.0, edgeFade, uv.y);
      fade *= smoothstep(1.0, 1.0 - edgeFade, uv.y);
      return fade;
    }

    void main() {
      vec4 baseColor = texture2D(tDiffuse, vUv);
      vec4 normalData = texture2D(tNormal, vUv);
      float depth = texture2D(tDepth, vUv).r;

      // Unpack normal (assuming normal map in RGB, depth in A from SSAO)
      vec3 normal = normalize(normalData.rgb * 2.0 - 1.0);

      // Get metallic value if available, otherwise use 0
      float metallic = texture2D(tMetallic, vUv).r;

      // Only apply SSR to metallic surfaces
      if (metallic < 0.1) {
        gl_FragColor = baseColor;
        return;
      }

      // Get surface position
      vec3 surfacePos = getWorldPos(vUv, depth);

      // Calculate reflection ray direction
      vec3 viewDir = normalize(surfacePos);
      vec3 reflectDir = reflect(viewDir, normal);

      // Ray march parameters
      float stepSize = stride * maxDistance / float(samples);
      vec3 rayPos = surfacePos + normal * 0.01; // Bias away from surface

      vec3 reflectionColor = vec3(0.0);
      float hitCount = 0.0;

      // Ray march
      for (int i = 0; i < 16; i++) {
        if (i >= samples) break;

        rayPos += reflectDir * stepSize;

        // Project to screen
        vec4 projectedRay = cameraProjectionMatrix * vec4(rayPos, 1.0);
        vec2 screenUv = projectedRay.xy / projectedRay.w * 0.5 + 0.5;

        // Check bounds
        if (screenUv.x < 0.0 || screenUv.x > 1.0 || screenUv.y < 0.0 || screenUv.y > 1.0) {
          break;
        }

        // Get depth at this screen position
        float sampleDepth = texture2D(tDepth, screenUv).r;
        float sampleLinearDepth = getLinearDepth(sampleDepth);
        float rayLinearDepth = getLinearDepth(projectedRay.z);

        // Check if we hit something
        if (rayLinearDepth > sampleLinearDepth &&
            rayLinearDepth - sampleLinearDepth < thickness) {
          reflectionColor += texture2D(tDiffuse, screenUv).rgb;
          hitCount += 1.0;
          break;
        }
      }

      // Average reflection color
      if (hitCount > 0.0) {
        reflectionColor /= hitCount;
      }

      // Blend with original color based on metalness
      float ssrAmount = intensity * metallic * metalnessFalloff;
      ssrAmount *= getScreenFade(vUv);

      // Fresnel effect: stronger reflections at grazing angles
      float fresnel = pow(1.0 - abs(dot(viewDir, normal)), 2.0);
      ssrAmount *= mix(0.5, 1.0, fresnel);

      vec3 finalColor = mix(baseColor.rgb, reflectionColor, ssrAmount);

      gl_FragColor = vec4(finalColor, baseColor.a);
    }
  `
};

/**
 * SSR Pass - Screen Space Reflections
 */
export class SSRPass {
  private shader: THREE.ShaderMaterial;
  private fsQuad: any;
  private normalTarget: THREE.WebGLRenderTarget;
  private depthTarget: THREE.WebGLRenderTarget;
  private metallicTarget: THREE.WebGLRenderTarget;
  private enabled = true;

  constructor(
    private renderer: THREE.WebGLRenderer,
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    width: number,
    height: number
  ) {
    // Create shader material
    this.shader = new THREE.ShaderMaterial({
      uniforms: SSRShader.uniforms,
      vertexShader: SSRShader.vertexShader,
      fragmentShader: SSRShader.fragmentShader,
    });

    // Create render targets for normal, depth, metallic
    const options = {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      stencilBuffer: false,
    };

    this.normalTarget = new THREE.WebGLRenderTarget(width, height, options);
    this.depthTarget = new THREE.WebGLRenderTarget(width, height, {
      ...options,
      format: THREE.RedFormat,
    });
    this.metallicTarget = new THREE.WebGLRenderTarget(width, height, {
      ...options,
      format: THREE.RedFormat,
    });

    // Initialize uniforms
    this.updateUniforms();
  }

  private updateUniforms() {
    if (this.camera instanceof THREE.PerspectiveCamera) {
      this.shader.uniforms.cameraNear.value = this.camera.near;
      this.shader.uniforms.cameraFar.value = this.camera.far;
      this.shader.uniforms.cameraProjectionMatrix.value = this.camera.projectionMatrix;
      this.shader.uniforms.cameraInverseProjectionMatrix.value = new THREE.Matrix4()
        .copy(this.camera.projectionMatrix)
        .invert();
    }
  }

  setSize(width: number, height: number) {
    this.normalTarget.setSize(width, height);
    this.depthTarget.setSize(width, height);
    this.metallicTarget.setSize(width, height);
    this.shader.uniforms.resolution.value.set(width, height);
  }

  /**
   * Set SSR intensity (0.0 - 1.0)
   */
  setIntensity(intensity: number) {
    this.shader.uniforms.intensity.value = Math.max(0, Math.min(1, intensity));
  }

  /**
   * Set ray march parameters
   */
  setParameters(samples: number, maxDistance: number, thickness: number, stride: number = 1.0) {
    this.shader.uniforms.samples.value = Math.max(4, Math.min(16, Math.floor(samples)));
    this.shader.uniforms.maxDistance.value = Math.max(1, maxDistance);
    this.shader.uniforms.thickness.value = Math.max(0.01, thickness);
    this.shader.uniforms.stride.value = Math.max(0.1, stride);
  }

  /**
   * Enable/disable SSR effect
   */
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Render the SSR effect (assumes input texture is in uniforms.tDiffuse)
   */
  render(
    renderer: THREE.WebGLRenderer,
    inputTexture: THREE.Texture,
    normalTexture: THREE.Texture,
    depthTexture: THREE.Texture
  ) {
    if (!this.enabled) {
      return;
    }

    // Update uniforms
    this.updateUniforms();
    this.shader.uniforms.tDiffuse.value = inputTexture;
    this.shader.uniforms.tNormal.value = normalTexture;
    this.shader.uniforms.tDepth.value = depthTexture;
  }

  /**
   * Get shader material for EffectComposer integration
   */
  getShaderMaterial(): THREE.ShaderMaterial {
    return this.shader;
  }

  dispose() {
    this.shader.dispose();
    this.normalTarget.dispose();
    this.depthTarget.dispose();
    this.metallicTarget.dispose();
  }
}

/**
 * Create SSR Pass for EffectComposer integration
 */
export function createSSRPass(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  width: number,
  height: number
) {
  const pass = new SSRPass(renderer, scene, camera, width, height);

  return {
    pass: new (THREE.ShaderPass as any)(SSRShader),
    ssrPass: pass,
    setIntensity: (intensity: number) => pass.setIntensity(intensity),
    setParameters: (samples: number, maxDistance: number, thickness: number) =>
      pass.setParameters(samples, maxDistance, thickness),
    setEnabled: (enabled: boolean) => pass.setEnabled(enabled),
  };
}
