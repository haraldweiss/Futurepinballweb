# Integration Testing Guide — Testing All 6 Optimization Phases

## Overview

This guide provides comprehensive instructions for testing and benchmarking all 6 optimization phases working together in the Future Pinball Web application.

## Quick Start

### Run All Tests (from Browser Console)

```javascript
// Run all integration tests
const report = await window.runIntegrationTests();

// View the report
console.log(report);

// Export report as JSON
const json = JSON.stringify(report, null, 2);
```

### Test Results Interpretation

```
✅ Phase 1: Parallel Resource Loading
   - Verifies Promise.all() pattern
   - Expected: 40-60% faster loading
   - Failure: Promise.all not detected

⚠️ Phase 2: Progress UI Callbacks
   - Verifies loading overlay HTML
   - Verifies callback interface
   - Expected: Loading feedback during table load
   - Failure: Overlay or callbacks missing

✅ Phase 3: Audio Streaming
   - Verifies audio size estimation
   - Verifies dual playback paths (AudioBuffer | string)
   - Expected: 50-80% memory reduction for music
   - Failure: Streaming interface not implemented

✅ Phase 4: Resource Manager
   - Verifies ResourceManager class
   - Verifies LRU eviction logic
   - Verifies stats tracking
   - Expected: Hard 150MB memory cap
   - Failure: ResourceManager class not found

✅ Phase 5: Library Cache
   - Verifies LibraryCache class
   - Verifies TTL system
   - Verifies cleanup timer
   - Verifies hash validation
   - Expected: ~50% cache reduction
   - Failure: LibraryCache class not found

✅ Phase 6: Audio Pooling
   - Verifies AudioSourcePool class
   - Verifies acquire/release pattern
   - Verifies stats tracking
   - Expected: 75% fewer GC sweeps
   - Failure: AudioSourcePool class not found
```

## Detailed Testing Procedures

### Test 1: Verify All Phases Initialized (Browser Console)

```javascript
// Phase 4: Resource Manager
const rmStats = window.getResourceStats();
console.log('ResourceManager stats:', rmStats);
// Expected: { entries: N, totalSize: XMB, ... }

// Phase 5: Library Cache
const lcStats = window.getLibraryCacheStats();
console.log('LibraryCache stats:', lcStats);
// Expected: { entries: N, totalSize: XMB, hitRate: "X%", ... }

// Phase 6: Audio Source Pool
const aspStats = window.getAudioSourcePoolStats();
console.log('AudioSourcePool stats:', aspStats);
// Expected: { poolSize: 16, available: 12, inUse: 4, reuseRate: "99%", ... }
```

### Test 2: Load Table and Monitor Phase 1 (Parallel Loading)

**Procedure:**
1. Open browser console: `F12`
2. Select a table from file browser
3. Watch loading overlay appear (Phase 2)
4. Check parse log for timing:
   ```
   ✓ IMAGES phase complete: 245ms
   ✓ AUDIO phase complete: 189ms
   ```
5. Verify times are fast (expected <500ms for typical FPT)

**Success Criteria:**
- Loading overlay appears immediately
- Progress bar shows smooth animation
- Table loads in <1 second
- No blank screen after progress complete

### Test 3: Monitor Phase 4 (Resource Manager) During Load

**Procedure:**
1. Open console before loading table
2. Load a table
3. During load, run:
   ```javascript
   window.logResourceStats();
   ```
4. Watch memory usage:
   ```
   💾 Memory Usage:
     Textures:  45.3 MB / 50.0 MB (8 items)
     Audio:     12.1 MB / 20.0 MB (3 items)
     Models:    8.7 MB / 50.0 MB (1 item)
     Total:     66.1 MB / 150.0 MB (44.1%)
   ```

**Success Criteria:**
- Total memory stays under 150MB
- No warning about exceeding budget
- Stats update as resources load

### Test 4: Monitor Phase 5 (Library Cache) Over Time

**Procedure:**
1. Load first table (caches library)
   ```javascript
   window.logLibraryCacheStats();
   // Should show: 1 entry cached
   ```
2. Load second table with same library
   ```javascript
   window.logLibraryCacheStats();
   // Cache hit: accessCount increases, no new entry
   ```
3. Load third table with different library
   ```javascript
   window.logLibraryCacheStats();
   // Should show: 2 entries cached (reused first)
   ```
4. Wait 1 hour (or manually trigger cleanup):
   ```javascript
   window.cleanupLibraryCache();
   // Should show: expired entries removed
   ```

**Success Criteria:**
- Cache hits don't duplicate entries
- Hit rate increases over multiple loads
- Cleanup removes idle entries after TTL
- No memory growth from cache

### Test 5: Monitor Phase 6 (Audio Pooling) During Gameplay

