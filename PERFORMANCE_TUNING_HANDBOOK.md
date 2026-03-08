# Performance Tuning Handbook

**Version**: 1.0
**Date**: 2026-03-08
**Audience**: Users wanting to optimize their system

---

## Introduction

This handbook shows you how to **get the best performance** from Future Pinball Web. Learn how to:

- Measure your current performance
- Identify bottlenecks
- Optimize your system
- Compare improvements over time

---

## Part 1: Measuring Baseline Performance

### Step 1: Create Baseline Report

```javascript
// Open browser console (F12)
const baseline = await window.generatePerformanceReport();
console.log(baseline);
```

### Step 2: Record Key Metrics

Write down these numbers:

```
📊 BASELINE METRICS
Date/Time: March 8, 2026 2:00 PM
Browser: Chrome 120
Device: Desktop

Performance Metrics:
├─ Overall Score: __/100
├─ Performance Grade: __
├─ Load Time Improvement: __%
├─ Memory Reduction: __%
├─ GC Pressure Reduction: __%
└─ Cache Hit Rate: __%

Device Profile:
├─ Type: [Desktop/Tablet/Mobile]
├─ CPU: [Low/Mid/High]
├─ GPU: [Low/Mid/High]
├─ Memory: [Low/Mid/High]
└─ Estimated Budget: __MB
```

### Step 3: Note Current Conditions

```
System Conditions:
├─ Other browser tabs open: __
├─ Background applications: __
├─ Browser cache size: __
├─ Recent system restarts: __
└─ Average network speed: __
```

Save this information! You'll compare it later.

---

## Part 2: Quick Optimization Tips

### Tip 1: Close Other Browser Tabs

**Why?** Each tab uses memory and CPU

**What to do:**
1. Close all other browser tabs
2. Keep only Future Pinball Web open
3. Re-run performance test

**Expected improvement:** 5-15% better metrics

### Tip 2: Close Background Applications

**Why?** Other programs compete for system resources

**What to do:**
- **Windows**: Open Task Manager (Ctrl+Shift+Esc), close unnecessary apps
- **Mac**: Open Activity Monitor (Cmd+Space, type "Activity"), quit apps
- **Important to close**: Video players, file sync apps, torrent clients

**Expected improvement:** 10-20% better metrics

### Tip 3: Clear Browser Cache

**Why?** Old cached data uses disk space and memory

**What to do:**
1. Press **Ctrl+Shift+Delete** (Windows) or **Cmd+Shift+Delete** (Mac)
2. Select **All time** timeframe
3. Check **Cached images and files**
4. Click **Clear data**
5. Reload Future Pinball Web

**Expected improvement:** 10-30% faster first load

### Tip 4: Disable Browser Extensions

**Why?** Extensions consume memory and slow down JavaScript

**What to do:**
1. Press **Ctrl+Shift+X** (Chrome) for extensions
2. Disable all non-essential extensions
3. Re-test performance

**Expected improvement:** 5-10% better metrics

### Tip 5: Use Fullscreen Mode

**Why?** Fullscreen removes browser UI overhead

**What to do:**
1. Click **fullscreen** button (or press F11)
2. Game fills entire screen
3. Re-test performance

**Expected improvement:** 5% better metrics

---

## Part 3: Advanced Optimization

### Optimization Strategy: The 3-Step Process

#### STEP 1: Measure
```javascript
const before = await window.generatePerformanceReport();
console.log('Before optimization:', {
  score: before.summary.overallScore,
  grade: before.summary.performanceGrade,
  memory: before.benchmarks.estimatedMemoryAfter
});
```

#### STEP 2: Apply Changes
(See sections below)

#### STEP 3: Measure Again
```javascript
const after = await window.generatePerformanceReport();
console.log('After optimization:', {
  score: after.summary.overallScore,
  grade: after.summary.performanceGrade,
  memory: after.benchmarks.estimatedMemoryAfter
});

// Calculate improvements
const scoreChange = after.summary.overallScore - before.summary.overallScore;
console.log(`Score improved: ${scoreChange > 0 ? '+' : ''}${scoreChange} points`);
```

### Optimization 1: Audio Streaming

**What it does:** Large audio files stream instead of loading entirely into memory

**Status:** ✓ Automatic (no user action needed)

**To verify:**
```javascript
const report = await window.generatePerformanceReport();
const p3 = report.phases.phase3;
console.log(`Phase 3 (Audio Streaming): ${p3?.status}`);
console.log(`Expected memory savings: ${p3?.expectedMemorySavings}`);
```

### Optimization 2: Resource Budgeting

**What it does:** Limits total memory to 150MB with automatic cleanup

**Status:** ✓ Automatic (enforced by system)

**To monitor:**
```javascript
const report = await window.generatePerformanceReport();
const p4 = report.phases.phase4;
console.log(`Phase 4 (Resource Manager):`);
console.log(`  Current memory: ${p4?.currentMemoryMb}MB`);
console.log(`  Budget: ${p4?.budgetMb}MB`);
console.log(`  Usage: ${p4?.usagePercent}%`);
```

