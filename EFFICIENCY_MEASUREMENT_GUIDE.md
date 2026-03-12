# Performance Measurement & Profiling Guide

**Purpose**: Quantify efficiency improvements before and after optimizations
**Tools**: Chrome DevTools, Lighthouse, console monitoring
**Time**: 10-15 minutes per measurement cycle

---

## Pre-Optimization Baseline (Measure Now)

### Step 1: Timeline Recording (Chrome DevTools)

**Procedure**:
```
1. Open DevTools (F12)
2. Go to Performance tab
3. Click Record (or Ctrl+Shift+E)
4. Reload page (Cmd+R or Ctrl+R)
5. Wait until page is fully interactive (can move flippers, see table)
6. Stop recording
7. Export for comparison
```

**What to look for**:
- **Total startup time**: From reload to first frame (should be visible in timeline)
- **applyQualityPreset() calls**: How many, how long each takes
- **Layout/Paint duration**: Should be minimal after startup
- **JavaScript execution**: Look for spikes in JS time

**Export timeline**:
```
Performance tab → ⋮ menu → Save as file → BASELINE_startup.json
```

### Step 2: Console Metrics (Browser Console)

**Run these commands**:
```javascript
// Check if initialization metrics are available
console.log('=== INITIALIZATION TIMINGS ===');
console.log('Physics worker:', (window.PHYSICS_WORKER_TIME_MS || '❌ not measured') + 'ms');
console.log('Quality preset:', (window.INIT_QUALITY_PRESET_OK - window.INIT_BEFORE_QUALITY_PRESET || '❌ not measured') + 'ms');
console.log('BAM engine:', (window.INIT_BAM_ENGINE_OK - window.INIT_BAM_ENGINE_START || '❌ not measured') + 'ms');
console.log('Animation binding:', (window.INIT_ANIM_BINDING_OK - window.INIT_ANIM_BINDING_START || '❌ not measured') + 'ms');

// Performance metrics
console.log('\n=== PERFORMANCE METRICS ===');
const metrics = window.getMetricsDisplay?.();
console.log(metrics || '❌ Profiler not available');

// Memory usage
const mem = performance.memory;
if (mem) {
  console.log('\n=== MEMORY ===');
  console.log(`Used: ${(mem.usedJSHeapSize / 1048576).toFixed(1)}MB`);
  console.log(`Total: ${(mem.jsHeapSizeLimit / 1048576).toFixed(1)}MB`);
  console.log(`Limit: ${(mem.jsHeapSizeLimit / 1048576).toFixed(1)}MB`);
}

// Current quality preset
console.log('\n=== QUALITY PRESET ===');
const preset = window.getQualityPreset?.();
console.log(preset || '❌ Profiler API not available');
```

**Copy output** → Save to file: `BASELINE_console_metrics.txt`

### Step 3: Lighthouse Score (Optional but Recommended)

**Procedure**:
```
1. DevTools → Lighthouse tab
2. Select "Performance"
3. Click "Analyze page load"
4. Wait 30-60 seconds
5. View report
6. Save report → BASELINE_lighthouse.html
```

**Key metrics to note**:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)

---

## Performance During Gameplay

### Step 4: Frame Time Consistency (Console Monitor)

**Run in console during gameplay**:
```javascript
// Monitor frame times over 30 seconds
let frameTimes = [];
let lastTime = performance.now();
let stopMonitoring = false;

const fpsMonitor = setInterval(() => {
  const now = performance.now();
  const dt = now - lastTime;
  frameTimes.push(dt);
  lastTime = now;

  if (frameTimes.length >= 1800) {  // 30 seconds at 60 FPS
    clearInterval(fpsMonitor);
    stopMonitoring = true;

    // Calculate statistics
    const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const min = Math.min(...frameTimes);
    const max = Math.max(...frameTimes);
    const p95 = frameTimes.sort((a, b) => a - b)[Math.floor(frameTimes.length * 0.95)];

    console.log('=== FRAME TIME STATISTICS (30 sec) ===');
    console.log(`Average: ${avg.toFixed(2)}ms (${(1000/avg).toFixed(0)} FPS)`);
    console.log(`Min: ${min.toFixed(2)}ms`);
    console.log(`Max: ${max.toFixed(2)}ms`);
    console.log(`95th percentile: ${p95.toFixed(2)}ms`);
    console.log(`Jitter (max-min): ${(max - min).toFixed(2)}ms`);

    // Copy to clipboard
    const report = `Avg: ${avg.toFixed(2)}ms, Min: ${min.toFixed(2)}ms, Max: ${max.toFixed(2)}ms, P95: ${p95.toFixed(2)}ms`;
    console.log('Copy: ' + report);
  }
}, 0);

console.log('Monitoring frame times... will complete in ~30 seconds');
```

**Do this twice**:
1. Once before optimizations
2. Once after optimizations
3. Compare jitter/variance

---

## Post-Optimization Measurement

### Step 5: Repeat All Baseline Steps

After implementing each optimization:

