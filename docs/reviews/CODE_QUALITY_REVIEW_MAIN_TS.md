# Code Quality Review: main.ts Polish Suite Integration

**Reviewer**: Code Quality Analysis
**Date**: 2026-03-11
**Scope**: Polish Suite initialization, error handling, and state management
**Files Affected**: `src/main.ts` (3,796 lines)

---

## Executive Summary

The Polish Suite integration in `main.ts` exhibits **4 critical architectural issues** and **multiple code smell patterns** that degrade maintainability and performance. While the defensive programming approach is well-intentioned, it reveals underlying architectural problems that should be refactored rather than patched with try-catch blocks.

**Severity Assessment**:
- 🔴 **Critical**: Redundant state caching, initialization order dependencies
- 🟠 **High**: Repetitive try-catch patterns (7 similar blocks)
- 🟡 **Medium**: Null-check sprawl, leaky abstractions, parameter accumulation
- 🟢 **Low**: Minor inconsistencies in error logging

---

## Issue 1: Redundant State Caching (currentPreset)

### Problem

```typescript
// Line 368: Module-level global
let currentPreset = profiler.getQualityPreset();
console.log('DEBUG: currentPreset =', currentPreset);

// Line 1891: Inside applyQualityPreset()
const currentPreset = profiler.getQualityPreset();
```

**Two sources of truth for the same data:**
1. **Module-level `currentPreset`** (line 368) — initialized once, never updated
2. **Local `currentPreset`** (line 1891) — fetched fresh each time the function runs

### Evidence of Bug

```typescript
// Lines 540-596: Uses module-level currentPreset (potentially stale)
if (currentPreset && currentPreset.ssrEnabled) {
  ssrPass = new SSRPass(...);
}

// Lines 1901-1972: Uses fresh currentPreset (correct)
const currentPreset = profiler.getQualityPreset();
if (bloomPass) {
  bloomPass.enabled = currentPreset.bloomEnabled;
}
```

**When does this fail?**
- User changes quality preset → `applyQualityPreset()` updates the fresh `currentPreset` locally
- But the module-level `currentPreset` is never refreshed
- If any code path tries to access the module-level version after a preset change, it reads stale data

### Root Cause

Misunderstanding of when state should be cached vs. derived. The caching pattern suggests uncertainty about initialization order.

### Impact

- **Performance**: Negligible (one extra object copy per frame)
- **Correctness**: HIGH — Quality preset changes may not propagate to all initialized passes
- **Maintainability**: HIGH — Future developers will be confused about which `currentPreset` is authoritative

### Recommendation

**Remove the module-level cache entirely.** Access `profiler.getQualityPreset()` directly where needed:

```typescript
// DELETE line 368-369
// Instead: Always use profiler.getQualityPreset() when needed

// During initialization:
const preset = profiler.getQualityPreset();
if (preset.ssrEnabled) {
  ssrPass = new SSRPass(...);
}
```

**Why this works**: `profiler.getQualityPreset()` already returns a shallow copy (`{ ...this.qualityPreset }`), so performance is not a concern.

---

## Issue 2: Initialization Order Dependency (Try-Catch as Band-Aid)

### Problem

Seven identical try-catch patterns suggest that pass initialization **may fail silently**:

```typescript
// Lines 539-546: SSR Pass
let ssrPass: SSRPass | null = null;
try {
  if (currentPreset && currentPreset.ssrEnabled) {
    ssrPass = new SSRPass(renderer, scene, camera, innerWidth, innerHeight);
    // ... configuration
  }
} catch (e) { console.error('SSRPass init failed:', e); }

// Lines 551-558: Motion Blur Pass
let motionBlurPass: MotionBlurPass | null = null;
try {
  if (currentPreset && currentPreset.motionBlurEnabled) {
    motionBlurPass = new MotionBlurPass(renderer, innerWidth, innerHeight);
    // ... configuration
  }
} catch (e) { console.error('MotionBlurPass init failed:', e); }

// SAME PATTERN x5 MORE TIMES
```

### Why This Is Problematic

1. **Masks initialization bugs** — The try-catch allows bad initialization to pass silently
2. **Suggests fragile initialization** — If these are expected to fail, they should fail gracefully with the feature disabled. Catching all exceptions hides real bugs.
3. **Defers errors to runtime** — A pass initialization that fails during startup won't be caught by the dev team until users report missing features

