# Code Quality Refactoring: Before & After Examples

This document provides concrete refactoring examples for the issues identified in `CODE_QUALITY_REVIEW_MAIN_TS.md`.

---

## Refactoring 1: Remove Redundant State Caching

### BEFORE (Current)

**File: src/main.ts**

```typescript
// Line 367-369: Module-level cache (initialized once, never updated)
const profiler = getProfiler();
let currentPreset = profiler.getQualityPreset();  // ← STALE AFTER PRESET CHANGE
console.log('DEBUG: currentPreset =', currentPreset);

// Lines 540-546: Uses stale module-level currentPreset
let ssrPass: SSRPass | null = null;
try {
  if (currentPreset && currentPreset.ssrEnabled) {  // ← Reads stale cache
    ssrPass = new SSRPass(renderer, scene, camera, innerWidth, innerHeight);
    ssrPass.setIntensity(currentPreset.ssrIntensity);  // ← Stale value
  }
} catch (e) { console.error('SSRPass init failed:', e); }

// Lines 1891-1895: Inside applyQualityPreset() - uses fresh copy
function applyQualityPreset(): void {
  try {
    const currentPreset = profiler.getQualityPreset();  // ← FRESH COPY
    const presetName = currentPreset.name;

    if (lastAppliedQualityPreset === presetName) return;
    lastAppliedQualityPreset = presetName;
    // ... applies settings using fresh currentPreset
  } catch (err) {
    console.error('❌ Error in applyQualityPreset:', err);
  }
}
```

**Problem**: Two different versions of currentPreset exist. If pass initialization happens before quality changes, it uses correct data. If a pass is re-initialized after a quality change, it still reads the stale module-level cache.

### AFTER (Refactored)

**File: src/main.ts**

```typescript
// Line 367: Only keep the profiler reference
const profiler = getProfiler();
// DELETE line 368-369 (the redundant cache and debug log)

// Lines 540-546: Refactored - no stale cache dependency
let ssrPass: SSRPass | null = null;
try {
  const preset = profiler.getQualityPreset();  // ← Fetch fresh
  if (preset.ssrEnabled) {  // ← Use fresh preset
    ssrPass = new SSRPass(renderer, scene, camera, innerWidth, innerHeight);
    ssrPass.setIntensity(preset.ssrIntensity);
    ssrPass.setParameters(preset.ssrSamples, preset.ssrMaxDistance, 0.1);
    ssrPass.setEnabled(true);
    console.log('✓ SSR Pass initialized');
  }
} catch (e) { console.error('❌ SSRPass init failed:', e); }

// Lines 1891-1895: Same pattern (no change needed)
function applyQualityPreset(): void {
  try {
    const currentPreset = profiler.getQualityPreset();
    const presetName = currentPreset.name;
    // ... rest unchanged
  } catch (err) {
    console.error('❌ Error in applyQualityPreset:', err);
  }
}
```

**Benefits**:
- ✓ Single source of truth (profiler.getQualityPreset())
- ✓ Always fetches current preset (no stale data)
- ✓ Removes debug log (not needed in production)
- ✓ 2 lines deleted

---

## Refactoring 2: Replace Try-Catch Band-Aids with Feature Gates

### BEFORE (Current)

**File: src/main.ts, Lines 539-631**

```typescript
// PATTERN REPEATED 7 TIMES ↓

// Phase 18: SSR
let ssrPass: SSRPass | null = null;
try {
  if (currentPreset && currentPreset.ssrEnabled) {
    ssrPass = new SSRPass(renderer, scene, camera, innerWidth, innerHeight);
    ssrPass.setIntensity(currentPreset.ssrIntensity);
    ssrPass.setParameters(currentPreset.ssrSamples, currentPreset.ssrMaxDistance, 0.1);
    ssrPass.setEnabled(true);
  }
} catch (e) { console.error('SSRPass init failed:', e); }

// Phase 19: Motion Blur
let motionBlurPass: MotionBlurPass | null = null;
try {
  if (currentPreset && currentPreset.motionBlurEnabled) {
    motionBlurPass = new MotionBlurPass(renderer, innerWidth, innerHeight);
    motionBlurPass.setIntensity(currentPreset.motionBlurStrength);
    motionBlurPass.setSamples(currentPreset.motionBlurSamples);
    motionBlurPass.setEnabled(true);
  }
} catch (e) { console.error('MotionBlurPass init failed:', e); }

// Phase 20: Cascaded Shadows
let cascadedShadowMapper: CascadedShadowMapper | null = null;
try {
  if (currentPreset && currentPreset.cascadeShadowsEnabled) {
    cascadedShadowMapper = initializeCascadedShadows(renderer, scene, camera as THREE.PerspectiveCamera, {
      cascadeCount: currentPreset.cascadeCount,
      shadowMapSize: currentPreset.cascadeShadowMapSize,
      lightDirection: new THREE.Vector3(0.5, -1, 0.5).normalize(),
      lightIntensity: 1.0,
    });
  }
} catch (e) { console.error('CascadedShadows init failed:', e); }

// ... 4 MORE IDENTICAL PATTERNS ...
```