**Procedure:**
1. Load table and start playing
2. Open console during gameplay
3. Monitor pool stats:
   ```javascript
   setInterval(() => {
     const stats = window.getAudioSourcePoolStats();
     console.log(`Pool: ${stats.available}/${stats.poolSize} available, reuse rate: ${stats.reuseRate}`);
   }, 1000);
   ```
4. Hit bumpers frequently
5. Watch for high reuse rate (should be >95%)

**Success Criteria:**
- Reuse rate stays >90% (ideally >95%)
- No "created" stat increasing (means pool serving needs)
- Audio plays smoothly without stuttering
- inUse count matches concurrent sounds

### Test 6: Stress Test (Heavy Load)

**Procedure:**
1. Start integration tests:
   ```javascript
   const report = await window.runIntegrationTests();
   ```
2. Load multiple tables in sequence:
   - Table 1 → check ResourceManager
   - Table 2 → check LibraryCache
   - Table 3 → check all three
3. Play each table for 30 seconds
4. Monitor FPS (press P key):
   - Should stay >50fps
   - No stutter during audio playback
5. Check memory:
   ```javascript
   window.logResourceStats();
   window.logLibraryCacheStats();
   window.logAudioSourcePoolStats();
   ```

**Success Criteria:**
- All tables load successfully
- Memory stays under budget
- FPS remains smooth
- No errors in console
- Cache efficiency >90%
- Audio pool reuse >95%

## Performance Benchmarking

### Benchmark 1: Table Load Time

```javascript
// Phase 1 test: Parallel loading speed
window.benchmark.start('phase1_load');
// [Load table in UI]
const loadTime = window.benchmark.end('phase1_load');
console.log(`Load time: ${loadTime.toFixed(0)}ms`);
// Expected: <500ms for typical FPT
```

### Benchmark 2: Memory Usage Over Time

```javascript
// Phase 4 + 5 test: Memory efficiency
const memories = [];

window.memoryProfiler.snapshot('start');
for (let i = 0; i < 10; i++) {
  window.memoryProfiler.snapshot(`after_load_${i}`);
}

const snapshots = window.memoryProfiler.getSnapshots();
for (const snap of snapshots) {
  const mb = (snap.memory / 1024 / 1024).toFixed(1);
  console.log(`${new Date(snap.timestamp).toLocaleTimeString()}: ${mb}MB`);
}
// Expected: Memory stabilizes after Phase 4/5 initialization
```

### Benchmark 3: GC Pressure During Audio Playback

```javascript
// Phase 6 test: GC reduction
window.benchmark.start('audio_playback_gc');

// [Play many sounds: bumper hits, rapid-fire effects]
// Monitor in DevTools: Performance tab → Memory → GC pauses

const duration = window.benchmark.end('audio_playback_gc');
const poolStats = window.getAudioSourcePoolStats();

console.log(`Playback duration: ${duration.toFixed(0)}ms`);
console.log(`Reuse rate: ${poolStats.reuseRate}`);
console.log(`GC-induced stutters: should be minimal with >95% reuse`);
```

## Automated Test Report

### Example Output

```
╔════════════════════════════════════════════════════╗
║        INTEGRATION TEST REPORT                      ║
╚════════════════════════════════════════════════════╝

📊 Summary:
   Total: 6 | Passed: 6 | Failed: 0 | Warnings: 0
   Duration: 125.34ms

📋 Phase Results:

✅ Phase 1: Parallel Resource Loading
   Duration: 12.45ms
   Metrics:
     • parallel_loading_enabled: true
     • expected_speedup: 40-60%

✅ Phase 2: Progress UI Callbacks
   Duration: 8.32ms
   Metrics:
     • callback_interface_defined: true
     • overlay_html_exists: true
     • expected_feature: Progress loading animation

✅ Phase 3: Audio Streaming
   Duration: 6.78ms
   Metrics:
     • audio_size_estimation: true
     • dual_playback_paths: true
     • expected_memory_reduction: 50-80%

✅ Phase 4: Resource Budget Management
   Duration: 5.23ms
   Metrics:
     • resource_manager_exists: true
     • lru_eviction_implemented: true
     • stats_tracking: true
     • window_api_available: true

✅ Phase 5: Library Caching with TTL
   Duration: 7.56ms
   Metrics:
     • library_cache_exists: true
     • ttl_system_implemented: true
     • cleanup_timer_implemented: true
     • hash_validation_implemented: true
     • window_api_available: true

✅ Phase 6: Audio Source Pooling
   Duration: 9.34ms
   Metrics:
     • audio_pool_exists: true
     • acquire_release_pattern: true
     • stats_tracking: true
     • integrated_in_audio.ts: true
     • window_api_available: true

✅ Integration Tests Complete
```

## Troubleshooting

### Phase 4 ResourceManager Not Found

**Symptom**: `window.getResourceManager()` returns undefined