### Example Failure Scenario

```typescript
ssrPass = new SSRPass(renderer, scene, camera, innerWidth, innerHeight);
// What if renderer is null? What if camera.near is undefined?
// The try-catch swallows the error, leaving ssrPass = null silently
```

Later, when accessing `ssrPass` during frame updates:

```typescript
if (ssrPass) {
  ssrPass.updateVelocityBuffer(dt);  // Line ~2019
}
// This silently does nothing. Very hard to debug.
```

### Root Cause

The designer added these blocks because:
1. They're unsure if these features will be available (right design choice)
2. They're unsure if initialization will succeed (wrong implementation — should fail loudly)

### Recommendation

**Replace try-catch with explicit feature gates and fail-fast logging:**

```typescript
// ─── SSR Pass: Feature Gate with Explicit Logging ───
let ssrPass: SSRPass | null = null;
if (currentPreset?.ssrEnabled && renderer && scene && camera) {
  try {
    ssrPass = new SSRPass(renderer, scene, camera, innerWidth, innerHeight);
    ssrPass.setIntensity(currentPreset.ssrIntensity);
    ssrPass.setParameters(currentPreset.ssrSamples, currentPreset.ssrMaxDistance, 0.1);
    ssrPass.setEnabled(true);
    console.log('✓ SSR Pass initialized');
  } catch (e) {
    console.error('❌ SSR Pass initialization failed (feature disabled):', e);
    // Don't set ssrPass—it remains null, feature is disabled gracefully
  }
} else if (currentPreset?.ssrEnabled) {
  console.warn('⚠️ SSR Pass requested but prerequisites not met (renderer/scene/camera)');
}
```

This way:
- **Expected failures** (feature disabled by preset) are silent ✓
- **Real errors** (null renderer, bad SSRPass constructor) are logged loudly ✗
- **Future debugging** is easier because we know WHY ssrPass is null

---

## Issue 3: Copy-Paste Anti-Pattern (7 Similar Try-Catch Blocks)

### Problem

The same try-catch structure repeats for:
1. SSR Pass (lines 539-546)
2. Motion Blur Pass (lines 551-558)
3. Cascaded Shadows (lines 563-572)
4. Per-Light Bloom (lines 577-583)
5. Particle System (lines 588-595)
6. Film Effects (lines 607-614)
7. Depth of Field (lines 619-631)

### Code Smell

