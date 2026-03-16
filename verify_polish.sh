#!/bin/bash

echo "═══════════════════════════════════════════════════════"
echo "  Full Polish Suite - Feature Verification"
echo "═══════════════════════════════════════════════════════"
echo ""

# Feature verification
echo "📁 Feature Files:"
for file in src/graphics/ssr-pass.ts src/graphics/motion-blur-pass.ts src/graphics/cascaded-shadows.ts src/graphics/per-light-bloom.ts src/graphics/film-effects-pass.ts src/graphics/advanced-particle-system.ts src/graphics/dof-pass.ts; do
  if [ -f "$file" ]; then
    lines=$(wc -l < "$file")
    echo "  ✅ $(basename $file) - $lines lines"
  else
    echo "  ❌ $(basename $file) - NOT FOUND"
  fi
done

echo ""
echo "🔗 Integration in main.ts:"
grep -c "ssrPass" src/main.ts > /dev/null && echo "  ✅ SSR Pass integrated" || echo "  ❌ SSR Pass missing"
grep -c "motionBlurPass" src/main.ts > /dev/null && echo "  ✅ Motion Blur integrated" || echo "  ❌ Motion Blur missing"
grep -c "cascadedShadowMapper" src/main.ts > /dev/null && echo "  ✅ Cascaded Shadows integrated" || echo "  ❌ Cascaded Shadows missing"
grep -c "perLightBloomPass" src/main.ts > /dev/null && echo "  ✅ Per-Light Bloom integrated" || echo "  ❌ Per-Light Bloom missing"
grep -c "filmEffectsPass" src/main.ts > /dev/null && echo "  ✅ Film Effects integrated" || echo "  ❌ Film Effects missing"
grep -c "particleSystem" src/main.ts > /dev/null && echo "  ✅ Particle System integrated" || echo "  ❌ Particle System missing"
grep -c "dofPass" src/main.ts > /dev/null && echo "  ✅ DOF Pass integrated" || echo "  ❌ DOF Pass missing"

echo ""
echo "⚙️  Quality Presets in profiler.ts:"
grep -c "ssrEnabled" src/profiler.ts > /dev/null && echo "  ✅ SSR presets configured" || echo "  ❌ SSR presets missing"
grep -c "motionBlurEnabled" src/profiler.ts > /dev/null && echo "  ✅ Motion Blur presets configured" || echo "  ❌ Motion Blur presets missing"
grep -c "cascadeShadowsEnabled" src/profiler.ts > /dev/null && echo "  ✅ Cascaded Shadows presets configured" || echo "  ❌ Cascaded Shadows presets missing"
grep -c "perLightBloomEnabled" src/profiler.ts > /dev/null && echo "  ✅ Per-Light Bloom presets configured" || echo "  ❌ Per-Light Bloom presets missing"
grep -c "filmEffectsEnabled" src/profiler.ts > /dev/null && echo "  ✅ Film Effects presets configured" || echo "  ❌ Film Effects presets missing"
grep -c "advancedParticlesEnabled" src/profiler.ts > /dev/null && echo "  ✅ Advanced Particles presets configured" || echo "  ❌ Advanced Particles presets missing"
grep -c "depthOfFieldEnabled" src/profiler.ts > /dev/null && echo "  ✅ DOF presets configured" || echo "  ❌ DOF presets missing"

echo ""
