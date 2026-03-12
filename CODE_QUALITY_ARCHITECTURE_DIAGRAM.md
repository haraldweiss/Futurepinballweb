# Code Quality Review: Architecture Diagrams

This document visualizes the current and proposed architecture of the Polish Suite integration.

---

## Current Architecture (BEFORE Refactoring)

### State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Startup                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │  Get Quality Preset          │
        │  (profiler.getQualityPreset) │
        └──────────┬──────────────────┘
                   │
        ┌──────────▼──────────┐
        │ currentPreset = ... │  ◄─── Line 368: Module-level cache (NEVER UPDATED!)
        │ (Global variable)   │
        └────────┬─────┬──────┘
                 │     │
          ┌──────▼─┐   │
          │ SSR    │   │
          │ Init   │   │
          └────────┘   │
          ┌──────────────────────────────────────┐
          │ Reads stale currentPreset ────────────┼───► PROBLEM!
          └──────────────────────────────────────┘
```

### Error Handling Flow (7 Similar Blocks)

```
┌────────────────────────────────────────────────────────┐
│  Pass Initialization (SSR, MotionBlur, Shadows, etc.)  │
└─────────────────────┬──────────────────────────────────┘
                      │
        ┌─────────────▼──────────────┐
        │  try { ... }               │  ◄─── Catches ALL errors
        │    if (currentPreset &&    │       (good intentions, bad execution)
        │        .ssrEnabled)        │
        │    {                       │
        │      new SSRPass(...)      │
        │      configure(...)        │
        │    }                       │
        │  } catch (e) {             │
        │    console.error(...)      │  ◄─── Vague error message
        │  }                         │
        └──────┬────────────────────┘
               │
        ┌──────▼───────────────────┐
        │ If error: pass = null    │
        │ If disabled: pass = null │  ◄─── Same result!
        │                          │       Can't distinguish causes
        └──────────────────────────┘
```

### Quality Preset Application Flow

```
┌───────────────────────────────────────────────────────────┐
│                applyQualityPreset()                       │
│             (Main.ts, Lines 1889-1976)                   │
└─────────────────────┬─────────────────────────────────────┘
                      │
          ┌───────────▼─────────────┐
          │ Get fresh currentPreset  │  ◄─── Different from startup!
          └───────┬─────────────────┘
                  │
    ┌─────────────┼─────────────────┐
    │             │                 │
    ▼             ▼                 ▼
┌────────┐   ┌────────┐       ┌──────────┐
│ Bloom  │   │Shadows │ ...   │Materials │
│(if x)  │   │(if x)  │       │(if x)    │
└────────┘   └────────┘       └──────────┘
    │             │                 │
    └─────────────┼─────────────────┘
                  │
          ┌───────▼─────────┐
          │ Return          │
          │ (Side effects   │
          │  applied)       │
          └─────────────────┘

PROBLEM: Quality logic is scattered across 72 lines
         Null checks everywhere (17+ if statements)
         Mixed concerns (bloom/shadows/lighting/materials)
```

---

## Proposed Architecture (AFTER Refactoring)

### Cleaner State Management

```
┌──────────────────────────────────┐
│  Profiler                        │
│  (Single source of truth)        │
└────────────┬─────────────────────┘
             │
    ┌────────▼────────┐
    │ getQualityPreset │
    │ (always fresh)   │
    └────────┬────────┘
             │
    ┌────────▼──────────────────────┐
    │ QualityPreset Interface        │
    │                               │
    │  ├─ name                      │
    │  ├─ label                     │
    │  ├─ bloom: BloomConfig        │  ◄─── Organized by subsystem
    │  ├─ shadows: ShadowConfig     │
    │  ├─ motionBlur: MotionBlurCfg │
    │  ├─ particles: ParticleConfig │
    │  └─ ...                       │
    └────────┬─────────────────────┘
             │
    ┌────────▼──────────────────────────────┐
    │ applyQualityPreset()                  │
    │                                       │
    │  1. Get fresh preset from profiler    │
    │  2. Delegate to subsystem handlers    │
    │     - applyBloomPreset(preset.bloom)  │
    │     - applyShadowPreset(preset.shadow)│
    │     - applyMotionBlurPreset(...)      │
    │  3. Each handler owns its logic       │
    └───────────────────────────────────────┘
```

### Error Handling with Feature Gates

```
┌──────────────────────────────────────┐
│  initializeGraphicsPass<T>()         │
│  (Unified helper function)           │
└─────────────────────┬────────────────┘
                      │
        ┌─────────────▼──────────────┐
        │ Check: isEnabled?          │
        ├─────────────┬──────────────┤
        │ NO          │ YES          │
        │             │              │
        ▼             ▼              │
    return null   Check: prereqs?   │
    (silent)      │                 │
                  ├──────┬──────────┘
                  │      │
              Missing  Present
                  │      │
                  ▼      ▼
              log:warn  try { ... }
              return    return pass
              null      catch error
                        log:error
                        return null

BENEFIT: Clear distinction between:
  - Feature disabled (silent)
  - Missing prereqs (warning)
  - Real errors (error)