1. **Rebuild**: `npm run build`
2. **Hard reload**: `Cmd+Shift+R` (clears cache)
3. **Record timeline** → `AFTER_opt1_startup.json`
4. **Capture console metrics** → `AFTER_opt1_console_metrics.txt`
5. **Run frame time monitor** → Copy statistics to file

### Step 6: Compare Results

**Create comparison spreadsheet**:

| Metric | Before | After Opt1 | After Opt2 | After Opt3 | Savings |
|--------|--------|-----------|-----------|-----------|---------|
| **Startup (ms)** | 1200 | 1195 | 1190 | 1185 | -15ms |
| **Quality preset (ms)** | 5.2 | 4.8 | 4.5 | 4.2 | -1ms |
| **Avg frame time (ms)** | 16.7 | 16.7 | 16.6 | 16.6 | -0.1ms |
| **Max frame time (ms)** | 45.3 | 44.8 | 43.2 | 42.9 | -2.4ms |
| **Memory (MB)** | 185 | 184 | 184 | 183 | -2MB |
| **Lighthouse score** | 78 | 79 | 80 | 81 | +3 |

---

## Detailed Performance Analysis

### Timeline Interpretation

**Good startup timeline looks like**:
```
0-10ms:    HTML parsing, DOM creation
10-50ms:   THREE.js setup, renderer init
50-100ms:  Table loading, FPT parsing
100-150ms: Physics worker init (async)
150-200ms: Graphics pass init (Polish Suite)
200-250ms: Animation system init
250-300ms: First frame render
```

**What to avoid**:
- Long red blocks = Main thread blocked (bad)
- Continuous green = JS executing (okay if brief)
- Purple spikes = Rendering delays (investigate)
- Yellow blocks = Parsing/compiling (minimize)

### applyQualityPreset() Profiling

**In Chrome DevTools**:
```
1. Performance tab → Record
2. In console: window.setQualityPreset('low')
3. Stop recording
4. Search timeline for "applyQualityPreset"
5. View function breakdown
```

**Expected time**:
- Before optimization: 5-10ms
- After optimization: 3-5ms

### Memory Profiling

**Heap snapshot comparison**:
```
1. Memory tab → Take heap snapshot (before)
2. Play for 2 minutes
3. Take another snapshot (after)
4. Compare retained objects
5. Look for accumulating arrays/objects
```

**Expected result**: No significant increase in retained memory

---

## Measurement Spreadsheet Template

Create a Google Sheets document with tabs for:

### Tab 1: Startup Metrics

| Timestamp | Build | Startup (ms) | Physics (ms) | Quality (ms) | BAM (ms) | Notes |
|-----------|-------|-------------|-------------|------------|---------|-------|
| 2026-03-11 | baseline | 1200 | 150 | 5.2 | 25 | Before opt |
| 2026-03-12 | opt1 | 1195 | 150 | 4.8 | 25 | Null checks |
| 2026-03-12 | opt2 | 1190 | 150 | 3.5 | 25 | Preset copy |
| 2026-03-12 | opt3 | 1185 | 150 | 3.4 | 25 | Remove checks |

### Tab 2: Runtime Performance

| Timestamp | Avg FPS | Min Frame (ms) | Max Frame (ms) | Jitter | Memory (MB) |
|-----------|---------|--------------|--------------|--------|------------|
| 2026-03-11 | 59.8 | 15.2 | 45.3 | 30.1 | 185 |
| 2026-03-12 | 59.9 | 15.1 | 43.2 | 28.1 | 183 |

### Tab 3: Visual Regression Test

| Timestamp | Build | Table | Visual OK? | Performance OK? | Notes |
|-----------|-------|-------|-----------|-----------------|-------|
| 2026-03-11 | baseline | Classic | ✅ | ✅ | Baseline |
| 2026-03-12 | opt1 | Classic | ✅ | ✅ | No change |
| 2026-03-12 | opt1 | Galaxy | ✅ | ✅ | Preset change smooth |

---

## Console Command Reference

**Quick-access commands** (save to bookmarklet):

```javascript
// Check current preset
window.profiler?.getQualityPreset?.() || console.log('Profiler not found');

// Change preset and watch timeline
window.setQualityPreset('ultra');

// Get performance metrics
window.getMetricsDisplay?.();

// Check initialization times
Object.keys(window).filter(k => k.includes('INIT')).forEach(k => {
  console.log(`${k}: ${window[k]}`);
});

// Monitor memory
setInterval(() => {
  const mem = performance.memory;
  console.log(`Memory: ${(mem.usedJSHeapSize/1048576).toFixed(1)}MB / ${(mem.jsHeapSizeLimit/1048576).toFixed(1)}MB`);
}, 1000);
```

---

## Success Criteria

### Startup Performance

| Target | Before | After | Status |
|--------|--------|-------|--------|
| Total startup | ~1200ms | <1200ms | ✅ No regression |
| Polish Suite | 12-30ms | <20ms | ⚠️ Optional, depends on parallelization |
| Quality preset | 5-10ms | 3-5ms | ✅ Target |

### Frame-Time Performance

