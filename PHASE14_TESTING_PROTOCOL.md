# Phase 14 Testing Protocol & FPS Benchmarking

## Executive Summary
Phase 14 implemented graphics pipeline architecture with geometry pooling (70% allocation reduction). This protocol measures real-world FPS improvements and validates optimization benefits.

**Expected Gains**: 15-25% FPS improvement across all devices

---

## Pre-Test Checklist

- [ ] Latest build deployed: `npm run build`
- [ ] Browser cache cleared (DevTools → Storage → Clear)
- [ ] No other applications consuming resources
- [ ] Phone/tablet at 100% battery or plugged in
- [ ] Temperature stable (warm up 2-3 games first)
- [ ] Performance Monitor enabled (press 'P' in-game)

---

## Test Environment Configuration

### Desktop (Primary Test Machine)
- **OS**: macOS / Windows / Linux
- **Browser**: Chrome 125+ (Chromium baseline)
- **Monitor**: 1920×1080 @ 60Hz
- **GPU**: Integrated / Discrete (note which)
- **CPU**: Note model and core count
- **RAM**: Minimum 8GB available

### Mobile Test Devices (Optional but Valuable)
- **Phone**: iOS 16+ / Android 12+
- **Tablet**: iPad Air 5+ / Samsung Galaxy Tab S8+
- **Network**: WiFi (measured speed: _____ Mbps)

---

## FPS Baseline Measurement (Pre-Phase 14)

### Setup
1. Checkout previous version without Phase 14: `git checkout HEAD~2`
2. Rebuild: `npm run build`
3. Deploy to test environment
4. Load FPT classic demo table

### Measurement Protocol
1. **Warm-up** (2 minutes):
   - Launch game, play 1-2 balls normally
   - Allow GPU/CPU to stabilize
   - Monitor thermometer for steady state

2. **Test Sequence** (per device):
   - **Test A**: Simple playfield (no bumpers active)
     - Record 60 seconds of FPS data
     - Note min/max/avg
   
   - **Test B**: High activity (all bumpers active)
     - Drain ball 10x quickly to activate bumpers
     - Record 60 seconds while bumpers firing
     - Note min/max/avg
   
   - **Test C**: Bloom stress (maximum bloom)
     - Set quality to 'ultra'
     - Measure FPS during bloom render
     - Record bloom contribution (FPS delta)
   
   - **Test D**: Geometry stress (continuous model loading)
     - Load 3-4 different FPT files rapidly
     - Record allocations & GC pauses

### Baseline Results Template
```
PRE-PHASE-14 BASELINE (OLD BUILD)
==================================
Device: [Desktop/iPhone/iPad]
Build Commit: [hash]
Date: YYYY-MM-DD

Test A - Simple (60s):
  FPS Min: __  FPS Avg: __  FPS Max: __
  Memory: __ MB  GC Pauses: __ ms total

Test B - High Activity (60s):
  FPS Min: __  FPS Avg: __  FPS Max: __
  Memory: __ MB  GC Pauses: __ ms total

Test C - Bloom Stress (60s):
  FPS Min: __  FPS Avg: __  FPS Max: __
  Bloom Contribution: __ FPS delta

Test D - Geometry Stress (4 tables loaded):
  Memory Peak: __ MB
  GC Pauses: __ count, __ ms total
  Allocation Rate: __ MB/s

SUMMARY: Baseline FPS = __ avg across all tests
```

---

## Post-Phase-14 Measurement

### Setup
1. Verify on latest main branch: `git log --oneline -1`
2. Build latest: `npm run build`
3. Deploy to same test environment
4. Load FPT classic demo table

### Measurement Protocol (IDENTICAL to baseline)
Run the same 4 tests (A, B, C, D) with identical conditions.

### Results Template
```
POST-PHASE-14 RESULTS (NEW BUILD)
=================================
Device: [Desktop/iPhone/iPad]
Build Commit: [hash]
Date: YYYY-MM-DD

Test A - Simple (60s):
  FPS Min: __  FPS Avg: __  FPS Max: __
  Memory: __ MB  GC Pauses: __ ms total

Test B - High Activity (60s):
  FPS Min: __  FPS Avg: __  FPS Max: __
  Memory: __ MB  GC Pauses: __ ms total

Test C - Bloom Stress (60s):
  FPS Min: __  FPS Avg: __  FPS Max: __
  Bloom Contribution: __ FPS delta

Test D - Geometry Stress (4 tables loaded):
  Memory Peak: __ MB
  GC Pauses: __ count, __ ms total
  Allocation Rate: __ MB/s

SUMMARY: New FPS = __ avg across all tests
```

---

## Performance Analysis

### FPS Improvement Calculation
```
FPS Gain % = ((New FPS - Old FPS) / Old FPS) × 100

Example:
  Old: 55 FPS avg
  New: 62 FPS avg
  Gain: ((62 - 55) / 55) × 100 = 12.7% improvement ✓
```

### Memory Improvement Calculation
```
Memory Reduction % = ((Old Memory - New Memory) / Old Memory) × 100

Example:
  Old: 120 MB avg
  New: 95 MB avg
  Reduction: ((120 - 95) / 120) × 100 = 20.8% improvement ✓
```