```

### Subsystem Encapsulation

```
┌─────────────────────────────────────────────────────────────┐
│                    applyQualityPreset()                     │
│                   (Thin coordination layer)                 │
└──────────────┬──────────────┬──────────────┬───────────────┘
               │              │              │
      ┌────────▼────┐ ┌──────▼────┐ ┌──────▼────┐
      │ applyBloom  │ │ applyShadow│ │ applyDMD  │
      │ Preset()    │ │ Preset()   │ │ Preset()  │
      └────────┬────┘ └──────┬────┘ └──────┬────┘
               │             │             │
      ┌────────▼────────┐    │             │
      │ BloomRenderer   │    │             │
      │                │    │             │
      │ - bloomPass    │    │             │
      │ - materials    │    │             │
      │                │    │             │
      │ applyPreset()  │    │             │
      │ {              │    │             │
      │   // All bloom │    │             │
      │   // logic     │    │             │
      │   // in one    │    │             │
      │   // place     │    │             │
      │ }              │    │             │
      └────────────────┘    │             │
                     ┌──────▼────────┐    │
                     │ShadowRenderer │    │
                     │               │    │
                     │ applyPreset() │    │
                     │ {             │    │
                     │   // Shadow   │    │
                     │   // logic    │    │
                     │ }             │    │
                     └───────────────┘    │
                              ┌──────────▼────────┐
                              │  DMDRenderer      │
                              │                   │
                              │ applyPreset()     │
                              │ {                 │
                              │   // DMD logic    │
                              │ }                 │
                              └───────────────────┘

BENEFIT:
- Each system owns its quality logic
- No null checks in main function
- Easy to test independently
- Easy to modify/extend
```

---

## Data Flow Comparison

### BEFORE: Scattered, Dependent on Global State

```
Startup
  ├─ Initialize profiler
  ├─ Cache currentPreset (Line 368)  ◄─ PROBLEM: Never updated
  ├─ Initialize SSR (reads stale cache)
  ├─ Initialize MotionBlur (reads stale cache)
  └─ ...
              │
              │ (Later, after user changes preset)
              │
User Changes Preset
  └─ profiler.setQualityPreset('low')  ◄─ Only updates profiler
     └─ applyQualityPreset()
         └─ Gets fresh preset (finally!)
            ├─ bloomPass.enabled = preset.bloomEnabled
            ├─ mainSpot.castShadow = preset.shadowsEnabled  (if mainSpot)
            ├─ ambLight.intensity = ...  (if ambLight)
            └─ ...17 more null checks...

PROBLEM: 7 passes initialized with stale data
         Quality changes apply to some systems but not others
         Null checks everywhere
```

### AFTER: Clean, Centralized State

```
Startup
  ├─ Initialize profiler  ◄─ Single source of truth
  └─ initializeGraphicsPass('SSR', preset, enabled, initializer)
     └─ Calls profiler.getQualityPreset() when needed (fresh!)
              │
              │ (Later, after user changes preset)
              │
User Changes Preset
  └─ profiler.setQualityPreset('low')  ◄─ Updates single source
     └─ applyQualityPreset()
         ├─ applyBloomPreset(preset.bloom)   ◄─ Encapsulated
         ├─ applyShadowPreset(preset.shadow) ◄─ One check each
         ├─ applyMotionBlurPreset(...)       ◄─ Clear responsibility
         └─ ...

BENEFIT: All systems see consistent preset state
         Each system handles its own null checks
         Single point of failure = profiler
```

---

## Dependency Graph

### BEFORE: Tangled Dependencies

```
main.ts (3,796 lines)
├─ THREE.js objects
│  ├─ scene
│  ├─ renderer
│  ├─ camera
│  └─ various lights
├─ Graphics passes (7 types, 100+ lines of initialization)
│  ├─ bloomPass
│  ├─ ssrPass
│  ├─ motionBlurPass
│  ├─ cascadedShadowMapper
│  ├─ perLightBloomPass
│  ├─ particleSystem
│  ├─ filmEffectsPass
│  └─ dofPass
├─ Materials
│  ├─ ballOuterMaterial
│  ├─ ballGlowMaterial
│  └─ ...
├─ Systems
│  ├─ profiler
│  ├─ backglassRenderer
│  └─ others...
└─ applyQualityPreset() (tangled connections)
   ├─ Reads from profiler
   ├─ Writes to all 7 passes
   ├─ Writes to all materials
   ├─ Writes to all lights
   └─ Hard to test, hard to change
```

### AFTER: Clean Separation of Concerns

```
main.ts (coordinating layer, ~3,400 lines)
├─ Initialize profiler  ◄─ Single source of truth
├─ Initialize graphics passes (using helper)
│  └─ initializeGraphicsPass() ✓ Unified
├─ Initialize systems
└─ Coordinate quality preset application
   ├─ applyQualityPreset()  ◄─ Thin coordinator
   │  ├─ Calls applyBloomPreset()
   │  ├─ Calls applyShadowPreset()
   │  └─ ...
   │
   └─ Each handler encapsulates its own logic
      ├─ applyBloomPreset()
      │  └─ Knows about bloomPass, materials
      ├─ applyShadowPreset()
      │  └─ Knows about mainSpot, renderer.shadowMap
      └─ ...