**Problem**: Repetitive structure, masking real errors, hard to maintain.

### AFTER (Refactored)

**File: src/main.ts, NEW SECTION AFTER LINE 365**

```typescript
// ─── Graphics Pass Initialization Helper ───────────────────────────────────
/**
 * Safely initialize a graphics pass with feature-gate and error handling.
 *
 * @param passName Display name for logging (e.g., "SSR Pass")
 * @param preset Current quality preset
 * @param isEnabled Whether the preset enables this feature
 * @param initializer Function that creates and configures the pass
 * @returns Initialized pass or null if disabled or initialization failed
 */
function initializeGraphicsPass<T>(
  passName: string,
  preset: any,
  isEnabled: boolean,
  initializer: (preset: any) => T
): T | null {
  // Feature disabled by preset—no output needed
  if (!isEnabled) return null;

  try {
    const pass = initializer(preset);
    console.log(`✓ ${passName} initialized`);
    return pass;
  } catch (e) {
    console.error(`❌ ${passName} initialization failed:`, e);
    // Return null so rest of code can handle gracefully (feature disabled)
    return null;
  }
}
```

**File: src/main.ts, REPLACE Lines 539-631 with:**

```typescript
// ─── Phase 18+: Screen Space Reflections (SSR) ───
const preset = profiler.getQualityPreset();
let ssrPass = initializeGraphicsPass(
  'SSR Pass',
  preset,
  preset.ssrEnabled,
  (p) => {
    const pass = new SSRPass(renderer, scene, camera, innerWidth, innerHeight);
    pass.setIntensity(p.ssrIntensity);
    pass.setParameters(p.ssrSamples, p.ssrMaxDistance, 0.1);
    pass.setEnabled(true);
    return pass;
  }
);

// ─── Phase 19: Motion Blur ───
let motionBlurPass = initializeGraphicsPass(
  'Motion Blur Pass',
  preset,
  preset.motionBlurEnabled,
  (p) => {
    const pass = new MotionBlurPass(renderer, innerWidth, innerHeight);
    pass.setIntensity(p.motionBlurStrength);
    pass.setSamples(p.motionBlurSamples);
    pass.setEnabled(true);
    return pass;
  }
);

// ─── Phase 20: Cascaded Shadows ───
let cascadedShadowMapper = initializeGraphicsPass(
  'Cascaded Shadows',
  preset,
  preset.cascadeShadowsEnabled,
  (p) => {
    return initializeCascadedShadows(renderer, scene, camera as THREE.PerspectiveCamera, {
      cascadeCount: p.cascadeCount,
      shadowMapSize: p.cascadeShadowMapSize,
      lightDirection: new THREE.Vector3(0.5, -1, 0.5).normalize(),
      lightIntensity: 1.0,
    });
  }
);

// ─── Phase 20: Per-Light Bloom ───
let perLightBloomPass = initializeGraphicsPass(
  'Per-Light Bloom',
  preset,
  preset.perLightBloomEnabled,
  (p) => {
    const pass = initializePerLightBloom(renderer, innerWidth, innerHeight);
    pass.setBloomStrength(p.perLightBloomStrength);
    pass.setBloomThreshold(p.perLightBloomThreshold);
    return pass;
  }
);

// ─── Phase 21: Advanced Particle System ───
let particleSystem = initializeGraphicsPass(
  'Particle System',
  preset,
  preset.advancedParticlesEnabled,
  (p) => {
    const system = initializeParticleSystem(scene, p.maxParticles);
    if (system) {
      system.setQualityPreset(p.name as 'low' | 'medium' | 'high' | 'ultra');
    }
    return system;
  }
);

// ─── Phase 22: Film Effects ───
let filmEffectsPass = initializeGraphicsPass(
  'Film Effects',
  preset,
  preset.filmEffectsEnabled,
  (p) => {
    const pass = initializeFilmEffects(renderer);
    pass.setQualityPreset(p.name as 'low' | 'medium' | 'high' | 'ultra');
    const shaderPass = new ShaderPass(pass.getShaderMaterial());
    composer.addPass(shaderPass);
    return pass;
  }
);

// ─── Phase 23: Depth of Field ───
let dofPass = initializeGraphicsPass(
  'Depth of Field',
  preset,
  preset.depthOfFieldEnabled,
  (p) => {
    const pass = initializeDepthOfField(renderer, camera as THREE.PerspectiveCamera);
    if (pass && pass.isDeviceSupported()) {
      pass.setQualityPreset(p.name as 'low' | 'medium' | 'high' | 'ultra');
      pass.setAperture(p.dofAperture);
      pass.setSamples(p.dofSamples);
      pass.setEnabled(true);
      const shaderPass = new ShaderPass(pass.getShaderMaterial());
      composer.addPass(shaderPass);
      return pass;
    }
    return null;
  }
);
```

