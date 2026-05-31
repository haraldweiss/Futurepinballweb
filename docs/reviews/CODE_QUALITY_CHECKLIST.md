# Code Quality Review: Refactoring Checklist

**Project**: Future Pinball Web - Polish Suite Integration
**Review Date**: 2026-03-11
**Status**: Ready for Refactoring

---

## Phase 1: Remove Redundant State (30 min, 🟢 LOW RISK)

### Checklist

- [ ] **Step 1a**: Locate redundant cache
  - [ ] File: `src/main.ts`, Lines 368-369
  - [ ] Verify module-level `currentPreset` declaration exists
  - [ ] Verify debug log exists

- [ ] **Step 1b**: Find all usages of module-level cache
  ```bash
  # Run this to find all references
  grep -n "currentPreset" src/main.ts | grep -v "const currentPreset = profiler"
  ```
  - [ ] Expected ~6 usages (lines 540, 552, 564, 578, 589, 608, 620)
  - [ ] Verify no usage in `applyQualityPreset()` (it has its own)

- [ ] **Step 1c**: Replace each usage with fresh call
  - [ ] Line 540: `if (currentPreset && currentPreset.ssrEnabled)` → `const p = profiler.getQualityPreset(); if (p.ssrEnabled)`
  - [ ] Line 552: Same for Motion Blur
  - [ ] Line 564: Same for Cascaded Shadows
  - [ ] Line 578: Same for Per-Light Bloom
  - [ ] Line 589: Same for Particles
  - [ ] Line 608: Same for Film Effects
  - [ ] Line 620: Same for Depth of Field

- [ ] **Step 1d**: Delete module-level declaration
  - [ ] Delete lines 368-369 (the cache and debug log)
  - [ ] Verify file still compiles: `npm run build`

- [ ] **Step 1e**: Test quality change propagation
  - [ ] Load a table
  - [ ] Open devtools console
  - [ ] Run: `(window as any).setQualityPreset('low')`
  - [ ] Verify bloom/shadows disable correctly
  - [ ] Run: `(window as any).setQualityPreset('ultra')`
  - [ ] Verify bloom/shadows enable with high settings

**Affected files**: `src/main.ts`
**Lines deleted**: 2
**Build time**: ~1s

---

## Phase 2: Consolidate Try-Catch Blocks (60 min, 🟡 MEDIUM RISK)

### Checklist

- [ ] **Step 2a**: Create helper function
  - [ ] Add after line 365 (before graphics pass declarations)
  - [ ] Copy from CODE_QUALITY_REFACTORING_EXAMPLES.md
  - [ ] Function signature: `initializeGraphicsPass<T>(name, preset, isEnabled, initializer)`
  - [ ] Verify TypeScript types: `npm run build`

- [ ] **Step 2b**: Refactor SSR Pass (lines 539-546)
  - [ ] Delete old try-catch block
  - [ ] Insert new call using helper
  - [ ] Verify function compiles

- [ ] **Step 2c**: Refactor Motion Blur Pass (lines 551-558)
  - [ ] Delete old try-catch block
  - [ ] Insert new call using helper
  - [ ] Verify function compiles

- [ ] **Step 2d**: Refactor Cascaded Shadows (lines 563-572)
  - [ ] Delete old try-catch block
  - [ ] Insert new call using helper
  - [ ] Note: This initializes differently than others
  - [ ] Verify function compiles

- [ ] **Step 2e**: Refactor Per-Light Bloom (lines 577-583)
  - [ ] Delete old try-catch block
  - [ ] Insert new call using helper
  - [ ] Verify function compiles

- [ ] **Step 2f**: Refactor Particle System (lines 588-595)
  - [ ] Delete old try-catch block
  - [ ] Insert new call using helper
  - [ ] Note: Checks if system exists before calling setQualityPreset
  - [ ] Verify function compiles

- [ ] **Step 2g**: Refactor Film Effects (lines 607-614)
  - [ ] Delete old try-catch block
  - [ ] Insert new call using helper
  - [ ] Note: Adds shader pass to composer
  - [ ] Verify function compiles

- [ ] **Step 2h**: Refactor Depth of Field (lines 619-631)
  - [ ] Delete old try-catch block
  - [ ] Insert new call using helper
  - [ ] Note: Checks device support
  - [ ] Verify function compiles

- [ ] **Step 2i**: Full build test
  ```bash
  npm run build
  ```
  - [ ] Zero TypeScript errors
  - [ ] Build time < 2s
  - [ ] Bundle size unchanged (±5%)

- [ ] **Step 2j**: Runtime test on all quality presets
  - [ ] Load table
  - [ ] Manually test each preset (low, medium, high, ultra)
  - [ ] Verify each pass initializes or is disabled as expected
  - [ ] Check console for warnings (should see init messages only)