**Solution**:
1. Verify src/resource-manager.ts exists
2. Check main.ts imports ResourceManager
3. Check build succeeds: `npm run build`
4. Reload page in browser: `Ctrl+Shift+R`

### Phase 5 LibraryCache Not Initialized

**Symptom**: Cache not tracking libraries, hit rate at 0%

**Solution**:
1. Verify library files are being loaded
2. Check cleanup timer is running:
   ```javascript
   const cache = window.getLibraryCache();
   // Should have cleanup timer active
   ```
3. Manually trigger cleanup:
   ```javascript
   window.cleanupLibraryCache();
   ```

### Phase 6 Audio Stuttering (Low Reuse Rate)

**Symptom**: Audio playback stutters, reuse rate <80%

**Causes & Solutions**:
1. Pool size too small: Increase to 32
   ```typescript
   // In audio.ts initializeAudioPooling()
   initializeAudioSourcePool(ctx, 32);
   ```
2. Too many simultaneous sounds: Reduce sound volume/count
3. GC still occurring: Check DevTools Memory tab

### Memory Not Being Capped (Phase 4)

**Symptom**: Memory keeps growing, exceeds 150MB

**Solution**:
1. Verify ResourceManager is initialized:
   ```javascript
   window.getResourceManager().logStats();
   ```
2. Check if LRU eviction is triggering:
   - Load 20+ large tables
   - Monitor for `🗑️ Evicted` messages in console
3. If not evicting: Adjust budgets
   ```typescript
   // In main.ts
   const customBudgets = {
     textures: 100 * 1024 * 1024,    // Larger quota
     audioBuffers: 30 * 1024 * 1024,
     models: 60 * 1024 * 1024,
     total: 250 * 1024 * 1024
   };
   ```

## Test Results Documentation

### Creating a Test Report

```javascript
// After running all tests
const report = await window.runIntegrationTests();

// Save to file (copy/paste into a text file)
const json = JSON.stringify(report, null, 2);
console.log(json);

// Or store in localStorage for later review
localStorage.setItem('lastTestReport', json);

// Retrieve later
const savedReport = JSON.parse(localStorage.getItem('lastTestReport'));
```

### What to Look For in Reports

**Good Report** (All phases passing):
```
✅ All 6 phases: passed
📊 Total duration: <200ms
⚠️ No warnings
✅ All window APIs available
```

**Warning Report** (Some issues):
```
⚠️ Phase 3: warning
  • Library cache hit rate below 50%
  • Solution: Load more tables to test cache reuse
```

**Failed Report** (Critical issues):
```
❌ Phase 4: failed
  • Error: ResourceManager class not found
  • Action: Check build, verify imports, reload browser
```

## Continuous Monitoring

### Monitor Dashboard (Browser Console)

```javascript
// Create a monitoring dashboard
function startMonitoring() {
  setInterval(() => {
    console.clear();
    console.log('=== PHASE MONITORING DASHBOARD ===\n');

    // Phase 4
    const rm = window.getResourceStats();
    console.log(`💾 ResourceManager: ${rm.total.percentUsed.toFixed(1)}% (${rm.total.usage / 1024 / 1024 | 0}MB / ${rm.total.budget / 1024 / 1024 | 0}MB)`);

    // Phase 5
    const lc = window.getLibraryCacheStats();
    console.log(`📚 LibraryCache: ${lc.hitRate} (${lc.entries} entries, ${lc.totalSize / 1024 / 1024 | 0}MB)`);

    // Phase 6
    const asp = window.getAudioSourcePoolStats();
    console.log(`🎵 AudioSourcePool: ${asp.reuseRate} reuse (${asp.available}/${asp.poolSize} available)`);
  }, 5000); // Update every 5 seconds
}

// Start monitoring
startMonitoring();
```

## Integration Testing Checklist

- [ ] Run `window.runIntegrationTests()` - all phases passing
- [ ] Load table via file browser - Phase 2 progress UI appears
- [ ] Monitor memory during load - Phase 4 stays under 150MB
- [ ] Load multiple tables - Phase 5 cache reuses libraries
- [ ] Play bumper sounds repeatedly - Phase 6 reuse rate >95%
- [ ] Check FPS with P key - stays >50fps throughout
- [ ] Wait 1+ hour - Phase 5 cleanup removes old entries
- [ ] Check parse log - Phase 1 shows timing improvements
- [ ] Verify no errors in console
- [ ] Document results and save report

## Summary

All 6 optimization phases are now fully testable through:
- **Automated integration tests**: `window.runIntegrationTests()`
- **Manual testing procedures**: Follow step-by-step guides above
- **Performance benchmarking**: Use `window.benchmark` and `window.memoryProfiler`
- **Live monitoring**: Dashboard console code provided
- **Report generation**: Export results as JSON for documentation

---

**Date**: 2026-03-08
**Version**: 0.16.7
**Status**: All 6 phases integrated and testable
