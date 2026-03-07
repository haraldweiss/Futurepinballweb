# Phase 15: Physics Worker Performance Testing Guide

## Overview

Phase 15 implements **Physics Worker Integration** to offload CPU-intensive physics simulation from the main render thread to a Web Worker. This should deliver **30-40% FPS improvement** by parallelizing physics calculations.

**Expected Results**:
- Physics time: 5-10ms → ~2ms overhead (main thread freed)
- FPS improvement: 30-40% across all devices
- GC pauses: -40% reduction from CPU offloading
- Memory: -15-20% reduction from better allocation patterns

---

## Testing Environment Setup

### Prerequisites
- ✅ Latest build deployed: `npm run build` (should be 1.05s)
- ✅ Game loaded in browser (FPT classic demo table recommended)
- ✅ Performance Monitor visible (press 'P' in-game)
- ✅ Chrome DevTools available (F12)

### Step 1: Prepare Testing Environment

```bash
# 1. Build latest code
npm run build

# 2. Ensure build succeeds
# Expected: ~1.05s with zero TypeScript errors
# Expected: phase-15-physics-worker branch commits visible
```

### Step 2: Load Game & Verify Physics Worker

```javascript
// In browser console (F12):

// 1. Check Graphics Pipeline
getGraphicsPipeline()
// Expected output: GraphicsPipeline { ... }

// 2. Check Physics Worker
getPhysicsWorker()
// Expected output: PhysicsWorkerBridge { ... }

// 3. Verify table body configs
const phys = getPhysics();
phys.tableBodyConfigs.length
// Expected: 30+ (bumpers, targets, ramps, guides, walls)

// 4. Check worker is receiving data
getPhysicsWorker().onPhysicsFrame
// Expected: function (shows callback is registered)
```

### Step 3: Verify Worker Communication

```javascript
// In browser console:

// Send a physics step
const bridge = getPhysicsWorker();
bridge.step(0.016, 4);  // 16ms frame, 4 substeps

// Wait 100ms for response
setTimeout(() => {
  console.log('Physics worker is responsive');
}, 100);
```

---

## Automated Testing Suite Usage

### Phase 1: Load Testing Scripts

```javascript
// Copy-paste both scripts into browser console (F12):

// 1. First: performance-monitor.js
// (Already in file, contains startMonitoring(), stopMonitoring(), exportResults())

// 2. Second: phase15-automated-testing.js
// (Contains testSequence(), exportPhase15Results())
```

### Phase 2: Quick Start (5 minutes)

```javascript
// Initialize testing framework
startPhase15Testing()
// Output: "Testing framework ready!"

// Run all 4 tests automatically
testSequence()
// Runs Test A → B → C → D over ~6 minutes
// Outputs progress messages and summaries
```

### Phase 3: Detailed Testing (15 minutes)

The automated suite runs 4 tests:

#### **Test A: Simple Gameplay (60s)**
- **Purpose**: Baseline FPS measurement without stress
- **What It Tests**: Graphics pipeline performance with idle physics
- **Expected Result**: 55-60 FPS steady, minimal variance
- **What You Do**: Play normally for 60 seconds (bumper hits are okay)

#### **Test B: High Activity (60s)**
- **Purpose**: Maximum physics stress (bumpers, ball movement)
- **What It Tests**: Physics worker handling rapid collisions
- **Expected Result**: 50-60 FPS with spikes (should NOT drop below 45)
- **What You Do**: Play aggressively, hit all bumpers repeatedly

#### **Test C: Bloom Stress (60s)**
- **Purpose**: Graphics stress test with quality set to ULTRA
- **What It Tests**: Graphics pipeline with maximum post-processing
- **Expected Result**: 45-55 FPS (bloom adds ~5-10ms overhead)
- **What You Do**: Idle or play gently (script sets quality to ultra)