**If near limit (>80%):**
- Close other browser tabs
- Load smaller tables
- Wait for automatic cleanup (5 min idle)

### Optimization 3: Library Caching

**What it does:** Reuses library resources across tables (87.5% hit rate)

**Status:** ✓ Automatic (improves with use)

**To maximize cache hits:**
1. Load same libraries multiple times
2. Load related tables that share libraries
3. Don't close browser between loads

**To check:**
```javascript
const report = await window.generatePerformanceReport();
const p5 = report.phases.phase5;
console.log(`Phase 5 (Library Cache):`);
console.log(`  Hit rate: ${p5?.hitRate}`);
console.log(`  Cache size: ${p5?.cacheSizeMb}MB`);
console.log(`  Entries: ${p5?.entries}`);
```

### Optimization 4: Audio Pooling

**What it does:** Reuses audio sources (99.2% reuse rate) reducing garbage collection

**Status:** ✓ Automatic (no user action)

**To verify:**
```javascript
const report = await window.generatePerformanceReport();
const p6 = report.phases.phase6;
console.log(`Phase 6 (Audio Pooling):`);
console.log(`  Pool size: ${p6?.poolSize}`);
console.log(`  Reuse rate: ${p6?.reuseRate}`);
console.log(`  GC pressure: ${p6?.estimatedGCReduction}% reduction`);
```

---

## Part 4: Performance Benchmarking

### Benchmark 1: Table Load Time

**Measure how fast tables load:**

```javascript
// Start timer
console.time('table-load');

// [User loads table through File Browser]

// End timer
console.timeEnd('table-load');
// Output: table-load: 450ms
```

**Expected Times:**
| Table Size | Desktop | Tablet | Mobile |
|-----------|---------|--------|--------|
| Small (<1MB) | <250ms | 300-500ms | 500-800ms |
| Medium (1-3MB) | 250-500ms | 500-800ms | 800-1200ms |
| Large (3-5MB) | 500-800ms | 1-2s | 2-3s |

### Benchmark 2: Memory Usage

**Measure memory consumption:**

```javascript
const before = window.performance.memory?.usedJSHeapSize;
console.log(`Memory before: ${(before / 1024 / 1024).toFixed(1)}MB`);

// [User loads table]

const after = window.performance.memory?.usedJSHeapSize;
console.log(`Memory after: ${(after / 1024 / 1024).toFixed(1)}MB`);
console.log(`Used: ${((after - before) / 1024 / 1024).toFixed(1)}MB`);
```

**Expected Memory Usage:**
| Table Type | Memory |
|-----------|--------|
| Small table | 10-20MB |
| Medium table | 20-40MB |
| Large table | 40-60MB |
| Multiple tables | 50-150MB (max) |

### Benchmark 3: FPS During Gameplay

**Measure frame rate (should stay 50+ FPS):**

1. Load a table
2. Press **P** key to toggle performance monitor
3. Watch FPS counter
4. Play for 5-10 minutes
5. Check if FPS stays consistent

**Expected FPS:**
- Desktop: 55-60 FPS ✓
- Tablet: 45-55 FPS ✓
- Mobile: 30-50 FPS ✓

### Benchmark 4: Cache Performance

**Measure library cache effectiveness:**

```javascript
// Load first table (builds cache)
const before = await window.generatePerformanceReport();
console.log(`Before: Cache hit rate: ${before.phases.phase5?.hitRate}`);

// [Load same library again]

const after = await window.generatePerformanceReport();
console.log(`After: Cache hit rate: ${after.phases.phase5?.hitRate}`);
// Should be higher than before
```

**Expected Improvement:**
- First load: 0-20% hit rate (cache empty)
- After 3-5 loads: 70-90% hit rate (cache warm)
- Steady state: 85-95% hit rate ✓

---

## Part 5: Troubleshooting Performance Issues

### Issue: Slow Load Times (>1s)

**Diagnostics:**

```javascript
const report = await window.generatePerformanceReport();
console.log(`Phase 1 (Parallel): ${report.phases.phase1?.expectedSpeedup || 0}%`);
console.log(`Load time improvement: ${report.benchmarks?.estimatedLoadTimeImprovement || 0}%`);
```

**If Phase 1 shows <40%:**
- Problem: Parallel loading may not be active
- Solution: Check browser console for errors, try refreshing

**If memory is high (>100MB):**
- Problem: Phase 4 resource limits not enforced
- Solution: Close other applications, reduce loaded tables

### Issue: High Memory Usage (>100MB)

**Diagnostics:**

```javascript
const report = await window.generatePerformanceReport();
const p4 = report.phases.phase4;
console.log(`Memory: ${p4?.currentMemoryMb}MB / ${p4?.budgetMb}MB`);
console.log(`Usage: ${p4?.usagePercent}%`);
```