**Affected files**: `src/main.ts`
**Lines deleted**: ~80
**Lines added**: ~30 (net -50)
**Build time**: ~1s

---

## Phase 3: Break Up applyQualityPreset() (60 min, 🟡 MEDIUM RISK)

### Checklist

- [ ] **Step 3a**: Create helper functions
  - [ ] Add `applyBloomPreset(preset)` after line 1888
  - [ ] Add `applyShadowPreset(preset)`
  - [ ] Add `applyLightingPreset(preset)`
  - [ ] Add similar helpers for: particles, volumetric, backglass, dmd, etc.
  - [ ] Each helper starts with null-check for optional objects

- [ ] **Step 3b**: Refactor applyQualityPreset() body
  - [ ] Get fresh preset from profiler
  - [ ] Check lastAppliedQualityPreset (early return if no change)
  - [ ] Log quality preset change
  - [ ] Call each helper function
  - [ ] Simplify from 80 lines to ~15 lines

- [ ] **Step 3c**: Test refactored function
  ```bash
  npm run build
  ```
  - [ ] Zero TypeScript errors
  - [ ] Load table
  - [ ] Call applyQualityPreset() via: `(window as any).applyQualityPreset?.()`
  - [ ] Verify all features respond to preset change
  - [ ] Check console: should see appropriate messages for each system

- [ ] **Step 3d**: Verify no change in behavior
  - [ ] Load table on low preset
  - [ ] Verify bloom is disabled
  - [ ] Verify shadows are disabled
  - [ ] Switch to ultra preset
  - [ ] Verify bloom is enabled
  - [ ] Verify shadows are enabled with high resolution
  - [ ] FPS should be similar to before refactoring

**Affected files**: `src/main.ts`
**Lines changed**: ~100 (80 in main function, +50 in helpers, net -30)
**Build time**: ~1s

---

## Phase 4: Restructure QualityPreset (90 min, 🟠 HIGHER RISK)

### Checklist

- [ ] **Step 4a**: Add new config interfaces to profiler.ts
  - [ ] Add BloomConfig, ShadowConfig, MotionBlurConfig, etc.
  - [ ] Each interface has its relevant properties
  - [ ] Reference: CODE_QUALITY_REFACTORING_EXAMPLES.md
  - [ ] Verify TypeScript: `npm run build`

- [ ] **Step 4b**: Update QualityPreset interface
  - [ ] Replace flat properties with nested configs
  - [ ] Keep name, label, targetFPS, pixelRatioCap at top level
  - [ ] Add: bloom: BloomConfig, shadows: ShadowConfig, etc.
  - [ ] Mark old properties as deprecated (optional)
  - [ ] Verify TypeScript: `npm run build`

- [ ] **Step 4c**: Update low preset definition
  - [ ] Restructure: `bloom: { enabled: false, strength: 0.5, ... }`
  - [ ] Update all subsystems
  - [ ] Verify TypeScript: `npm run build`

- [ ] **Step 4d**: Update medium preset definition
  - [ ] Restructure with nested configs
  - [ ] Verify TypeScript: `npm run build`

- [ ] **Step 4e**: Update high preset definition
  - [ ] Restructure with nested configs
  - [ ] Verify TypeScript: `npm run build`

- [ ] **Step 4f**: Update ultra preset definition
  - [ ] Restructure with nested configs
  - [ ] Verify TypeScript: `npm run build`

- [ ] **Step 4g**: Update all accessors in main.ts
  - [ ] Find all references to `currentPreset.bloomEnabled` etc.
  - [ ] Change to `currentPreset.bloom.enabled`
  - [ ] Same for shadows, particles, etc.
  - [ ] Use find/replace carefully: `currentPreset.(.+?)Enabled` → `currentPreset.SUBSYS.enabled`

- [ ] **Step 4h**: Full build test
  ```bash
  npm run build
  ```
  - [ ] Zero TypeScript errors
  - [ ] Build time < 2s

- [ ] **Step 4i**: Runtime test all presets
  - [ ] Load table on low preset
  - [ ] Verify disable all effects correctly
  - [ ] Load on medium preset
  - [ ] Verify balanced settings
  - [ ] Load on ultra preset
  - [ ] Verify all effects enabled with high quality

**Affected files**:
- `src/profiler.ts` (add interfaces, update presets)
- `src/main.ts` (update all preset accesses)

**Lines changed**: ~150 (profiler.ts), ~50 (main.ts)
**Build time**: ~1s

---

## Phase 5: Testing & Validation (30 min after each phase)

### Test Checklist (run after each phase)

- [ ] **Code Compilation**
  ```bash
  npm run build 2>&1 | tee build.log
  ```
  - [ ] Zero errors
  - [ ] Zero warnings (or document expected warnings)
  - [ ] Build time < 2.5s