**Benefits**:
- ✓ Single helper function handles all 7 cases
- ✓ Explicit feature gates (disabled ≠ error)
- ✓ Consistent logging and error handling
- ✓ 50+ lines consolidated into 20 lines of boilerplate + 70 lines of configurable code
- ✓ Easy to add global prerequisites (e.g., device capability checks)

---

## Refactoring 3: Consolidate Null-Check Patterns

### BEFORE (Current)

**File: src/main.ts, Lines 1901-1972**

```typescript
function applyQualityPreset(): void {
  try {
    const currentPreset = profiler.getQualityPreset();
    const presetName = currentPreset.name;

    if (lastAppliedQualityPreset === presetName) return;
    lastAppliedQualityPreset = presetName;

    console.log(`⚙️ Applying quality preset: ${currentPreset.label}`);

    // ─── Bloom Pass ───
    if (bloomPass) {
      bloomPass.enabled = currentPreset.bloomEnabled;
      if (currentPreset.bloomEnabled) {
        bloomPass.strength = currentPreset.bloomStrength;
        bloomPass.radius = currentPreset.bloomRadius;
        bloomPass.threshold = 0.25;
      }
    }

    // ─── Shadow Maps ───
    if (currentPreset.shadowsEnabled) {
      if (mainSpot) {
        mainSpot.castShadow = true;
        mainSpot.shadow.mapSize.set(currentPreset.shadowMapSize, currentPreset.shadowMapSize);
        mainSpot.shadow.blurSamples = 16;
      }
      renderer.shadowMap.enabled = true;
    } else {
      if (mainSpot) mainSpot.castShadow = false;
      renderer.shadowMap.enabled = false;
    }

    // ─── Lighting Intensities ───
    if (ambLight) ambLight.intensity = currentPreset.shadowsEnabled ? 0.25 : 0.35;
    if (fillLight) fillLight.intensity = currentPreset.shadowsEnabled ? 1.2 : 1.5;
    if (rimLight) rimLight.intensity = currentPreset.shadowsEnabled ? 0.7 : 0.5;

    // ... 40 more lines of conditional checks ...
  } catch (err) {
    console.error('❌ Error in applyQualityPreset:', err);
  }
}
```

**Problem**: Unclear which objects are required vs. optional. If `ambLight` is null, the setting silently doesn't apply.

### AFTER (Refactored)

**File: src/main.ts**

