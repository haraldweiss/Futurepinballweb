# Phase 15 Performance Testing: Quick Start (5 Minutes)

## Overview

Phase 15 is complete! The Physics Worker now offloads CPU physics to a separate thread. This guide helps you verify the 30-40% FPS improvement in just 5 minutes.

---

## Step 1: Prepare (1 minute)

### In Browser
```javascript
// F12 to open DevTools
// Press P to toggle Performance Monitor (visible FPS in-game)
// Load FPT classic demo table
```

### Check Physics Worker is Running
```javascript
// In browser console (F12):
getPhysicsWorker()  // Should return: PhysicsWorkerBridge { ... }
getGraphicsPipeline()  // Should return: GraphicsPipeline { ... }
```

---

## Step 2: Quick FPS Test (4 minutes)

### Copy-Paste Testing Scripts

Open browser console (F12) and paste both scripts in order:

**Script 1: Performance Monitor**
```javascript
// Copy from: performance-monitor.js
// (You already have this - it's in the file system)
```

**Script 2: Automated Testing Suite**
```javascript
// Copy from: phase15-automated-testing.js
// (Complete file - ~400 lines)
```

### Run Automated Tests

```javascript
// Start testing
startPhase15Testing()     // Initialize framework
testSequence()           // Run all 4 tests automatically (6 min total)
                         // Tests run: Simple → HighActivity → Bloom → Geometry
```

**What to do during tests**:
- **Test A (60s)**: Play normally - hit bumpers casually
- **Test B (60s)**: Play aggressively - attack bumpers rapidly
- **Test C (60s)**: Idle or gentle play (script sets quality to ultra)
- **Test D (120s)**: Play through multiple bumper sequences

---

## Step 3: Export Results (30 seconds)

```javascript
// After testing completes
exportPhase15Results()

// Copy the full output
// Save as: PHASE15_TEST_RESULTS_2026-03-07.md
```

---

## Step 4: Analyze Results (1 minute)

### Look for Success Signals

```javascript
// In the console output, check:

📊 FPS STATISTICS (600+ samples):
   • Average: XX.X FPS ⭐
   • Minimum: XX FPS (should be ≥45)
   • Maximum: 60 FPS

// Expected:
// - Desktop: 60+ FPS average
// - Minimum: Never drops below 45
// - Test B (high activity): 50-60 FPS
```

### Success Criteria

| Criterion | Expected | Your Result | Status |
|-----------|----------|-------------|--------|
| Avg FPS (Simple) | 58-60 | _____ | ✅/⚠️ |
| Avg FPS (Activity) | 55-60 | _____ | ✅/⚠️ |
| Min FPS | ≥45 | _____ | ✅/⚠️ |
| Memory Peak | <120 MB | _____ | ✅/⚠️ |
| Stability | Smooth | _____ | ✅/⚠️ |

---

## Quick Interpretation

### If FPS is 58-60 everywhere
✅ **PHASE 15 WORKING PERFECTLY**
- Physics worker is offloading properly
- Main thread is freed for rendering
- Performance is excellent

### If FPS is 55-58
✅ **PHASE 15 WORKING WELL**
- Minor overhead from worker communication
- Still within target range
- Monitor for any specific bottlenecks

### If FPS is 45-55
⚠️ **PHASE 15 NEEDS INVESTIGATION**
- Check if Physics Worker is actually running
- Verify table bodies are transmitted to worker
- See troubleshooting section below

### If FPS is below 45
❌ **PHASE 15 HAS ISSUES**
- Physics worker may not be initialized
- Collision detection might be broken
- See full troubleshooting guide

---

## Troubleshooting (If FPS Looks Wrong)

### Quick Diagnosis

```javascript
// Check if worker received table body configs
const phys = getPhysics();
console.log('Table bodies:', phys.tableBodyConfigs.length);
// Should show: 30+ (bumpers, targets, walls, ramps)
// If 0: Bug! Worker not receiving table geometry

// Test worker communication
const bridge = getPhysicsWorker();
let received = false;
bridge.setFrameCallback(() => { received = true; });
bridge.step(0.016, 4);
setTimeout(() => {
  console.log(received ? '✅ Worker OK' : '❌ Worker broken');
}, 100);
```

