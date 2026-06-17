// SPDX-License-Identifier: AGPL-3.0-or-later
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { SSRPass } from '../graphics/ssr-pass';
import { MotionBlurPass } from '../graphics/motion-blur-pass';
import { CascadedShadowMapper, initializeCascadedShadows } from '../graphics/cascaded-shadows';
import { CascadedShadowCompositePass, initializeCascadedShadowComposite } from '../graphics/cascaded-shadow-composite-pass';
import { PerLightBloomPass, initializePerLightBloom } from '../graphics/per-light-bloom';
import { AdvancedParticleSystem, initializeParticleSystem } from '../graphics/advanced-particle-system';
import { createVolumetricLightingPass } from '../graphics/volumetric-lighting';
import { FilmEffectsPass, initializeFilmEffects } from '../graphics/film-effects-pass';
import { DepthOfFieldPass, initializeDepthOfField } from '../graphics/dof-pass';
import { initializeGraphicsPass } from '../graphics/pass-initializer';
import { initializeGraphicsPipeline, getGraphicsPipeline } from '../graphics/graphics-pipeline';
import { initializePlayfieldVisualEnhancement } from '../graphics/playfield-visual-enhancement';
import { initializeMetallicMaterials } from '../graphics/metallic-materials';
import { initializeVideoManager } from '../video-manager';
import { initializeVideoBinding } from '../mechanics/video-binding';

import type { PerformanceProfiler } from '../profiler';

export interface PostProcessingContext {
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
  ssrPass: SSRPass | null;
  motionBlurPass: MotionBlurPass | null;
  cascadedShadowMapper: CascadedShadowMapper | null;
  cascadedShadowCompositePass: CascadedShadowCompositePass | null;
  perLightBloomPass: PerLightBloomPass | null;
  particleSystem: AdvancedParticleSystem | null;
  volumetricPass: any;
  filmEffectsPass: FilmEffectsPass | null;
  dofPass: DepthOfFieldPass | null;
  smaaPass: SMAAPass;
  mainSpot: THREE.SpotLight | null;
  ambLight: THREE.AmbientLight | null;
  fillLight: THREE.PointLight | null;
  rimLight: THREE.DirectionalLight | null;
}