```typescript
// Helper to apply preset with clear distinction of required/optional
function applyQualityPreset(): void {
  try {
    const preset = profiler.getQualityPreset();
    const presetName = preset.name;

    if (lastAppliedQualityPreset === presetName) return;
    lastAppliedQualityPreset = presetName;

    console.log(`⚙️ Applying quality preset: ${preset.label}`);

    // ─── Required Renderer Settings (must never fail) ───
    // These apply to core systems that always exist
    renderer.toneMappingExposure = preset.bloomEnabled ? 1.15 : 1.05;
    renderer.shadowMap.enabled = preset.shadowsEnabled;

    // ─── Optional Feature: Bloom ───
    applyBloomPreset(preset);

    // ─── Optional Feature: Shadows ───
    applyShadowPreset(preset);

    // ─── Optional Feature: Lights ───
    applyLightingPreset(preset);

    // ... delegate to other helpers ...

  } catch (err) {
    console.error('❌ Error in applyQualityPreset:', err);
  }
}

/**
 * Apply bloom quality settings. Safe if bloomPass is null.
 */
function applyBloomPreset(preset: QualityPreset): void {
  if (!bloomPass) {
    // Bloom disabled OR failed to initialize
    return;
  }

  bloomPass.enabled = preset.bloomEnabled;
  if (preset.bloomEnabled) {
    bloomPass.strength = preset.bloomStrength;
    bloomPass.radius = preset.bloomRadius;
    bloomPass.threshold = 0.25;
  }

  // Apply bloom-related settings to materials
  if (ballOuterMaterial) {
    ballOuterMaterial.emissiveIntensity = preset.bloomEnabled ? 0.3 : 0.1;
  }
  if (ballGlowMaterial) {
    ballGlowMaterial.emissiveIntensity = preset.bloomEnabled ? 0.6 : 0.2;
    ballGlowMaterial.opacity = preset.bloomEnabled ? 0.12 : 0.06;
  }
}

/**
 * Apply shadow quality settings. Safe if mainSpot is null.
 */
function applyShadowPreset(preset: QualityPreset): void {
  if (!mainSpot) {
    if (preset.shadowsEnabled) {
      console.warn('⚠️ Shadows requested but main spotlight is null (check initialization order)');
    }
    return;
  }

  if (preset.shadowsEnabled) {
    mainSpot.castShadow = true;
    mainSpot.shadow.mapSize.set(preset.shadowMapSize, preset.shadowMapSize);
    mainSpot.shadow.blurSamples = 16;
  } else {
    mainSpot.castShadow = false;
  }
}

/**
 * Apply lighting intensity adjustments. Safe if lights are null.
 */
function applyLightingPreset(preset: QualityPreset): void {
  const shadowFactor = preset.shadowsEnabled;

  if (ambLight) ambLight.intensity = shadowFactor ? 0.25 : 0.35;
  if (fillLight) fillLight.intensity = shadowFactor ? 1.2 : 1.5;
  if (rimLight) rimLight.intensity = shadowFactor ? 0.7 : 0.5;
}
```

**Benefits**:
- ✓ Clear separation of required vs. optional systems
- ✓ Easier to test each component in isolation
- ✓ Null-check logic centralized in helper functions
- ✓ Business logic is self-documenting (applyBloomPreset clearly handles bloom)
- ✓ Main function is shorter and easier to understand

---

## Refactoring 4: Structure Quality Preset Properties

### BEFORE (Current)

**File: src/profiler.ts, Lines 13-82**

```typescript
export interface QualityPreset {
  name: 'low' | 'medium' | 'high' | 'ultra';
  label: string;

  // Graphics settings
  shadowsEnabled: boolean;
  shadowMapSize: number;
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  // ... 44 more properties scattered without organization ...
  ssrEnabled: boolean;
  ssrIntensity: number;
  ssrSamples: number;
  ssrMaxDistance: number;
  motionBlurEnabled: boolean;
  motionBlurStrength: number;
  motionBlurSamples: number;
  volumetricEnabled: boolean;
  volumetricIntensity: number;
  // ... etc
}
```

**Problem**: 50+ properties with no logical grouping. Hard to understand relationships.

### AFTER (Refactored)

**File: src/profiler.ts**

```typescript
// ─── Feature-Specific Configurations ───

export interface BloomConfig {
  enabled: boolean;
  strength: number;
  radius: number;
  threshold?: number;
}

export interface ShadowConfig {
  enabled: boolean;
  mapSize: number;
  blurSamples: number;
  cascadeCount?: number;
}

export interface MotionBlurConfig {
  enabled: boolean;
  strength: number;
  samples: number;
}

export interface SSRConfig {
  enabled: boolean;
  intensity: number;
  samples: number;
  maxDistance: number;
}

export interface VolumetricLightingConfig {
  enabled: boolean;
  intensity: number;
  density?: number;
  weight?: number;
  decay?: number;
}

export interface ParticleConfig {
  enabled: boolean;
  maxParticles: number;
}

export interface DMDConfig {
  resolution: 'standard' | 'hires' | 'uhires';
  glowEnabled: boolean;
  glowIntensity: number;
}

// ─── Main Quality Preset (refactored) ───

export interface QualityPreset {
  // Identity
  name: 'low' | 'medium' | 'high' | 'ultra';
  label: string;

  // Performance targets
  targetFPS: number;
  pixelRatioCap: number;

  // Subsystem configurations (organized by feature)
  bloom: BloomConfig;
  shadows: ShadowConfig;
  motionBlur: MotionBlurConfig;
  ssr: SSRConfig;
  volumetric: VolumetricLightingConfig;
  particles: ParticleConfig;
  dmd: DMDConfig;

  // Legacy properties (deprecated, remove in next version)
  backglassEnabled?: boolean;
  backglass3D?: boolean;
}
```