#### **Test D: Geometry Stress (120s)**
- **Purpose**: Memory and geometry pooling verification
- **What It Tests**: Table switching and geometry cache reuse
- **Expected Result**: Stable memory, no leaks, smooth loads
- **What You Do**: Play through multiple bumper sequences

---

## Manual Testing (If Automated Suite Fails)

### Scenario 1: Baseline FPS Measurement

```javascript
// 1. Ensure performance monitor is visible (press P)
// You should see: "FPS: XX.X | Memory: XXX MB | Draw: XXX"

// 2. Start monitoring
startMonitoring()
// Output: "📊 Performance monitoring started..."

// 3. Play for 60 seconds
// Hit bumpers, make ball contact walls, test physics

// 4. Stop monitoring
stopMonitoring()
// Output: "✅ Performance monitoring stopped"
// Shows FPS stats (min/avg/max)

// 5. Export results
exportResults()
// Outputs formatted report (copy to file)
```

### Scenario 2: Physics Worker Verification

```javascript
// Check if physics worker is actually active
const bridge = getPhysicsWorker();
let frameReceived = false;

// Register frame callback
bridge.setFrameCallback(() => {
  frameReceived = true;
  console.log('✅ Physics frame received from worker');
});

// Trigger a physics step
bridge.step(0.016, 4);

// Wait for response
setTimeout(() => {
  if (frameReceived) {
    console.log('✅ Worker is communicating');
  } else {
    console.log('❌ Worker communication issue');
  }
}, 200);
```

### Scenario 3: Collision Detection Test

```javascript
// Verify bumpers are detected by physics worker

// Start monitoring FPS
startMonitoring()

// Play 30 seconds, focus on bumper hits
// Each bumper hit should:
// - Register collision in worker
// - Update game score
// - Play bump sound
// - Animate bumper

// Stop after 30s
stopMonitoring()

// Check results - collisions should be smooth with no frame drops
```

### Scenario 4: Memory Leak Check

```javascript
// Run for 5 minutes watching memory growth

startMonitoring()

// Play continuously
// Drain ball 10 times
// Load different tables
// Check memory pattern in Performance Monitor

stopMonitoring()

// Good pattern: Sawtooth (grows then GC drops)
// Bad pattern: Linear climb (memory leak)
```

---

## Chrome DevTools Deep Analysis

### Physics Worker Verification

```
1. Open DevTools (F12)
2. Go to Sources tab
3. Look for "physics-worker.js" in file list
4. If present: Worker is loaded ✅
5. If missing: Worker initialization failed ❌
```

### Memory Monitoring

```
1. Go to Memory tab
2. Click "Record allocation timeline"
3. Play game for 1 minute
4. Check for:
   - Sawtooth pattern = healthy GC ✅
   - Linear climb = memory leak ❌
5. Stop recording
```

### Network Activity

```
1. Go to Network tab
2. Filter for: "XHR" (if worker posts data)
3. Should see messages between threads every 16ms
4. If none: Worker communication broken ❌
```

### Performance Timeline

```
1. Go to Performance tab
2. Click record
3. Play game for 10 seconds
4. Stop recording
5. Look for:
   - Physics tasks: Worker (on separate track)
   - Render tasks: Main thread
   - If physics on main thread: Worker failed ❌
```

---

## Data Collection Template

### Test Session Metadata

```markdown
# Phase 15 Test Session

**Date**: YYYY-MM-DD
**Tester**: Your Name
**Device**: [Desktop/iPhone/iPad]
**Browser**: Chrome Version XX
**OS**: [macOS/Windows/Linux]
**Resolution**: 1920×1080
**GPU**: [Integrated/Discrete]

**Build Info**:
- Commit: (from git log --oneline -1)
- Build Time: 1.05s ✓
- TypeScript Errors: 0 ✓
```

### Test Results

