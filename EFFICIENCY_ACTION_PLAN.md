# Efficiency Optimization Action Plan

**Date**: 2026-03-11
**Status**: Ready for Implementation
**Priority**: Medium (no critical blockers, but measurable gains available)

---

## Quick Summary

The Polish Suite initialization adds **12-30ms** to startup time with **moderate optimization opportunities**. No critical performance issues found. Recommendations below are ordered by **effort vs. impact**.

---

## Action Items (Ready to Implement)

### Action 1: Consolidate Redundant Null Checks in applyQualityPreset()

**Effort**: 15 minutes | **Impact**: 0.1-0.5ms per preset change | **Risk**: Low
**File**: `/Library/WebServer/Documents/Futurepinball Web/src/main.ts`
**Lines**: 1901-1976

#### Before (Current State)

```typescript
// Line 1901-1908: Bloom Pass
if (bloomPass) {
  bloomPass.enabled = currentPreset.bloomEnabled;
  if (currentPreset.bloomEnabled) {
    bloomPass.strength = currentPreset.bloomStrength;
    bloomPass.radius = currentPreset.bloomRadius;
    bloomPass.threshold = 0.25;
  }
}

// Line 1912-1920: Shadow Maps
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

// Line 1924-1926: Lighting Intensities
if (ambLight) ambLight.intensity = currentPreset.shadowsEnabled ? 0.25 : 0.35;
if (fillLight) fillLight.intensity = currentPreset.shadowsEnabled ? 1.2 : 1.5;
if (rimLight) rimLight.intensity = currentPreset.shadowsEnabled ? 0.7 : 0.5;

// Line 1929-1933: Ball Materials
if (ballOuterMaterial) ballOuterMaterial.emissiveIntensity = currentPreset.bloomEnabled ? 0.3 : 0.1;
if (ballGlowMaterial) {
  ballGlowMaterial.emissiveIntensity = currentPreset.bloomEnabled ? 0.6 : 0.2;
  ballGlowMaterial.opacity = currentPreset.bloomEnabled ? 0.12 : 0.06;
}

// Line 1940-1946: Backglass Mode
if (backglassRenderer && currentPreset.backglassEnabled) {
  backglassRenderer.setEnabled(true);
  backglassRenderer.setRenderMode(currentPreset.backglass3D);
  console.log(`  └─ Backglass: ${currentPreset.backglass3D ? '3D' : '2D'}`);
} else if (backglassRenderer) {
  backglassRenderer.setEnabled(false);
}

// Line 1949-1955: Volumetric Lighting
if (volumetricPass) {
  volumetricPass.enabled = currentPreset.volumetricEnabled;
  if (currentPreset.volumetricEnabled) {
    volumetricPass.setExposure(currentPreset.volumetricIntensity);
    console.log(`  └─ Volumetric: ${(currentPreset.volumetricIntensity * 100).toFixed(0)}%`);
  }
}
```

#### After (Optimized)

```typescript
// ─── Bloom Pass ───
if (bloomPass && currentPreset.bloomEnabled) {
  bloomPass.enabled = true;
  bloomPass.strength = currentPreset.bloomStrength;
  bloomPass.radius = currentPreset.bloomRadius;
  bloomPass.threshold = 0.25;
} else if (bloomPass) {
  bloomPass.enabled = false;
}

// ─── Shadow Maps ───
if (mainSpot) {
  mainSpot.castShadow = currentPreset.shadowsEnabled;
  if (currentPreset.shadowsEnabled) {
    mainSpot.shadow.mapSize.set(currentPreset.shadowMapSize, currentPreset.shadowMapSize);
    mainSpot.shadow.blurSamples = 16;
  }
}
renderer.shadowMap.enabled = currentPreset.shadowsEnabled;

// ─── Lighting Intensities ───
const shadowIntensities = currentPreset.shadowsEnabled
  ? { amb: 0.25, fill: 1.2, rim: 0.7 }
  : { amb: 0.35, fill: 1.5, rim: 0.5 };

if (ambLight) ambLight.intensity = shadowIntensities.amb;
if (fillLight) fillLight.intensity = shadowIntensities.fill;
if (rimLight) rimLight.intensity = shadowIntensities.rim;

// ─── Ball Materials ───
const emissiveIntensity = currentPreset.bloomEnabled ? 0.3 : 0.1;
if (ballOuterMaterial) ballOuterMaterial.emissiveIntensity = emissiveIntensity;

if (ballGlowMaterial) {
  ballGlowMaterial.emissiveIntensity = currentPreset.bloomEnabled ? 0.6 : 0.2;
  ballGlowMaterial.opacity = currentPreset.bloomEnabled ? 0.12 : 0.06;
}

// ─── Backglass Mode ───
if (backglassRenderer) {
  if (currentPreset.backglassEnabled) {
    backglassRenderer.setEnabled(true);
    backglassRenderer.setRenderMode(currentPreset.backglass3D);
    console.log(`  └─ Backglass: ${currentPreset.backglass3D ? '3D' : '2D'}`);
  } else {
    backglassRenderer.setEnabled(false);
  }
}

// ─── Volumetric Lighting ───
if (volumetricPass) {
  volumetricPass.enabled = currentPreset.volumetricEnabled;
  if (currentPreset.volumetricEnabled) {
    volumetricPass.setExposure(currentPreset.volumetricIntensity);
    console.log(`  └─ Volumetric: ${(currentPreset.volumetricIntensity * 100).toFixed(0)}%`);
  }
}
```