**File: src/profiler.ts, Lines 84-200 (updated presets)**

```typescript
export const QUALITY_PRESETS: Record<string, QualityPreset> = {
  low: {
    name: 'low',
    label: 'Low (Performance)',
    targetFPS: 30,
    pixelRatioCap: 1,

    bloom: {
      enabled: false,
      strength: 0.5,
      radius: 0.25,
    },
    shadows: {
      enabled: false,
      mapSize: 512,
      blurSamples: 4,
    },
    motionBlur: {
      enabled: false,
      strength: 0.1,
      samples: 2,
    },
    ssr: {
      enabled: false,
      intensity: 0.3,
      samples: 4,
      maxDistance: 5,
    },
    volumetric: {
      enabled: false,
      intensity: 0.2,
    },
    particles: {
      enabled: true,
      maxParticles: 100,
    },
    dmd: {
      resolution: 'standard',
      glowEnabled: false,
      glowIntensity: 0,
    },
  },

  medium: {
    name: 'medium',
    label: 'Medium (Balanced)',
    targetFPS: 45,
    pixelRatioCap: 1.5,

    bloom: {
      enabled: true,
      strength: 1.0,
      radius: 0.5,
    },
    shadows: {
      enabled: true,
      mapSize: 1024,
      blurSamples: 8,
    },
    // ... etc
  },

  // high and ultra follow similar pattern
};
```

**File: src/main.ts, Updated applyQualityPreset() usage**

```typescript
function applyQualityPreset(): void {
  try {
    const preset = profiler.getQualityPreset();

    // Cleaner, grouped access
    applyBloomPreset(preset.bloom);
    applyShadowPreset(preset.shadows);
    applyMotionBlurPreset(preset.motionBlur);
    applySSRPreset(preset.ssr);
    applyVolumetricPreset(preset.volumetric);
    applyParticlePreset(preset.particles);
    applyDMDPreset(preset.dmd);
  } catch (err) {
    console.error('❌ Error in applyQualityPreset:', err);
  }
}

// Each helper now receives its specific config
function applyBloomPreset(config: BloomConfig): void {
  if (!bloomPass) return;
  bloomPass.enabled = config.enabled;
  if (config.enabled) {
    bloomPass.strength = config.strength;
    bloomPass.radius = config.radius;
    bloomPass.threshold = config.threshold ?? 0.25;
  }
}

function applyShadowPreset(config: ShadowConfig): void {
  if (!mainSpot) return;
  mainSpot.castShadow = config.enabled;
  if (config.enabled) {
    mainSpot.shadow.mapSize.set(config.mapSize, config.mapSize);
    mainSpot.shadow.blurSamples = config.blurSamples;
  }
  renderer.shadowMap.enabled = config.enabled;
}

// ... etc for other configs
```

**Benefits**:
- ✓ Logical organization (all bloom settings together)
- ✓ Easier to understand relationships (strength + radius go together)
- ✓ Validation can be scoped (e.g., BloomConfig.strength should be 0-2)
- ✓ Adding new features just adds a new subsystem interface
- ✓ Cleaner interface (50+ flat properties → 7-8 organized groups)
- ✓ Easier to document (one comment per group instead of one per property)

---

## Summary: Lines of Code Impact

| Refactoring | Before | After | Change | Reason |
|---|---|---|---|---|
| Remove redundant state | 4 lines | 0 lines | -4 lines | Cache elimination |
| Replace try-catch helper | 92 lines | 20 helper + 70 config | -2 lines | Consolidation |
| Consolidate null checks | 72 lines | 40 main + 60 helpers | +28 lines | Clarity (worth it) |
| Restructure QualityPreset | 70 lines | 100 lines | +30 lines | Better structure |
| **NET EFFECT** | **3,796 total** | **~3,750 total** | **-46 lines** | Better organized |

**Quality improvements** (not countable but significant):
- Clarity: +3 (easier to understand)
- Maintainability: +3 (easier to modify)
- Testability: +3 (can test subsystems independently)
- Error handling: +2 (clearer success/failure paths)

---

## Implementation Order

1. **First**: Remove redundant `currentPreset` cache (5 min, zero risk)
2. **Second**: Create `initializeGraphicsPass()` helper and refactor pass init (30 min, low risk)
3. **Third**: Break up `applyQualityPreset()` into subsystem handlers (30 min, medium risk)
4. **Fourth**: Restructure `QualityPreset` interface (1 hour, medium risk)
5. **Last**: Update all callers to use new interface (1 hour, high risk)

This order ensures quick wins first, then tackles larger refactoring.