BENEFIT:
- Clear module boundaries
- Easy to test each handler independently
- Profiler is the only authority
- Easy to add new subsystems
```

---

## Complexity Reduction

### Cyclomatic Complexity

```
BEFORE:
applyQualityPreset() {           Line count: 86 lines
  try {                          Cyclomatic complexity: 18
    if (bloomPass) {             (multiple nested if statements)
      if (bloomEnabled) {
        if (currentPreset) {
          bloomPass.strength = ...
        }
      }
    }
    if (mainSpot) {
      if (shadowsEnabled) {
        mainSpot.castShadow = true
      }
    }
    if (ambLight) { ... }
    if (fillLight) { ... }
    if (rimLight) { ... }
    if (ballOuterMaterial) { ... }
    if (ballGlowMaterial) { ... }
    if (backglassRenderer) { ... }
    if (volumetricPass) { ... }
    ...17 more if statements...
  } catch (err) { ... }
}

AFTER:
applyQualityPreset() {           Line count: 12 lines
  const preset = ...;            Cyclomatic complexity: 2
  if (lastApplied === preset.name)  (simple early return)
    return;
  applyBloomPreset(preset.bloom);     Calls to handlers
  applyShadowPreset(preset.shadow);
  ...
}

applyBloomPreset() {             Line count: 10 lines
  if (!bloomPass) return;         Cyclomatic complexity: 2
  bloomPass.enabled = ...;        Clear responsibility
  if (enabled) {
    bloomPass.strength = ...;
  }
}

TOTAL REDUCTION:
- Main function: 86 → 12 lines (-86%)
- Cyclomatic complexity: 18 → 2 (-89%)
- Each handler: ~10 lines, complexity 1-2
- Total code is more, but each piece is simpler
```

---

## Testing Coverage

### BEFORE: Hard to Test

```
applyQualityPreset()
├─ Depends on: bloomPass, mainSpot, ambLight, fillLight, rimLight, ...
├─ Depends on: profiler.getQualityPreset()
├─ Side effects on: 7+ objects
└─ Can't test in isolation (requires full scene setup)

Testing cost: HIGH
- Need to mock 10+ objects
- Hard to verify which setter was called
- Integration test only, no unit tests
```

### AFTER: Easy to Test

```
applyBloomPreset(config: BloomConfig)
├─ Depends on: bloomPass (optional), materials (optional)
├─ Depends on: config parameter only
└─ Side effects on: bloomPass, materials

Testing cost: LOW
- Can test with null bloomPass (should return quietly)
- Can test with mock bloomPass (verify setters called)
- Can test config values (verify bounds checking)
- Unit tests possible without full scene

applyShadowPreset(config: ShadowConfig)
├─ Depends on: mainSpot (optional), renderer.shadowMap
├─ Depends on: config parameter only
└─ Side effects on: mainSpot, renderer.shadowMap

Unit tests:
✓ null mainSpot → returns quietly
✓ enabled true → calls mainSpot.castShadow = true
✓ shadowMapSize 512 → calls mapSize.set(512, 512)
✓ enabled false → calls mainSpot.castShadow = false
```

---

## Summary: Before vs. After

| Aspect | BEFORE | AFTER | Improvement |
|---|---|---|---|
| **State Sources** | 2 (global cache + profiler) | 1 (profiler only) | ✓ Cleaner |
| **Try-Catch Blocks** | 7 similar patterns | 1 unified helper | ✓ DRY principle |
| **Lines of Code** | 3,796 total | ~3,700 total | ✓ Slightly smaller |
| **Complexity** | High tangled | Low modular | ✓ Much clearer |
| **Null Checks** | 50+ scattered | 7 encapsulated | ✓ Contained |
| **Testability** | 0 unit tests possible | 7+ unit tests possible | ✓ Testable |
| **Maintainability** | Hard (scattered logic) | Easy (encapsulated) | ✓ Easier |
| **Error Messages** | Generic | Specific | ✓ Better |

---

## Key Insights

### What was wrong?

1. **Premature caching**: Trying to cache `currentPreset` globally assumes it won't change during initialization
2. **Catch-all error handling**: Catching all errors masks real failures
3. **No abstraction**: 7 similar blocks instead of 1 helper function
4. **Leaky internals**: Quality logic spread across 70 lines instead of encapsulated
5. **Flat interface**: 50+ properties instead of organized groups

### What gets better?

1. **Single source of truth**: Profiler is the only authority
2. **Fail-fast semantics**: Distinguish feature-disabled vs. real errors
3. **DRY principle**: One helper instead of 7 blocks
4. **Encapsulation**: Each system owns its quality logic
5. **Organized data**: Subsystems have their own config types

### Why it matters?

**For current developers**:
- Easier to debug (know exactly what logic applies to what feature)
- Easier to modify (change one handler, not scattered if-statements)
- Safer refactoring (encapsulated logic can't affect other systems)

**For future developers**:
- Understand at a glance how quality presets work
- Can add new features without touching existing code
- Can fix bugs in one subsystem without affecting others