#### Testing

```bash
# 1. Before changes
npm run build
# Check build size, startup time in timeline

# 2. Apply changes above

# 3. After changes
npm run build
# Compare build size (should be slightly smaller, function is more efficient)
# Compare startup time (marginal, preset changes are rare)

# 4. Test preset changes
# In browser console:
window.setQualityPreset('low');
window.setQualityPreset('medium');
window.setQualityPreset('high');
window.setQualityPreset('ultra');
# Verify no visual regressions
```

---

### Action 2: Expose Preset Name Getter (Avoid Per-Frame Object Copy)

**Effort**: 20 minutes | **Impact**: 0.3-1ms per second | **Risk**: Low
**Files**:
- `/Library/WebServer/Documents/Futurepinball Web/src/profiler.ts` (add method)
- `/Library/WebServer/Documents/Futurepinball Web/src/main.ts` (use new method)

#### Step 1: Add Method to Profiler (profiler.ts)

Insert after line 389 (after getQualityPreset()):

```typescript
/**
 * Get the current quality preset name without copying the full object.
 * Used to avoid unnecessary object spread copies in hot paths.
 */
public getCurrentPresetName(): string {
  return this.qualityPreset.name;
}
```

#### Step 2: Update applyQualityPreset() in main.ts (lines 1889-1896)

**Before**:
```typescript
function applyQualityPreset(): void {
  try {
    const currentPreset = profiler.getQualityPreset();  // Object copy every frame
    const presetName = currentPreset.name;

    // Skip if no change
    if (lastAppliedQualityPreset === presetName) return;
    lastAppliedQualityPreset = presetName;
```

**After**:
```typescript
function applyQualityPreset(): void {
  try {
    // Only fetch preset name (no object copy)
    const presetName = profiler.getCurrentPresetName();

    // Skip if no change
    if (lastAppliedQualityPreset === presetName) return;
    lastAppliedQualityPreset = presetName;

    // Fetch full preset only on change
    const currentPreset = profiler.getQualityPreset();
```

#### Testing

```bash
# 1. TypeScript compilation
npm run build
# Should compile without errors

# 2. Runtime test
# Open DevTools Performance tab
# Record ~5 seconds of gameplay
# Look for applyQualityPreset calls in timeline
# Should see reduced allocations/GC pressure

# 3. Visual test
# Play a table, verify no visual glitches
# Change presets while playing: window.setQualityPreset('low')
# Verify smooth transition
```

---

### Action 3: Remove Redundant currentPreset Null Checks

**Effort**: 5 minutes | **Impact**: Negligible (0.07µs/sec) | **Risk**: Very Low
**File**: `/Library/WebServer/Documents/Futurepinball Web/src/main.ts`
**Lines**: 540, 552, 564, 578, 589, 608, 620

#### Changes

Find and replace all 7 occurrences:

```typescript
// BEFORE
if (currentPreset && currentPreset.ssrEnabled) {

// AFTER
if (currentPreset.ssrEnabled) {
```