export function setupPostProcessing(
  scene: THREE.Scene,
  camera: THREE.Camera,
  renderer: THREE.WebGLRenderer,
  profiler: PerformanceProfiler,
): PostProcessingContext {
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const initPreset = profiler.getQualityPreset();

  const ssrPass: SSRPass | null = initializeGraphicsPass(
    'SSRPass',
    initPreset.ssrEnabled,
    () => new SSRPass(renderer, scene, camera, innerWidth, innerHeight),
    (pass) => {
      pass.setIntensity(initPreset.ssrIntensity);
      pass.setParameters(initPreset.ssrSamples, initPreset.ssrMaxDistance, 0.1);
      pass.setEnabled(true);
      const ssrShaderPass = new ShaderPass(pass.getShaderMaterial());
      composer.addPass(ssrShaderPass);
    }
  );

  const motionBlurPass: MotionBlurPass | null = initializeGraphicsPass(
    'MotionBlurPass',
    initPreset.motionBlurEnabled,
    () => new MotionBlurPass(renderer, innerWidth, innerHeight),
    (pass) => {
      pass.setIntensity(initPreset.motionBlurStrength);
      pass.setSamples(initPreset.motionBlurSamples);
      pass.setEnabled(true);
      const motionBlurShaderPass = new ShaderPass(pass.getShaderMaterial());
      composer.addPass(motionBlurShaderPass);
    }
  );

  const cascadedShadowMapper: CascadedShadowMapper | null = initializeGraphicsPass(
    'CascadedShadows',
    initPreset.cascadeShadowsEnabled,
    () =>
      initializeCascadedShadows(renderer, scene, camera as THREE.PerspectiveCamera, {
        cascadeCount: initPreset.cascadeCount,
        shadowMapSize: initPreset.cascadeShadowMapSize,
        lightDirection: new THREE.Vector3(0.5, -1, 0.5).normalize(),
        lightIntensity: 1.0,
      })
  );

  const cascadedShadowCompositePass: CascadedShadowCompositePass | null = initializeGraphicsPass(
    'CascadedShadowComposite',
    initPreset.cascadeShadowsEnabled && cascadedShadowMapper !== null,
    () => initializeCascadedShadowComposite(innerWidth, innerHeight),
    (pass) => {
      if (cascadedShadowMapper) {
        const cascadeInfo = cascadedShadowMapper.getCascadeInfo();
        const shadowMaps = cascadeInfo.cascades.map(c => c.shadowMap.texture);
        pass.setShadowMaps(shadowMaps);
        pass.setCascadeCount(cascadeInfo.count);

        const qualityConfig = {
          low: { intensity: 0.3, samples: 2 },
          medium: { intensity: 0.5, samples: 4 },
          high: { intensity: 0.7, samples: 8 },
          ultra: { intensity: 0.9, samples: 16 },
        };
        const config = qualityConfig[initPreset.name as 'low' | 'medium' | 'high' | 'ultra'];
        pass.setShadowIntensity(config.intensity);
        pass.setPCFSamples(config.samples);
        pass.setCameraFar((camera as THREE.PerspectiveCamera).far);
      }

      if (pass) {
        composer.addPass(pass);
      }
    }
  );

  const perLightBloomPass: PerLightBloomPass | null = initializeGraphicsPass(
    'PerLightBloom',
    initPreset.perLightBloomEnabled,
    () => initializePerLightBloom(renderer, innerWidth, innerHeight),
    (pass) => {
      pass.setBloomStrength(initPreset.perLightBloomStrength);
      pass.setBloomThreshold(initPreset.perLightBloomThreshold);
      const perLightBloomShaderPass = new ShaderPass(pass.getShaderMaterial());
      composer.addPass(perLightBloomShaderPass);
    }
  );

  // Global bloom runs after the reflection (SSR) and per-light bloom passes so
  // their contributions glow, and before final color management. Seeded from
  // the active quality preset; applyQualityPreset() keeps it in sync at runtime.
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(innerWidth, innerHeight),
    initPreset.bloomStrength,
    initPreset.bloomRadius,
    0.25,
  );
  bloomPass.enabled = initPreset.bloomEnabled;
  composer.addPass(bloomPass);

  const particleSystem: AdvancedParticleSystem | null = initializeGraphicsPass(
    'ParticleSystem',
    initPreset.advancedParticlesEnabled,
    () => initializeParticleSystem(scene, initPreset.maxParticles),
    (pass) => {
      pass.setQualityPreset(initPreset.name as 'low' | 'medium' | 'high' | 'ultra');
    }
  );

  const volumetricPass = createVolumetricLightingPass(renderer);
  volumetricPass.setExposure(1.2);
  volumetricPass.setParameters(0.5, 0.4, 0.95, 32);
  composer.addPass(volumetricPass);

  const filmEffectsPass: FilmEffectsPass | null = initializeGraphicsPass(
    'FilmEffects',
    initPreset.filmEffectsEnabled,
    () => initializeFilmEffects(renderer),
    (pass) => {
      pass.setQualityPreset(initPreset.name as 'low' | 'medium' | 'high' | 'ultra');
      const shaderPass = new ShaderPass(pass.getShaderMaterial());
      composer.addPass(shaderPass);
    }
  );

  const dofPass: DepthOfFieldPass | null = initializeGraphicsPass(
    'DepthOfField',
    initPreset.depthOfFieldEnabled,
    () => initializeDepthOfField(renderer, camera as THREE.PerspectiveCamera),
    (pass) => {
      if (pass.isDeviceSupported?.()) {
        pass.setQualityPreset(initPreset.name as 'low' | 'medium' | 'high' | 'ultra');
        pass.setAperture(initPreset.dofAperture);
        pass.setSamples(initPreset.dofSamples);
        pass.setEnabled(true);
        const shaderPass = new ShaderPass(pass.getShaderMaterial());
        composer.addPass(shaderPass);
      }
    }
  );

  // Final color management: apply tone mapping (ACESFilmic) + sRGB encoding once,
  // at the end of the linear-HDR composer chain. Without this, the renderer's
  // toneMapping/outputColorSpace are bypassed for the composited image and the
  // raw FXAAShader does no sRGB encoding. FXAA runs after, on gamma-corrected
  // output, where edge-detection works in the perceptual (gamma) domain.
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  // SMAA as the final antialiasing pass — sharper edges than FXAA at similar
  // cost, which suits the high-contrast, glossy playfield. Runs on the
  // tone-mapped sRGB output. EffectComposer's MSAA does not apply to the
  // composited result, so this post-AA pass is what actually antialiases.
  const pixelRatio = renderer.getPixelRatio();
  const smaaPass = new SMAAPass(innerWidth * pixelRatio, innerHeight * pixelRatio);
  smaaPass.renderToScreen = true;
  composer.addPass(smaaPass);

  initializeGraphicsPipeline(renderer, scene, camera, composer);
  initializePlayfieldVisualEnhancement(scene, camera, renderer, composer);
  initializeMetallicMaterials();
  initializeVideoManager();
  initializeVideoBinding();

  let mainSpot: THREE.SpotLight | null = null;
  let ambLight: THREE.AmbientLight | null = null;
  let fillLight: THREE.PointLight | null = null;
  let rimLight: THREE.DirectionalLight | null = null;

  // Light rig is identical whether or not the LightManager is present; only the
  // optional initialize() call differs. The full shadow-camera config is applied
  // in both cases so the fallback path stays consistent with the primary one.
  getGraphicsPipeline()?.getLightManager()?.initialize();

  ambLight = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(ambLight);
  mainSpot = new THREE.SpotLight(0xffffff, 2.5, 45, Math.PI / 3.0, 0.20);
  mainSpot.position.set(0, 14, 16);
  mainSpot.castShadow = true;
  mainSpot.shadow.mapSize.set(2048, 2048);
  mainSpot.shadow.bias = -0.0020;
  mainSpot.shadow.normalBias = 0.030;
  mainSpot.shadow.camera.near = 0.5;
  mainSpot.shadow.camera.far = 120;
  mainSpot.shadow.blurSamples = 16;
  scene.add(mainSpot);
  fillLight = new THREE.PointLight(0xffffdd, 1.5, 35);
  fillLight.position.set(-9, 6, 9);
  fillLight.castShadow = true;
  scene.add(fillLight);
  const accentLight = new THREE.PointLight(0xccddff, 0.8, 25);
  accentLight.position.set(9, 4, 5);
  scene.add(accentLight);
  rimLight = new THREE.DirectionalLight(0x88ccff, 0.9);
  rimLight.position.set(0, 22, -12);
  rimLight.castShadow = true;
  scene.add(rimLight);

  return {
    composer, bloomPass, ssrPass, motionBlurPass,
    cascadedShadowMapper, cascadedShadowCompositePass, perLightBloomPass,
    particleSystem, volumetricPass, filmEffectsPass, dofPass, smaaPass,
    mainSpot, ambLight, fillLight, rimLight,
  };
}