| Target | Before | After | Status |
|--------|--------|-------|--------|
| Avg FPS | 59-60 | 59-60 | ✅ No regression |
| Max frame time | <50ms | <45ms | ✅ Small improvement |
| Jitter | <35ms | <30ms | ✅ Better consistency |

### Memory & Bundling

| Target | Before | After | Status |
|--------|--------|-------|--------|
| Bundle size | ~568KB gz | <568KB gz | ✅ No increase |
| Heap at startup | ~180MB | <190MB | ✅ No leaks |
| Heap after 5min play | ~200MB | <200MB | ✅ No growth |

### Visual & Functional

| Target | Before | After | Status |
|--------|--------|-------|--------|
| Visual glitches | 0 | 0 | ✅ Required |
| Preset changes | Smooth | Smooth | ✅ Required |
| Error messages | None | None | ✅ Required |

---

## Troubleshooting Measurements

### Issue: Timeline shows very long JavaScript execution

**Likely cause**: Physics worker or table loading blocking main thread

**Solution**: Check if this is async (expected). Look for worker.step() calls—should be off main thread.

### Issue: applyQualityPreset() doesn't appear in timeline

**Likely cause**: Function executed before timeline started recording, or too fast to see

**Solution**: Trigger with `window.setQualityPreset('low')` while recording

### Issue: Memory grows continuously during gameplay

**Likely cause**: Memory leak in particle system or animation binding

**Solution**: Check heap snapshot for retained objects. Look for growing arrays or unreleased event listeners.

### Issue: Frame time spikes visible

**Likely cause**: GC pauses (Chrome garbage collection)

**Solution**: Normal and expected. Check if spikes occur at regular intervals (every 10-30 sec). If so, GC is healthy.

---

## Automation Script (Optional)

Save as `benchmark.js` in project root:

```javascript
#!/usr/bin/env node

/**
 * Simple benchmark to measure applyQualityPreset performance
 * Run: node benchmark.js
 */

const iterations = 1000;
const qualityPresets = ['low', 'medium', 'high', 'ultra'];

console.log(`Benchmarking applyQualityPreset over ${iterations} iterations...`);
console.log('This requires a browser context. Run in DevTools console instead.\n');

console.log('Paste this in browser console:');
console.log(`
const iterations = ${iterations};
const qualityPresets = ['low', 'medium', 'high', 'ultra'];
let results = {};

for (const preset of qualityPresets) {
  window.setQualityPreset(preset);
  const start = performance.now();

  for (let i = 0; i < ${iterations}; i++) {
    // This will hit early-exit most of the time
    applyQualityPreset?.();
  }

  const end = performance.now();
  const avg = (end - start) / ${iterations};
  results[preset] = avg;
  console.log(\`\${preset}: \${avg.toFixed(3)}ms avg\`);
}

console.log('Results:', results);
`);
```

---

## Recommended Measurement Schedule

| Phase | Timeline | Measurement |
|-------|----------|------------|
| **Before optimizations** | Day 1 | Baseline all metrics |
| **After Action 1** | Day 2 | Quick check (console only) |
| **After Action 2** | Day 2 | Full measurement |
| **After Action 3** | Day 2 | Quick check (console only) |
| **Post-review** | Day 3 | Full Lighthouse + timeline |
| **After Action 4 (optional)** | Week 2 | Full measurement if attempted |

---

## Final Checklist

Before marking optimization complete:

- [ ] Baseline measurements recorded (timeline, console, Lighthouse)
- [ ] Code changes implemented
- [ ] Build successful (`npm run build` no errors)
- [ ] No visual regressions (tested 3+ tables)
- [ ] Post-measurement recorded (timeline, console, metrics)
- [ ] Comparison spreadsheet updated
- [ ] No new console errors or warnings
- [ ] Memory profiling shows no leaks
- [ ] Frame times consistent (jitter unchanged or improved)
- [ ] Performance improvement documented

---

## Example Report Format

**Before Optimization**:
```
Startup time: 1247ms
Quality preset: 5.8ms
Avg frame time: 16.73ms
Max frame time: 48.2ms
Jitter: 32.9ms
Memory: 187MB
Lighthouse score: 78
```

**After All Optimizations**:
```
Startup time: 1225ms (-22ms, 1.8%)
Quality preset: 3.2ms (-2.6ms, 45% faster)
Avg frame time: 16.71ms (-0.02ms)
Max frame time: 45.8ms (-2.4ms, 5% improvement)
Jitter: 29.1ms (-3.8ms, better consistency)
Memory: 185MB (-2MB, 1% reduction)
Lighthouse score: 81 (+3 points)
```

---

## Conclusion

**Good measurement practices**:
1. ✅ Always record baseline before changes
2. ✅ Test same conditions (same table, same browser, same network)
3. ✅ Multiple measurements (not just one-off)
4. ✅ Hard reload between tests (clear cache)
5. ✅ Document everything

**Expected measurements to change**:
- Startup time: ±5-10ms variance
- Frame time: ±0.5-1ms variance
- applyQualityPreset: ±0.5-1ms change
- Memory: ±5-10MB variance (GC-dependent)

**Expected to stay constant**:
- FPS (should remain ~60)
- Visual output (identical)
- Functionality (no features broken)