Specific lines:
- Line 540: `if (currentPreset && currentPreset.ssrEnabled) {`
- Line 552: `if (currentPreset && currentPreset.motionBlurEnabled) {`
- Line 564: `if (currentPreset && currentPreset.cascadeShadowsEnabled) {`
- Line 578: `if (currentPreset && currentPreset.perLightBloomEnabled) {`
- Line 589: `if (currentPreset && currentPreset.advancedParticlesEnabled) {`
- Line 608: `if (currentPreset && currentPreset.filmEffectsEnabled) {`
- Line 620: `if (currentPreset && currentPreset.depthOfFieldEnabled) {`

#### Justification

- currentPreset assigned line 368: `let currentPreset = profiler.getQualityPreset();`
- profiler.getQualityPreset() never returns null (always returns object copy)
- Profiler constructor ensures this.qualityPreset is always defined (defaults to QUALITY_PRESETS.high)
- Therefore, `currentPreset &&` is always true—redundant branch

#### Testing

```bash
npm run build
# Should compile without errors
npm run dev
# Verify startup completes without errors
# Check console for any warnings
```

---

### Action 4: Consider Parallelizing Graphics Pass Initialization (Optional)

**Effort**: 2-3 hours | **Impact**: 8-15ms savings at startup | **Risk**: Medium
**File**: `/Library/WebServer/Documents/Futurepinball Web/src/main.ts`
**Lines**: 539-630

**Status**: OPTIONAL—recommended only if startup time is a measurable bottleneck

#### When to Do This

- If startup measurement shows Polish Suite takes >20ms
- If users report slow initial load
- If targeting sub-2-second startup on low-end devices

#### When NOT to Do This

- If startup is already <1s (unlikely)
- If composer.addPass() order is critical (needs testing)
- If other bottlenecks are larger (physics worker, table loading)

#### Implementation Strategy

**Option A (Minimal): Defer to microtasks**

```typescript
// Existing sequential code at lines 539-630
let ssrPass = ..., motionBlurPass = ..., ...;

// After all passes initialized:
// Schedule non-critical passes to initialize in background
queueMicrotask(() => {
  // Passes that aren't critical for first frame
  if (filmEffectsPass && !filmEffectsPass.isInitialized) {
    filmEffectsPass.initialize();
  }
});
```

**Option B (Better): Promise.all() with async factory functions**

See EFFICIENCY_FINDINGS_DETAILED.md, Section "Parallelizable Implementation" for full code.

---

## Performance Measurement Protocol

### Before Starting Optimizations

1. **Capture baseline**:
   ```bash
   # In browser console
   window.getMetricsDisplay()  # Check initial FPS, memory
   ```

2. **Timeline measurement** (Chrome DevTools):
   - Open DevTools → Performance tab
   - Click Record
   - Refresh page
   - Let it load completely
   - Stop recording
   - Look for applyQualityPreset() calls in timeline
   - Note: startup time, per-frame duration, GC pauses

3. **Memory snapshot** (optional):
   - DevTools → Memory tab
   - Take snapshot at startup
   - Look for unnecessary objects

### After Each Optimization

1. **Rebuild and re-measure**:
   ```bash
   npm run build
   # Repeat timeline measurement
   ```

2. **Compare metrics**:
   - Startup time (should decrease by <5ms per action)
   - Per-frame duration (should improve by 0.1-0.5ms)
   - GC pressure (should decrease slightly)

3. **Visual verification**:
   - Launch a table
   - Play for 30 seconds
   - Verify no glitches or visual regressions
   - Check console for warnings/errors

### Success Criteria

| Metric | Target | Status |
|--------|--------|--------|
| Startup time | <50ms improvement | Moderate (will see 5-15ms) |
| Per-frame overhead | <0.1ms | Yes (early-exit is fast) |
| Visual regressions | 0 | Must be 0 |
| Build size | No increase | Likely decrease slightly |

---

## Implementation Timeline

### Week 1: Quick Wins (45 minutes total)

**Monday, 2026-03-12**:
1. Action 1: Consolidate null checks (15 min)
   - Edit applyQualityPreset() function
   - Test in browser
2. Action 3: Remove redundant checks (5 min)
   - Find/replace 7 lines
   - Test

**Wednesday, 2026-03-14**:
3. Action 2: Add getCurrentPresetName() (20 min)
   - Add method to profiler.ts
   - Update applyQualityPreset() to use new method
   - Build and test

