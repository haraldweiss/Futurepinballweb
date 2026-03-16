#!/bin/bash

echo "═══════════════════════════════════════════════════════════════════"
echo "  Full Polish Suite - Performance Profile Analysis"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# Extract preset data
echo "📊 Quality Preset Breakdown:"
echo ""

for preset in low medium high ultra; do
  echo "─────────────────────────────────────────────────────────────────"
  echo "📌 $preset PRESET"
  echo ""
  
  # Parse the preset section
  START=$(grep -n "^\s*$preset:" src/profiler.ts | cut -d: -f1)
  if [ -n "$START" ]; then
    # Get next 80 lines (one preset section)
    sed -n "${START},$((START+80))p" src/profiler.ts | grep -E "ssrEnabled|ssrSamples|ssrIntensity|motionBlurEnabled|motionBlurSamples|cascadeShadowsEnabled|cascadeCount|cascadeShadowMapSize|perLightBloomEnabled|advancedParticlesEnabled|particlePhysicsEnabled|maxParticles|filmEffectsEnabled|filmGrainIntensity|depthOfFieldEnabled|targetFPS" | sed 's/^ */  /'
  fi
  echo ""
done

echo "═══════════════════════════════════════════════════════════════════"
echo "  Feature Comparison Matrix"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Feature              | Low      | Medium   | High    | Ultra"
echo "--------------------|----------|----------|---------|----------"

# SSR
ssr_low=$(grep -A20 "^\s*low:" src/profiler.ts | grep "ssrEnabled:" | head -1 | grep -o "false\|true")
ssr_med=$(grep -A50 "^\s*medium:" src/profiler.ts | grep "ssrEnabled:" | head -1 | grep -o "false\|true")
ssr_high=$(grep -A100 "^\s*high:" src/profiler.ts | grep "ssrEnabled:" | head -1 | grep -o "false\|true")
ssr_ultra=$(grep -A130 "^\s*ultra:" src/profiler.ts | grep "ssrEnabled:" | head -1 | grep -o "false\|true")
echo "Screen Space Refl.   | $ssr_low    | $ssr_med    | $ssr_high   | $ssr_ultra"

# Motion Blur
mb_low=$(grep -A20 "^\s*low:" src/profiler.ts | grep "motionBlurEnabled:" | head -1 | grep -o "false\|true")
mb_med=$(grep -A50 "^\s*medium:" src/profiler.ts | grep "motionBlurEnabled:" | head -1 | grep -o "false\|true")
mb_high=$(grep -A100 "^\s*high:" src/profiler.ts | grep "motionBlurEnabled:" | head -1 | grep -o "false\|true")
mb_ultra=$(grep -A130 "^\s*ultra:" src/profiler.ts | grep "motionBlurEnabled:" | head -1 | grep -o "false\|true")
echo "Motion Blur          | $mb_low    | $mb_med    | $mb_high   | $mb_ultra"

# Cascaded Shadows
cs_low=$(grep -A25 "^\s*low:" src/profiler.ts | grep "cascadeShadowsEnabled:" | head -1 | grep -o "false\|true")
cs_med=$(grep -A55 "^\s*medium:" src/profiler.ts | grep "cascadeShadowsEnabled:" | head -1 | grep -o "false\|true")
cs_high=$(grep -A105 "^\s*high:" src/profiler.ts | grep "cascadeShadowsEnabled:" | head -1 | grep -o "false\|true")
cs_ultra=$(grep -A135 "^\s*ultra:" src/profiler.ts | grep "cascadeShadowsEnabled:" | head -1 | grep -o "false\|true")
echo "Cascaded Shadows     | $cs_low    | $cs_med    | $cs_high   | $cs_ultra"

# Per-Light Bloom
pb_low=$(grep -A25 "^\s*low:" src/profiler.ts | grep "perLightBloomEnabled:" | head -1 | grep -o "false\|true")
pb_med=$(grep -A55 "^\s*medium:" src/profiler.ts | grep "perLightBloomEnabled:" | head -1 | grep -o "false\|true")
pb_high=$(grep -A105 "^\s*high:" src/profiler.ts | grep "perLightBloomEnabled:" | head -1 | grep -o "false\|true")
pb_ultra=$(grep -A135 "^\s*ultra:" src/profiler.ts | grep "perLightBloomEnabled:" | head -1 | grep -o "false\|true")
echo "Per-Light Bloom      | $pb_low    | $pb_med    | $pb_high   | $pb_ultra"

# Advanced Particles
ap_low=$(grep -A30 "^\s*low:" src/profiler.ts | grep "advancedParticlesEnabled:" | head -1 | grep -o "false\|true")
ap_med=$(grep -A60 "^\s*medium:" src/profiler.ts | grep "advancedParticlesEnabled:" | head -1 | grep -o "false\|true")
ap_high=$(grep -A110 "^\s*high:" src/profiler.ts | grep "advancedParticlesEnabled:" | head -1 | grep -o "false\|true")
ap_ultra=$(grep -A140 "^\s*ultra:" src/profiler.ts | grep "advancedParticlesEnabled:" | head -1 | grep -o "false\|true")
echo "Advanced Particles   | $ap_low    | $ap_med    | $ap_high   | $ap_ultra"

# Film Effects
fe_low=$(grep -A30 "^\s*low:" src/profiler.ts | grep "filmEffectsEnabled:" | head -1 | grep -o "false\|true")
fe_med=$(grep -A60 "^\s*medium:" src/profiler.ts | grep "filmEffectsEnabled:" | head -1 | grep -o "false\|true")
fe_high=$(grep -A110 "^\s*high:" src/profiler.ts | grep "filmEffectsEnabled:" | head -1 | grep -o "false\|true")
fe_ultra=$(grep -A140 "^\s*ultra:" src/profiler.ts | grep "filmEffectsEnabled:" | head -1 | grep -o "false\|true")
echo "Film Effects         | $fe_low    | $fe_med    | $fe_high   | $fe_ultra"

# DOF
dof_low=$(grep -A35 "^\s*low:" src/profiler.ts | grep "depthOfFieldEnabled:" | head -1 | grep -o "false\|true")
dof_med=$(grep -A65 "^\s*medium:" src/profiler.ts | grep "depthOfFieldEnabled:" | head -1 | grep -o "false\|true")
dof_high=$(grep -A115 "^\s*high:" src/profiler.ts | grep "depthOfFieldEnabled:" | head -1 | grep -o "false\|true")
dof_ultra=$(grep -A145 "^\s*ultra:" src/profiler.ts | grep "depthOfFieldEnabled:" | head -1 | grep -o "false\|true")
echo "Depth of Field       | $dof_low    | $dof_med    | $dof_high   | $dof_ultra"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