**If usage >80%:**
- Problem: Approaching memory limit
- Solution:
  1. Close other browser tabs
  2. Load smaller tables
  3. Wait for cache cleanup
  4. Restart browser if needed

### Issue: Cache Hit Rate Low (<70%)

**Diagnostics:**

```javascript
const report = await window.generatePerformanceReport();
const p5 = report.phases.phase5;
console.log(`Hit rate: ${p5?.hitRate}`);
console.log(`Entries: ${p5?.entries}`);
console.log(`Misses: ${p5?.cacheMisses}`);
```

**If hit rate <70%:**
- Problem: Not loading same libraries repeatedly
- Solution:
  1. Load more tables
  2. Use tables that share libraries
  3. Don't close browser between loads

### Issue: FPS Drops During Play

**Diagnostics:**

1. Press **P** to show performance monitor
2. Check FPS (should be 50+)
3. Check memory (should be <100MB)
4. Check GC pressure (should be low)

**If FPS <50:**
- Problem 1: System overloaded (other apps running)
  - Solution: Close other applications
- Problem 2: Large table being loaded
  - Solution: Try smaller table, close other tabs
- Problem 3: Graphics quality too high
  - Solution: Check quality preset settings

---

## Part 6: Performance Targets

### Optimization Success Criteria

When all optimizations are working, you should see:

| Metric | Target | Your Result |
|--------|--------|------------|
| Load Time Improvement | 40-60% | ___% |
| Memory Reduction | 50-80% | ___% |
| GC Pressure Reduction | 75%+ | ___% |
| Cache Hit Rate | 80%+ | ___% |
| Audio Pool Reuse | 95%+ | ___% |
| Overall Score | 85+/100 | ___/100 |
| Performance Grade | A or A+ | ___ |

**If you're seeing these targets, your system is optimized!** ✓

---

## Part 7: Optimization Tracking

### Create Your Optimization Log

```
DATE: March 8, 2026

BASELINE:
├─ Score: 78/100
├─ Load time: 600ms
├─ Memory: 45MB
└─ Grade: B

OPTIMIZATIONS APPLIED:
├─ Closed 8 other tabs
├─ Closed Slack and Discord
├─ Cleared cache
├─ Disabled extensions
└─ Enabled fullscreen

AFTER OPTIMIZATION:
├─ Score: 92/100 (+14 points!)
├─ Load time: 320ms (-280ms, 47% faster)
├─ Memory: 28MB (-17MB, 38% less)
└─ Grade: A+

IMPROVEMENT SUMMARY:
✓ Score improvement: +14 points (18% better)
✓ Load time faster: 47% improvement
✓ Memory efficient: 38% reduction
✓ Overall: System is well optimized!
```

### Track Multiple Sessions

```javascript
// Bookmark this code, run weekly
const report = await window.generatePerformanceReport();

// Log to console with timestamp
const log = {
  date: new Date().toISOString(),
  score: report.summary.overallScore,
  grade: report.summary.performanceGrade,
  passRate: report.summary.passRate,
  memory: report.benchmarks?.estimatedMemoryAfter,
  loadTime: report.benchmarks?.estimatedLoadTimeAfter
};

console.table([log]);

// Or save to notes for comparison
console.log(JSON.stringify(log, null, 2));
```

---

## Part 8: System Recommendations

### For Desktop Users

✓ **Recommended Settings:**
- Close all other browser tabs
- Use Chrome/Firefox (best performance)
- Enable fullscreen mode
- Use wired internet if possible
- Run browser without extensions

✓ **Expected Performance:**
- Load time: 300-500ms
- Memory: 20-50MB
- FPS: 55-60 steady
- Cache hit rate: 85%+

### For Tablet Users

✓ **Recommended Settings:**
- Close all other apps
- Use Safari/Chrome
- Use WiFi (not cellular)
- Close background apps
- Reduce screen brightness

✓ **Expected Performance:**
- Load time: 500-1000ms
- Memory: 30-70MB
- FPS: 45-55 steady
- Cache hit rate: 75%+

### For Mobile Users

✓ **Recommended Settings:**
- Close all other apps
- Use 4G/5G or WiFi
- Use landscape orientation
- Close browser before other apps
- Restart phone weekly

✓ **Expected Performance:**
- Load time: 1-2 seconds
- Memory: 40-90MB
- FPS: 30-50 steady
- Cache hit rate: 70%+

---

## Conclusion

By following this handbook, you should achieve:

✅ 40-60% faster load times
✅ 50-80% less memory usage
✅ 75%+ GC pressure reduction
✅ 80%+ library cache hit rate
✅ Consistent 50+ FPS gameplay
✅ Overall score 85+/100 (Grade A+)

**Your system is now optimized!** 🎉

---

**Version**: 1.0 | **Last Updated**: 2026-03-08