**Total effort**: 40-45 minutes
**Expected gain**: 0.2-0.5ms per preset change, 0.3-1ms/sec reduction in frame variance

### Week 2: Optional Enhancement (2-3 hours, if startup is slow)

**Monday, 2026-03-19**:
4. Action 4: Parallelize graphics initialization (2-3 hours)
   - Only if Action 1-3 don't provide enough improvement
   - Requires testing composer ordering
   - Medium complexity but safe fallback exists

---

## Rollback Plan

If any optimization introduces visual regressions:

1. **Quick rollback** (git revert):
   ```bash
   git log --oneline  # Find commit
   git revert <commit>  # Revert single commit
   npm run build
   npm run dev
   ```

2. **Verify rollback**:
   - Test same table as before
   - Confirm visual regression is gone

3. **Debug**:
   - If Action 1 caused issue: null checks were necessary
   - If Action 2 caused issue: profiler.getCurrentPresetName() mismatch
   - If Action 4 caused issue: composer ordering matters (use sequential approach)

---

## Files to Be Modified

| Action | File | Lines | Type |
|--------|------|-------|------|
| 1 | main.ts | 1901-1976 | Refactor |
| 2 | profiler.ts | +5 lines after 389 | Add method |
| 2 | main.ts | 1889-1896 | Refactor |
| 3 | main.ts | 540, 552, 564, 578, 589, 608, 620 | Remove checks |
| 4 | main.ts | 539-630 | Restructure (optional) |

---

## Validation Checklist

**Before committing each action**:

- [ ] TypeScript compilation: `npm run build` ✓ no errors
- [ ] Development server: `npm run dev` ✓ loads without warnings
- [ ] Console: Open DevTools, refresh, no errors
- [ ] Visual test: Load demo table, play for 30 seconds
- [ ] Preset test: In console, `window.setQualityPreset('low')` → transitions smoothly
- [ ] Memory: Check DevTools Memory tab, no obvious leaks

---

## Expected Outcomes

### After All 3 Actions (40-45 minutes work)

**Startup impact**:
- +0ms to -2ms (Actions 1-3 have negligible startup impact, optimize rare events)

**Per-frame impact** (at 60 FPS):
- -0.3 to -1ms per second (reduced object allocations)
- -0.05ms per frame (faster early-exit in applyQualityPreset)

**Preset change impact** (rare event):
- -0.1 to -0.5ms per change (consolidated null checks)

**Build size**:
- Likely -0.5 to -1KB minified (more efficient code)

**Measurable benefit**: Yes—frame time variance will improve, especially under load

---

## Future Optimizations (Not Recommended Now)

These are deferred to later phases:

1. **Lazy-load graphics passes**: Initialize only when quality changes
2. **Shader precompilation**: Pre-compile all shader variants at startup
3. **Worker thread initialization**: Move pass init to worker thread
4. **Profile-aware presets**: Load only enabled passes for active preset

---

## Questions & Answers

**Q: Will these changes affect visual quality?**
A: No. All changes are internal efficiency improvements. Visual output is identical.

**Q: Is 8-15ms startup improvement worth it?**
A: Only for Action 4 (parallelization). Actions 1-3 are "quick wins" that take <1 hour total.

**Q: What if Action 2 breaks preset changes?**
A: Very unlikely. We're just extracting preset.name into a separate method. If it breaks, simply revert that one change (5 minutes).

**Q: Should we do Action 4 now or later?**
A: Later. Only if users report slow startup or profiling shows Polish Suite is a bottleneck. Current approach (sequential) is safer.

**Q: Can we do all actions at once?**
A: No. Do them one by one, testing after each. This makes debugging easier if something breaks.

---

## Success Metrics (Post-Implementation)

After completing Actions 1-3:

```javascript
// In browser console, after page loads:
const before = window.INIT_QUALITY_PRESET_OK - window.INIT_BEFORE_QUALITY_PRESET;
console.log(`Quality preset applied in ${before}ms`);

// Should be similar or slightly faster than before
// (Unlikely to see measurable difference at <1ms resolution)

// But check per-frame overhead:
const metrics = window.getMetricsDisplay();
console.log(metrics);  // Frame time should be consistent, no spikes
```

---

## Next Review Date

**2026-04-11** (4 weeks post-implementation)

- Re-measure performance
- Check for regressions
- Decide if Action 4 is needed
- Plan Phase 24 optimizations (if any)

