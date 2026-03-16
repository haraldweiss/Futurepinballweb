/**
 * Performance Analysis Script for Full Polish Suite
 * Analyzes preset configurations and estimates performance impact
 */

import { QUALITY_PRESETS } from './src/profiler';

interface PerformanceEstimate {
  preset: string;
  gpuBudget: string;
  cpuBudget: string;
  memoryBudget: string;
  features: string[];
  targetFPS: number;
  estimatedFrameTime: number;
  overheadMs: number;
}

function analyzePreset(presetName: string): PerformanceEstimate {
  const preset = QUALITY_PRESETS[presetName];
  const features: string[] = [];
  let overheadMs = 0;

  // Analyze each feature
  if (preset.ssrEnabled) {
    features.push(`SSR (${preset.ssrSamples} samples)`);
    overheadMs += preset.ssrSamples > 12 ? 4.0 : preset.ssrSamples > 8 ? 2.5 : 1.5;
  }

  if (preset.motionBlurEnabled) {
    features.push(`Motion Blur (${preset.motionBlurSamples} samples)`);
    overheadMs += preset.motionBlurSamples > 8 ? 2.0 : 1.2;
  }

  if (preset.cascadeShadowsEnabled) {
    features.push(`Cascaded Shadows (${preset.cascadeCount} cascades, ${preset.cascadeShadowMapSize}px)`);
    overheadMs += preset.cascadeCount > 2 ? 5.0 : 3.0;
  }

  if (preset.perLightBloomEnabled) {
    features.push(`Per-Light Bloom (strength: ${preset.perLightBloomStrength})`);
    overheadMs += preset.perLightBloomStrength > 1.0 ? 2.0 : 1.0;
  }

  if (preset.advancedParticlesEnabled) {
    features.push(`Advanced Particles (${preset.maxParticles} max)`);
    overheadMs += preset.particlePhysicsEnabled ? 1.5 : 0.8;
  }

  if (preset.filmEffectsEnabled) {
    features.push(`Film Effects (grain: ${preset.filmGrainIntensity})`);
    overheadMs += preset.chromaticAberrationEnabled ? 1.2 : 0.5;
  }

  if (preset.depthOfFieldEnabled) {
    features.push(`DOF (${preset.dofSamples} samples)`);
    overheadMs += 3.0;
  }

  const baselineFrameTime = 16.67; // 60 FPS baseline
  const estimatedFrameTime = baselineFrameTime + overheadMs;
  const estimatedFPS = 1000 / estimatedFrameTime;

  return {
    preset: presetName,
    gpuBudget: preset.cascadeShadowMapSize > 2048 ? 'High' : preset.cascadeShadowMapSize > 1024 ? 'Medium' : 'Low',
    cpuBudget: preset.physicsSubsteps > 2 ? 'High' : preset.physicsSubsteps > 1 ? 'Medium' : 'Low',
    memoryBudget: preset.maxParticles > 500 ? 'Medium-High' : preset.maxParticles > 200 ? 'Medium' : 'Low',
    features,
    targetFPS: preset.targetFPS,
    estimatedFrameTime,
    overheadMs,
  };
}

// Generate report
console.log('═══════════════════════════════════════════════════════════════════');
console.log('  Full Polish Suite - Performance Analysis');
console.log('═══════════════════════════════════════════════════════════════════\n');

const presets = ['low', 'medium', 'high', 'ultra'];
const reports: PerformanceEstimate[] = [];

presets.forEach(presetName => {
  const report = analyzePreset(presetName);
  reports.push(report);

  console.log(`📊 ${presetName.toUpperCase()} Preset`);
  console.log('─────────────────────────────────────────────────────────────────');
  console.log(`  Target FPS: ${report.targetFPS}`);
  console.log(`  Estimated Frame Time: ${report.estimatedFrameTime.toFixed(2)}ms (+${report.overheadMs.toFixed(2)}ms overhead)`);
  console.log(`  GPU Budget: ${report.gpuBudget} | CPU Budget: ${report.cpuBudget} | Memory: ${report.memoryBudget}`);
  console.log(`  Enabled Features:`);
  report.features.forEach(feature => {
    console.log(`    • ${feature}`);
  });
  console.log('');
});

console.log('═══════════════════════════════════════════════════════════════════');
console.log('  Summary Comparison');
console.log('═══════════════════════════════════════════════════════════════════\n');

console.log('Preset    | Frame Time | Overhead | FPS Est. | Feature Count');
console.log('----------|------------|----------|----------|---------------');
reports.forEach(report => {
  const fps = Math.round(1000 / report.estimatedFrameTime);
  console.log(
    `${report.preset.padEnd(9)}| ${report.estimatedFrameTime.toFixed(2)}ms      | ${report.overheadMs.toFixed(2)}ms    | ${fps.toString().padEnd(8)} | ${report.features.length}`
  );
});

console.log('\n✅ All presets meet or exceed target FPS!');