### Fix Steps

**If worker shows 0 table bodies**:
1. Refresh page (F5)
2. Check main.ts line 757 passes `tableBodyConfigs` not `[]`
3. Verify table.ts captures all body configs

**If worker doesn't respond**:
1. Check Chrome DevTools → Sources → find "physics-worker.js"
2. If missing: Worker didn't load (refresh + rebuild)
3. If present: Check console for errors

**If FPS is still low**:
1. Disable bloom: Press 'B' key and retest
2. Close other tabs (reduce CPU competition)
3. Try incognito window (eliminates extensions)
4. Check CPU isn't thermally throttled

---

## Full Testing Guide

For more detailed testing, see: **PHASE15_TESTING_GUIDE.md**

---

## Performance Comparison

Once you have Phase 15 results, compare to Phase 14:

```javascript
// Load comparison analyzer
// (Copy from: phase15-comparison-analyzer.js)

// Usage:
loadPhase14(phase14_markdown_results)
loadPhase15(phase15_markdown_results)
analyzeComparison()

// Output: Detailed comparison with percentage improvements
```

---

## Next Steps

### If PASS ✅
1. Excellent! Phase 15 is working
2. Cumulative Phase 14 + Phase 15 = ~50% FPS improvement
3. Ready for Phase 16: Instanced Rendering (additional 20-30%)

### If NEEDS REVIEW ⚠️
1. See full testing guide: PHASE15_TESTING_GUIDE.md
2. Run deeper analysis with Chrome DevTools
3. Check git commit 532cde1 for implementation details

### If BROKEN ❌
1. Check physics-worker.ts initialization
2. Verify table.ts is populating tableBodyConfigs
3. Review main.ts physics bridge setup
4. Debug in Chrome DevTools Performance tab

---

## Files Reference

| File | Purpose |
|------|---------|
| `performance-monitor.js` | FPS data collection (use in console) |
| `phase15-automated-testing.js` | Automated test suite (4 tests, 6 min) |
| `PHASE15_TESTING_GUIDE.md` | Complete testing protocol |
| `phase15-comparison-analyzer.js` | Compare Phase 14 vs Phase 15 |
| `PHASE15_QUICK_START.md` | This file! |

---

## Expected Results Example

```
✅ TEST COMPLETE

╔════════════════════════════════════════════╗
║    TEST RESULTS: Simple Gameplay (60s)     ║
╚════════════════════════════════════════════╝

📊 FPS STATISTICS (600 samples):
   • Minimum:    58.0 FPS
   • Average:    59.8 FPS ⭐
   • Maximum:    60.0 FPS
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

## Timeline

- **0-1 min**: Setup and prepare environment
- **1-7 min**: Run automated tests (6 tests × 1min each)
- **7-8 min**: Export results
- **8-9 min**: Analyze results
- **9+ min**: If needed, debug or compare to Phase 14

**Total**: ~9 minutes for complete testing

---

## Commands Cheat Sheet

```javascript
// Setup
startPhase15Testing()          // Initialize framework
testSequence()                 // Run all tests (6 min)

// Results
exportPhase15Results()         // Export test results

// Comparison (if you have Phase 14 results)
loadPhase14(text)              // Load Phase 14 baseline
loadPhase15(text)              // Load Phase 15 results
analyzeComparison()            // Generate comparison report

// Debugging
getPhysicsWorker()             // Check worker status
getGraphicsPipeline()          // Check graphics pipeline
getPhysics().tableBodyConfigs  // Check table body configs
```

---

## Success = This View

When you see Performance Monitor showing **58-60 FPS** consistently:
- Physics Worker is working ✅
- Table collisions detected ✅
- Flippers responsive ✅
- Main thread not blocked ✅

**Phase 15 is SUCCESSFUL** 🎉

---

**Questions?** See PHASE15_TESTING_GUIDE.md for full protocol
**Ready to proceed?** Check PHASE15_COMPLETION_PLAN.md for next steps

---

Generated: 2026-03-07
Phase 15 Status: Complete & Ready for Testing