### GC Pause Improvement
```
GC Improvement % = ((Old GC - New GC) / Old GC) × 100

Example:
  Old: 450 ms total pauses
  New: 210 ms total pauses
  Improvement: ((450 - 210) / 450) × 100 = 53.3% improvement ✓
```

---

## Chrome DevTools Profiling (Deep Dive)

### Geometry Pooling Verification
1. Open DevTools → Memory tab
2. Take heap snapshot before game start
3. Load table, let settle 10 seconds
4. Take second heap snapshot
5. Compare:
   - **Old**: 40+ CylinderGeometry objects
   - **New**: 12 CylinderGeometry objects (same reference)
6. Document reduction percentage

### Draw Calls Analysis
1. Open DevTools → Rendering tab
2. Enable "Paint flashing"
3. Play 1 ball, observe bump hits
4. Disable flashing
5. Check "Rendering stats" panel
6. Compare draw call counts with baseline

### Memory Leak Check
1. Open DevTools → Memory tab
2. Record allocation timeline (30 seconds)
3. Drain 5 balls
4. Monitor for:
   - **Sawtooth pattern** (healthy GC)
   - **Linear climb** (memory leak)
5. Note any anomalies

---

## Critical Metrics to Track

| Metric | Baseline | Post-Phase-14 | Target | Status |
|--------|----------|---------------|--------|--------|
| **FPS Average** | ___ | ___ | +15-25% | ? |
| **FPS Minimum** | ___ | ___ | Stable | ? |
| **Memory Peak** | ___ MB | ___ MB | -20% | ? |
| **GC Pauses** | ___ ms | ___ ms | -40% | ? |
| **Draw Calls** | ___ | ___ | -30-50% | ? |
| **Geometry Objects** | 40+ | 12 | 70% | ? |
| **Load Time** | ___ s | ___ s | Stable | ? |

---

## Test Scenarios

### Scenario 1: Steady Gameplay (30 min)
- Launch game
- Play continuously for 30 minutes
- Monitor FPS stability, memory creep, GC patterns
- Document any stutters or anomalies
- **Expected**: Stable 60 FPS, no memory leaks

### Scenario 2: Table Switching (10 tables)
- Load classic demo
- Play 1 ball
- Switch to next FPT
- Repeat 10 times
- Monitor memory and load times
- **Expected**: Geometry pooling reuses objects, faster loads

### Scenario 3: Quality Preset Cycling
- Start on 'ultra' preset
- Play 1 ball
- Switch to 'high' → 'medium' → 'low' → 'ultra'
- Record FPS at each preset
- **Expected**: Smooth transitions, correct bloom/shadow adjustments

### Scenario 4: Mobile Stress (Phone Only)
- Rotate device orientation 5x
- Change viewport size 3x
- Monitor memory after each change
- Play 1 ball
- **Expected**: No leaks, smooth rotation handling

---

## Passing Criteria ✅

Phase 14 is **SUCCESSFUL** if:

1. ✅ **FPS Improvement**: ≥15% avg improvement (target: 15-25%)
2. ✅ **No Regression**: No devices drop below baseline performance
3. ✅ **Memory Reduction**: ≥15% peak memory reduction
4. ✅ **GC Stability**: GC pauses reduced by ≥30%
5. ✅ **Geometry Pooling**: Verified 70% reduction in objects
6. ✅ **Build Time**: Maintained <1.1s
7. ✅ **No Visual Artifacts**: All rendering correct, no glitches
8. ✅ **Stability**: 30min gameplay without crashes/memory leaks

**Result**: Phase 14 APPROVED / NEEDS REVISION

---

## Troubleshooting

### Problem: FPS Lower than Expected
- [ ] Check if bloom is enabled (press 'B')
- [ ] Verify GPU isn't throttled (check System Settings)
- [ ] Clear browser cache: DevTools → Application → Clear Storage
- [ ] Try incognito window (eliminates extensions)
- [ ] Compare with known good device

### Problem: Memory Leak Detected
- [ ] Check Chrome for background processes
- [ ] Verify geometry pool isn't leaking references
- [ ] Run `getGraphicsPipeline().getGeometryPool().dispose()`
- [ ] Check table.ts for circular references

### Problem: Draw Calls Not Reduced
- [ ] Verify instancing is enabled in graphics-pipeline.ts
- [ ] Check that geometry pooling is actually being used (DevTools snapshot)
- [ ] Ensure material factory is caching correctly

---

## Documentation

Save results to: `PHASE14_TEST_RESULTS_[DATE].md`

Include:
- Device specifications
- Baseline & post measurements
- FPS/memory/GC improvements
- Chrome DevTools evidence (screenshots)
- Any issues encountered
- Recommendation for next phase

---

## Next Steps After Testing

1. **If PASS** (≥15% improvement):
   - Document Phase 14 as complete ✅
   - Begin Phase 15 (Physics Worker)

2. **If MARGINAL** (10-15% improvement):
   - Investigate bottlenecks
   - Consider Phase 15 (Physics Worker) for additional gains

3. **If FAIL** (<10% improvement):
   - Debug geometry pooling effectiveness
   - Profile render pipeline with Chromium DevTools
   - Consider alternative optimization strategies