- [ ] **Visual Regression** (on desktop, FHD monitor)
  - [ ] Load each table
  - [ ] Compare with screenshot from before refactoring
  - [ ] Bloom should look the same
  - [ ] Shadows should look the same
  - [ ] Particles should look the same

- [ ] **Quality Preset Switching** (in-game)
  - [ ] Load table
  - [ ] Open devtools
  - [ ] Run: `(window as any).setQualityPreset('low')`
  - [ ] Verify: bloom disabled, shadows disabled, fewer particles
  - [ ] Run: `(window as any).setQualityPreset('medium')`
  - [ ] Verify: bloom enabled (weak), shadows enabled (512px), medium particles
  - [ ] Run: `(window as any).setQualityPreset('high')`
  - [ ] Verify: bloom enabled, shadows enabled (1024px), more particles
  - [ ] Run: `(window as any).setQualityPreset('ultra')`
  - [ ] Verify: bloom strong, shadows enabled (2048px), max particles, advanced effects

- [ ] **Performance Metrics** (open profiler with P key)
  - [ ] Desktop (Chrome): FPS stays 60 on high/ultra
  - [ ] Tablet (throttled): FPS stays 50+ on medium
  - [ ] Mobile (slow): FPS auto-downgrades to low/medium

- [ ] **Console Logging**
  - [ ] Open devtools console
  - [ ] Load table
  - [ ] Should see: "✓ [Feature] initialized" or feature disabled message
  - [ ] Should NOT see unhandled errors
  - [ ] On preset change, should see: "⚙️ Applying quality preset: [name]"

- [ ] **Mobile Testing** (if available)
  - [ ] Load on phone/tablet
  - [ ] Verify quality auto-selects appropriately
  - [ ] Verify no performance issues (constant FPS drop)
  - [ ] Verify visual quality acceptable

- [ ] **Table Persistence**
  - [ ] Load table on high preset
  - [ ] Close browser tab
  - [ ] Reopen
  - [ ] Verify preset persisted correctly
  - [ ] Verify all features render correctly

### Rollback Procedure

If any phase causes issues:

```bash
# Revert to last known good state
git diff src/main.ts | head -50  # Review what changed
git checkout -- src/main.ts       # Undo if needed
npm run build                     # Verify revert worked
```

---

## Success Criteria

### Phase 1 Complete ✓ if:
- [ ] Build succeeds with zero errors
- [ ] No runtime errors in console
- [ ] Quality changes propagate immediately (test with setQualityPreset)

### Phase 2 Complete ✓ if:
- [ ] Build succeeds with zero errors
- [ ] All 7 passes initialize or disable correctly
- [ ] No change in visual quality between before/after
- [ ] Console shows appropriate init messages (no errors)

### Phase 3 Complete ✓ if:
- [ ] Build succeeds with zero errors
- [ ] applyQualityPreset() works identically to before
- [ ] All helpers execute correctly on preset change
- [ ] Console shows organized output (separate lines for bloom, shadows, etc.)

### Phase 4 Complete ✓ if:
- [ ] Build succeeds with zero errors
- [ ] All preset definitions work correctly
- [ ] New nested structure is used throughout
- [ ] Visual quality and performance unchanged

### Full Refactoring Complete ✓ if:
- [ ] All 4 phases pass
- [ ] No regression in visual quality
- [ ] No regression in performance (FPS within 2%)
- [ ] Code is significantly more maintainable
- [ ] New developers can understand code faster

---

## Documentation Updates

After completing refactoring:

- [ ] Update MEMORY.md with refactoring summary
- [ ] Update any internal docs referencing old patterns
- [ ] Add code comments explaining new structure
- [ ] Document QualityPreset interface changes
- [ ] Update developer onboarding if applicable

---

## Final Validation

Run comprehensive test suite:

```bash
# Build
npm run build

# Run tests (if available)
npm test

# Check bundle size
npm run build -- --report

# Manual testing checklist
```

✓ All items checked = Ready to merge

---

## Time Estimate & Risk Summary

| Phase | Effort | Risk | Status |
|---|---|---|---|
| Phase 1 | 30 min | 🟢 Low | Ready |
| Phase 2 | 60 min | 🟡 Medium | Ready |
| Phase 3 | 60 min | 🟡 Medium | Ready |
| Phase 4 | 90 min | 🟠 Higher | Ready |
| Testing | 30 min | 🟢 Low | Ready |
| **TOTAL** | **270 min (4.5h)** | 🟡 Medium | ✓ Recommended |

---

## Notes

- **Order matters**: Do phases in order (1 → 2 → 3 → 4)
- **Test after each**: Don't skip testing between phases
- **Commit frequently**: Make a commit after each phase
- **Review carefully**: Each refactoring is safe but needs attention
- **Document changes**: Update comments and docs as you go