This violates **DRY (Don't Repeat Yourself)** and signals a missing abstraction. Each block follows this pattern:

```
1. Declare pass as null
2. Try
3.   Check if preset is enabled
4.   Instantiate pass with parameters
5.   Configure pass with preset values
6. Catch and log error
```

### Evidence of Maintenance Burden

If we need to add a prerequisite check (e.g., verify `renderer.extensions.has('EXT_color_buffer_half_float')`), we'd have to update all 7 places.

### Recommendation

**Create a unified pass initializer helper:**

```typescript
/**
 * Safely initialize a graphics pass with feature-gate and error handling.
 * @param passName Display name for logging
 * @param isEnabled Whether preset enables this feature
 * @param initializer Function that creates the pass (throws on error)
 * @returns Initialized pass or null if disabled/failed
 */
function initializeGraphicsPass<T>(
  passName: string,
  isEnabled: boolean,
  initializer: () => T
): T | null {
  if (!isEnabled) {
    return null;  // Feature disabled by preset, no logging needed
  }
  try {
    const pass = initializer();
    console.log(`✓ ${passName} initialized`);
    return pass;
  } catch (e) {
    console.error(`❌ ${passName} initialization failed:`, e);
    return null;
  }
}

// Usage
const ssrPass = initializeGraphicsPass(
  'SSR Pass',
  currentPreset.ssrEnabled,
  () => {
    const pass = new SSRPass(renderer, scene, camera, innerWidth, innerHeight);
    pass.setIntensity(currentPreset.ssrIntensity);
    pass.setParameters(currentPreset.ssrSamples, currentPreset.ssrMaxDistance, 0.1);
    pass.setEnabled(true);
    return pass;
  }
);

const motionBlurPass = initializeGraphicsPass(
  'Motion Blur Pass',
  currentPreset.motionBlurEnabled,
  () => {
    const pass = new MotionBlurPass(renderer, innerWidth, innerHeight);
    pass.setIntensity(currentPreset.motionBlurStrength);
    pass.setSamples(currentPreset.motionBlurSamples);
    pass.setEnabled(true);
    return pass;
  }
);

// Repeats for remaining 5 passes...
```

**Benefits:**
- ✓ Single point of truth for initialization logic
- ✓ Easier to add global prerequisites (renderer validation, device capability checks)
- ✓ Consistent logging and error handling
- ✓ 30-40 lines saved (~10% of the try-catch blocks)

---

## Issue 4: Null-Check Sprawl in applyQualityPreset()

### Problem

Inside `applyQualityPreset()`, there are 17+ null checks for objects that should exist by the time this function is called:

```typescript
// Lines 1901-1926
if (bloomPass) { bloomPass.enabled = ...; }
if (mainSpot) { mainSpot.castShadow = ...; }
if (ambLight) ambLight.intensity = ...;
if (fillLight) fillLight.intensity = ...;
if (rimLight) rimLight.intensity = ...;
if (ballOuterMaterial) ballOuterMaterial.emissiveIntensity = ...;
if (ballGlowMaterial) { ballGlowMaterial.emissiveIntensity = ...; }
if (backglassRenderer && currentPreset.backglassEnabled) { ... }
if (volumetricPass) { volumetricPass.enabled = ...; }
if (enhancement) { enhancement.setQualityPreset(...); }
```

### Why This Indicates a Design Problem

These null checks suggest **uncertain initialization guarantees**. If these objects are optional, they shouldn't be accessed in a quality preset handler. If they're required, they should never be null.

### The Real Question

Looking at the code, `applyQualityPreset()` is called at:
1. **Line 2014**: During game loop (every frame if FPS changes)
2. **Line 3580**: After loading a new table
3. **Line 3635**: At startup

If a null object is encountered, what should happen?

```typescript
if (bloomPass) { bloomPass.enabled = currentPreset.bloomEnabled; }
// If null: The setting silently doesn't apply. User might wonder why bloom isn't working.
```

This is **implicit failure**, which violates the principle of least surprise.

### Root Cause

These objects are declared with null initializers (defensive programming) but are *intended* to be non-null by the time quality presets are applied. The null checks are a safety net that shouldn't be needed.

### Recommendation

**Distinguish between required and optional features:**

```typescript
// ─── Required Systems (always initialized, never null) ───
const renderer = ...; // Throw if missing
const scene = ...; // Throw if missing
const camera = ...; // Throw if missing

// ─── Optional Features (may be null by design) ───
let bloomPass: UnrealBloomPass | null = null;
let ssrPass: SSRPass | null = null;

function applyQualityPreset(): void {
  try {
    const preset = profiler.getQualityPreset();
    if (lastAppliedQualityPreset === preset.name) return;
    lastAppliedQualityPreset = preset.name;

    // ─── Required Features (no null check) ───
    renderer.toneMappingExposure = preset.bloomEnabled ? 1.15 : 1.05;
    camera.far = preset.drawDistance;

    // ─── Optional Features (explicit check with logging) ───
    if (bloomPass) {
      bloomPass.enabled = preset.bloomEnabled;
      if (preset.bloomEnabled) {
        bloomPass.strength = preset.bloomStrength;
        bloomPass.radius = preset.bloomRadius;
      }
    } else if (preset.bloomEnabled && renderer.capabilities.isWebGL2) {
      // Feature was disabled but should be available
      console.warn('⚠️ Bloom Pass is null but quality preset requests it. Check initialization order.');
    }

    // Similar pattern for other optional features
  } catch (err) {
    console.error('❌ Error in applyQualityPreset:', err);
  }
}
```

---

## Issue 5: Leaky Abstractions (Exposing Internal State)

### Problem

`applyQualityPreset()` directly manipulates individual pass properties:

```typescript
bloomPass.enabled = currentPreset.bloomEnabled;
bloomPass.strength = currentPreset.bloomStrength;
bloomPass.radius = currentPreset.bloomRadius;

mainSpot.castShadow = true;
mainSpot.shadow.mapSize.set(...);
mainSpot.shadow.blurSamples = 16;

ballOuterMaterial.emissiveIntensity = currentPreset.bloomEnabled ? 0.3 : 0.1;
ballGlowMaterial.emissiveIntensity = currentPreset.bloomEnabled ? 0.6 : 0.2;
```

### Why This Is Bad

1. **Changes to pass internals break the code** — If `UnrealBloomPass` renames `strength` to `intensity`, the code breaks
2. **Business logic spread across main.ts** — The logic "when bloom is disabled, set emissive intensity to 0.1" is hidden inside `applyQualityPreset()`
3. **Hard to test** — Can't test bloom quality application without running the full main loop
4. **No validation** — If `currentPreset.bloomStrength` is invalid, we discover it at runtime

### Example of Hidden Complexity

```typescript
// What is the relationship between these?
bloomPass.strength = currentPreset.bloomStrength;
ballGlowMaterial.emissiveIntensity = currentPreset.bloomEnabled ? 0.6 : 0.2;
renderer.toneMappingExposure = currentPreset.bloomEnabled ? 1.15 : 1.05;

// Why these specific numbers? Are they coordinated? Can they be tweaked independently?
// No documentation.
```

### Recommendation

**Encapsulate quality preset application within the systems themselves:**

Each graphics system should have a method like `applyQualityPreset()`:

```typescript
// In a BloomSystem wrapper class
class BloomRenderer {
  constructor(private bloomPass: UnrealBloomPass, private materials: Material[]) {}

  applyQualityPreset(preset: QualityPreset): void {
    this.bloomPass.enabled = preset.bloomEnabled;
    if (preset.bloomEnabled) {
      this.bloomPass.strength = preset.bloomStrength;
      this.bloomPass.radius = preset.bloomRadius;
      this.materials.forEach(m => {
        if (m instanceof MeshStandardMaterial && m.userData.isGlowing) {
          m.emissiveIntensity = 0.6;
        }
      });
    } else {
      this.materials.forEach(m => {
        if (m instanceof MeshStandardMaterial && m.userData.isGlowing) {
          m.emissiveIntensity = 0.1;
        }
      });
    }
    // Tone mapping is a renderer concern, not bloom
  }
}

// In main.ts
const bloomRenderer = new BloomRenderer(bloomPass, [ballGlowMaterial, ...]);

function applyQualityPreset(): void {
  const preset = profiler.getQualityPreset();
  bloomRenderer.applyQualityPreset(preset);
  shadowRenderer.applyQualityPreset(preset);
  particleRenderer.applyQualityPreset(preset);
  // etc.
}
```

**Benefits:**
- ✓ Encapsulation: bloom logic is co-located with bloom renderer
- ✓ Testability: can test `BloomRenderer.applyQualityPreset()` in isolation
- ✓ Maintainability: if bloom internals change, only one place needs update
- ✓ Clear intent: `bloomRenderer.applyQualityPreset(preset)` is self-documenting

---

## Issue 6: Parameter Sprawl in Quality Preset

### Problem

The `QualityPreset` interface (src/profiler.ts lines 13-82) has grown to 50+ properties:

```typescript
export interface QualityPreset {
  name: 'low' | 'medium' | 'high' | 'ultra';
  label: string;
  shadowsEnabled: boolean;
  shadowMapSize: number;
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  // ... 44 more properties ...
  ssrEnabled: boolean;
  ssrIntensity: number;
  ssrSamples: number;
  ssrMaxDistance: number;
  motionBlurEnabled: boolean;
  motionBlurStrength: number;
  motionBlurSamples: number;
  // ... and on ...
}
```

### Why This Is Problematic

1. **Hard to understand** — New developers can't tell which properties are related
2. **Hard to maintain** — Adding a new feature requires adding 3-5 new properties
3. **Hard to validate** — No encapsulation of related properties (e.g., blur strength/samples should be validated together)

### Recommendation

**Group properties by subsystem:**

```typescript
export interface BloomConfig {
  enabled: boolean;
  strength: number;
  radius: number;
  threshold: number;
}

export interface ShadowConfig {
  enabled: boolean;
  mapSize: number;
  blurSamples: number;
  cascadeCount?: number;
  maxDistance?: number;
}

export interface MotionBlurConfig {
  enabled: boolean;
  strength: number;
  samples: number;
}

export interface QualityPreset {
  name: 'low' | 'medium' | 'high' | 'ultra';
  label: string;
  targetFPS: number;
  pixelRatioCap: number;

  bloom: BloomConfig;
  shadows: ShadowConfig;
  motionBlur: MotionBlurConfig;
  ssr: SSRConfig;
  volumetric: VolumetricLightingConfig;
  particles: ParticleConfig;
  // ... etc
}
```

Then in `applyQualityPreset()`:

```typescript
function applyQualityPreset(): void {
  const preset = profiler.getQualityPreset();

  bloomRenderer?.applyConfig(preset.bloom);
  shadowRenderer?.applyConfig(preset.shadows);
  motionBlurRenderer?.applyConfig(preset.motionBlur);
  // ...
}
```

This reduces cognitive load and makes it obvious which settings are related.

---

## Summary of Findings

| Issue | Severity | Lines | Type | Fix Effort |
|-------|----------|-------|------|-----------|
| Redundant state caching | 🔴 High | 368-369, 1891 | Logic | 30 min |
| Try-catch as band-aid | 🟠 High | 539-631 | Pattern | 2 hours |
| Copy-paste blocks (7x) | 🟠 High | 539-631 | Smell | 1 hour |
| Null-check sprawl | 🟡 Medium | 1901-1972 | Design | 2 hours |
| Leaky abstractions | 🟡 Medium | 1901-1972 | Architecture | 4 hours |
| Parameter sprawl | 🟡 Medium | profiler.ts:13-82 | Structure | 2 hours |

---

## Action Plan (Priority Order)

### Phase 1: Quick Fixes (30-60 min)
1. **Remove module-level `currentPreset` cache** (line 368)
   - Audit all 6 uses for stale data issues
   - Replace with `profiler.getQualityPreset()`

2. **Add initialization logging** (lines 539-631)
   - Replace generic try-catch logs with specific feature messages
   - Add prerequisite checks for required objects (renderer, scene, camera)

### Phase 2: Refactoring (2-3 hours)
3. **Create `initializeGraphicsPass()` helper**
   - Consolidate 7 try-catch blocks into one reusable function
   - Update all pass initialization calls

4. **Audit null-check usage in `applyQualityPreset()`**
   - Separate required vs. optional features
   - Add warning logs for unexpected null values
   - Document initialization guarantees

### Phase 3: Architecture (4-6 hours)
5. **Create subsystem wrappers** (BloomRenderer, ShadowRenderer, etc.)
   - Move quality preset application logic into each system
   - Reduce main.ts complexity
   - Improve testability

6. **Refactor QualityPreset structure**
   - Group properties by subsystem
   - Add validation/type safety
   - Update profiler.ts

---

## Files to Review

1. **src/main.ts** (3,796 lines)
   - Lines 360-410: Global initialization
   - Lines 530-630: Pass initialization
   - Lines 1889-1976: `applyQualityPreset()`
   - Lines 2000-2050: Game loop

2. **src/profiler.ts**
   - Lines 13-82: `QualityPreset` interface definition
   - Lines 295-300: Profiler initialization
   - Lines 387-398: Preset getter/setter

3. **Potential new files:**
   - `src/graphics/graphics-pass-initializer.ts` (helper for Phase 2.3)
   - `src/graphics/bloom-renderer.ts` (wrapper for Phase 3)
   - `src/graphics/shadow-renderer.ts` (wrapper for Phase 3)

---

## Conclusion

The Polish Suite integration demonstrates good **intentions** (defensive programming, feature gating) but poor **execution** (redundant state, masking errors, copy-paste code). The fixes are straightforward and follow established patterns:

1. ✓ **Eliminate redundant state** → Source of truth principle
2. ✓ **Replace try-catch band-aids** → Feature-gate pattern
3. ✓ **Consolidate repetition** → DRY principle + helper functions
4. ✓ **Encapsulate quality logic** → Separation of concerns

These improvements will reduce main.ts from 3,796 to ~3,400 lines while improving maintainability and correctness.