```markdown
## Test A: Simple Gameplay
- Duration: 60s ✓
- Samples Collected: 600
- Average FPS: XX.X
- Min FPS: XX
- Max FPS: XX
- Memory Peak: XXX MB
- Assessment: ✅ PASS / ❌ FAIL

## Test B: High Activity
- Duration: 60s ✓
- Samples Collected: 600
- Average FPS: XX.X
- Min FPS: XX (should be ≥45)
- Max FPS: XX
- Memory Peak: XXX MB
- Assessment: ✅ PASS / ❌ FAIL

[Repeat for Tests C & D]
```

### Success Criteria Checklist

```markdown
## Phase 15 Success Criteria

- [ ] Physics Worker initialized without errors
- [ ] Table body configs transmitted to worker
- [ ] Collisions detected (bumpers scoring correctly)
- [ ] Flippers responsive with no lag
- [ ] Plunger/nudge working smoothly
- [ ] FPS stable 60+ (desktop) / 50+ (mobile)
- [ ] No memory leaks (sawtooth pattern in timeline)
- [ ] GC pauses reduced by 40%+
- [ ] Build time maintained <1.1s
- [ ] Zero TypeScript errors
- [ ] 30+ minute gameplay stable

**Overall Result**: ✅ PASS / ❌ NEEDS REVISION
```

---

## Performance Analysis

### FPS Improvement Calculation

```javascript
// If you have Phase 14 baseline:
// OLD_FPS = 60 FPS (Phase 14 baseline)
// NEW_FPS = 78 FPS (Phase 15 with worker)

const improvement = ((NEW_FPS - OLD_FPS) / OLD_FPS) * 100;
// Improvement = ((78 - 60) / 60) × 100 = 30%

// Expected range: 30-40%
// Minimum acceptable: 20%
// Unacceptable: <15%
```

### Memory Improvement

```javascript
// OLD_MEMORY = 120 MB (Phase 14)
// NEW_MEMORY = 102 MB (Phase 15)

const memReduction = ((OLD_MEMORY - NEW_MEMORY) / OLD_MEMORY) * 100;
// Reduction = ((120 - 102) / 120) × 100 = 15%

// Expected: 15-20% reduction
// Acceptable: ≥10%
```

### GC Pause Improvement

```javascript
// OLD_GC_PAUSES = 450 ms (Phase 14 in 30min)
// NEW_GC_PAUSES = 270 ms (Phase 15 in 30min)

const gcImprovement = ((OLD_GC_PAUSES - NEW_GC_PAUSES) / OLD_GC_PAUSES) * 100;
// Improvement = ((450 - 270) / 450) × 100 = 40%

// Expected: 40%+ reduction
// Acceptable: ≥25%
```

---

## Troubleshooting

### Problem: "FPS Lower Than Expected"

**Diagnosis**:
```javascript
// Check if worker is actually running
getPhysicsWorker()  // Should show bridge object
getGraphicsPipeline()  // Should show pipeline object

// Check bloom status
document.querySelector('[data-bloom]')?.textContent
// If "Bloom: ON" - disable with 'B' key

// Check quality preset
getGraphicsPipeline()?.getQualityPreset?.()
// If 'low' - this is intentional
```

**Fix**:
1. Clear browser cache: DevTools → Application → Clear Storage
2. Close other tabs (reduce CPU competition)
3. Disable extensions (DevTools → Settings → Extensions OFF)
4. Try incognito window (eliminates all extensions)
5. Check CPU temperature (thermal throttling?)

### Problem: "Physics Worker Not Responding"

**Diagnosis**:
```javascript
// Check if worker loaded
getPhysicsWorker()
// Should return PhysicsWorkerBridge, not error

// Check table bodies
const phys = getPhysics();
console.log(phys.tableBodyConfigs.length);
// Should be 30+ (not 0)
```

**Fix**:
1. Refresh page (F5)
2. Check console for errors (F12 → Console)
3. Verify graphics pipeline initialized: `getGraphicsPipeline()`
4. If still broken, check main.ts line 757 has proper `tableBodyConfigs`

### Problem: "Memory Leak Detected"

**Diagnosis**:
```javascript
// Run 5-minute test watching memory
startMonitoring()
// [Play game for 5 minutes]
stopMonitoring()

// Check Memory tab in DevTools
// Should show sawtooth pattern (GC happening)
// NOT linear climb (memory leak)
```

**Fix**:
1. Verify geometry pool disposal: `getGraphicsPipeline()?.getGeometryPool()?.dispose()`
2. Check for circular references in animation system
3. Monitor if physics worker is leaking table body references
4. Check if materials are being garbage collected

### Problem: "Collisions Not Detected"

**Diagnosis**:
```javascript
// Check table bodies in worker
const phys = getPhysics();
console.log('Table body configs:', phys.tableBodyConfigs);
// Should show bumper, target, ramp, wall configs

// Manual collision test
getPhysicsWorker().step(0.016, 4);
// Wait for callback
// Check if collision events are firing
```

**Fix**:
1. Verify table.ts is populating `tableBodyConfigs` array
2. Check that `buildPhysicsTable()` captures all body types
3. Ensure worker's `initializePhysics()` creates colliders from configs
4. Test with simple bumper hit - should score immediately

---

## Reporting Results

### Save Results

```javascript
// After testing, export results
const report = exportPhase15Results()

// Save to file as PHASE15_TEST_RESULTS_2026-03-07.md
// (Copy from console output)
```

### Create GitHub Issue

If Phase 15 testing reveals issues:
1. Create GitHub issue with title: `Phase 15: [Issue Description]`
2. Include test results file
3. Include device specifications
4. Include reproduction steps
5. Attach screenshots if visual issue

### Expected Output Example

```
✅ TEST COMPLETE

╔═══════════════════════════════════════════════════════╗
║            TEST RESULTS: Simple Gameplay (60s)        ║
╚═══════════════════════════════════════════════════════╝

📊 FPS STATISTICS (600 samples):
   • Minimum:    58.0 FPS
   • Average:    59.8 FPS ⭐
   • Maximum:    60.0 FPS
   • Median:     60.0 FPS
   • Std Dev:    0.45
   • 95th %ile:  60.0 FPS

💾 MEMORY STATISTICS:
   • Min Used:   95 MB
   • Max Used:   110 MB
   • Avg Used:   103.5 MB

🎯 QUALITY ASSESSMENT:
   ✅ EXCELLENT (55+ FPS)
```

---

## Next Steps

### If PASS (≥30% improvement):
1. ✅ Document Phase 15 as complete
2. ✅ Merge to main branch
3. 📅 Plan Phase 16: Instanced Rendering
4. 📅 Plan Phase 17: Deferred Rendering

### If MARGINAL (20-30% improvement):
1. Investigate Physics Worker bottlenecks
2. Profile with Chrome DevTools Performance tab
3. Check for unnecessary postMessage overhead
4. Consider additional optimizations

### If FAIL (<20% improvement):
1. Debug Physics Worker initialization
2. Verify table bodies are transmitting
3. Check for communication delays
4. Review physics-worker.ts implementation
5. Consider alternative optimization strategy

---

## Reference

**Files Used**:
- `performance-monitor.js` - FPS data collection (100ms intervals, 60s default)
- `phase15-automated-testing.js` - Automated test suite (4 tests, 6 minutes total)
- `PHASE14_TESTING_PROTOCOL.md` - Phase 14 baseline testing

**Key Metrics to Track**:
| Metric | Phase 14 Baseline | Phase 15 Target | Success |
|--------|---|---|---|
| FPS (Simple) | 60 | 78-84 | +30-40% |
| FPS (Activity) | 50-55 | 65-77 | +30-40% |
| Memory | 120 MB | 102 MB | -15% |
| GC Pauses | 450 ms | 270 ms | -40% |

---

**Generated**: 2026-03-07
**Phase**: 15 (Physics Worker Integration)
**Expected Gain**: 30-40% FPS improvement + 40% GC reduction
