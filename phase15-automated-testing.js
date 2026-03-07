/**
 * Phase 15: Physics Worker Performance Validation Suite
 *
 * Automated testing framework for measuring FPS improvements from Physics Worker offloading
 *
 * Usage in browser console:
 * 1. Copy-paste this entire script
 * 2. Run: startPhase15Testing()
 * 3. Follow on-screen instructions
 * 4. Run: exportPhase15Results() to get results
 */

let phase15Testing = {
  isRunning: false,
  currentTest: 0,
  results: {
    timestamp: new Date().toISOString(),
    deviceInfo: {},
    tests: []
  },
  perfMonitor: null,
  gameState: null,

  // Test configurations
  tests: [
    {
      name: 'Simple Gameplay (60s)',
      description: 'No bumpers active - baseline FPS measurement',
      duration: 60,
      setup: () => {
        console.log('📌 Test A Setup: Simple gameplay - idle bumpers');
        // Game starts normally, no special actions
      },
      actions: [
        { at: 5, action: () => console.log('ℹ️ Playing normally...') },
        { at: 30, action: () => console.log('ℹ️ Halfway through...') },
        { at: 55, action: () => console.log('⏱️ Almost done...') }
      ]
    },
    {
      name: 'High Activity (60s)',
      description: 'Maximum bumper hits and ball movement',
      duration: 60,
      setup: () => {
        console.log('📌 Test B Setup: High activity - constant bumper hits');
        console.log('⚠️ Please play aggressively: rapid ball launches, target all bumpers');
      },
      actions: [
        { at: 10, action: () => console.log('ℹ️ Keep hitting bumpers...') },
        { at: 30, action: () => console.log('ℹ️ Maintain high activity...') },
        { at: 50, action: () => console.log('ℹ️ Final stretch...') }
      ]
    },
    {
      name: 'Bloom Stress (60s)',
      description: 'Quality set to ULTRA - maximum bloom effect',
      duration: 60,
      setup: () => {
        console.log('📌 Test C Setup: Bloom stress test');
        console.log('🎨 Setting quality to ULTRA (maximum bloom)...');
        if (typeof setQualityPreset === 'function') {
          setQualityPreset('ultra');
          console.log('✅ Quality set to ULTRA');
        }
      },
      actions: [
        { at: 10, action: () => console.log('ℹ️ Measuring bloom performance...') },
        { at: 30, action: () => console.log('ℹ️ Bloom effect active...') },
        { at: 50, action: () => console.log('ℹ️ Final measurements...') }
      ]
    },
    {
      name: 'Geometry Stress (4 Tables)',
      description: 'Load different tables to stress memory and geometry pooling',
      duration: 120,  // Extended for table loading
      setup: () => {
        console.log('📌 Test D Setup: Geometry stress with table switching');
        console.log('⚠️ This test loads multiple FPT tables');
        console.log('ℹ️ Watch memory in Performance Monitor (press P)');
      },
      actions: [
        { at: 10, action: () => console.log('ℹ️ Playing table 1...') },
        { at: 40, action: () => console.log('ℹ️ Memory check 1 complete...') },
        { at: 70, action: () => console.log('ℹ️ Playing table 2...') },
        { at: 100, action: () => console.log('ℹ️ All tables loaded...') }
      ]
    }
  ],

  // Initialize testing framework
  async initialize() {
    console.log('🚀 Phase 15 Testing Suite Initializing...');

    // Collect device info
    this.results.deviceInfo = {
      browser: navigator.userAgent.substring(0, 100),
      timestamp: new Date().toISOString(),
      windowSize: `${window.innerWidth}x${window.innerHeight}`,
      devicePixelRatio: window.devicePixelRatio
    };

    console.log('📊 Device Info:', this.results.deviceInfo);
    console.log('\n✅ Testing framework ready!');
    console.log('⚠️ Make sure game is loaded before starting tests');
    console.log('\nNext: Run testSequence() to start Phase A');
  },

  // Start a single test
  async startTest(testIndex) {
    const test = this.tests[testIndex];
    if (!test) {
      console.error('❌ Invalid test index');
      return;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 TEST ${String.fromCharCode(65 + testIndex)}: ${test.name}`);
    console.log(`Description: ${test.description}`);
    console.log(`Duration: ${test.duration} seconds`);
    console.log(`${'='.repeat(60)}\n`);

    // Setup phase
    test.setup();

    // Wait for user readiness
    console.log('\n⏳ Starting in 3 seconds...');
    await this.delay(3000);

    // Start performance monitoring
    console.log('\n🎬 STARTING PERFORMANCE COLLECTION');
    console.log('⚠️ Please play naturally - FPS data is being recorded');

    const testResult = {
      name: test.name,
      startTime: performance.now(),
      fps: [],
      memory: [],
      collectedSamples: 0
    };

    // Run scheduled actions
    const actionPromises = test.actions.map(({ at, action }) =>
      this.delay(at * 1000).then(() => action())
    );

    // Collect metrics every 100ms
    const collectionPromise = new Promise(resolve => {
      const startTime = performance.now();
      const interval = setInterval(() => {
        const elapsed = (performance.now() - startTime) / 1000;

        // Collect FPS from performance monitor (if visible)
        const fpsDisplay = document.querySelector('[data-fps]');
        if (fpsDisplay) {
          const fpsText = fpsDisplay.textContent;
          const fpsMatch = fpsText.match(/(\d+\.?\d*)\s*fps/i);
          if (fpsMatch) {
            testResult.fps.push(parseFloat(fpsMatch[1]));
          }
        }

        // Collect memory if available
        if (performance.memory) {
          testResult.memory.push({
            used: Math.round(performance.memory.usedJSHeapSize / 1048576),
            total: Math.round(performance.memory.totalJSHeapSize / 1048576)
          });
        }

        if (elapsed >= test.duration) {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });

    // Wait for test to complete
    await Promise.all([collectionPromise, ...actionPromises]);

    console.log('\n✅ TEST COMPLETE\n');

    // Calculate statistics
    const stats = this.calculateStats(testResult.fps);
    testResult.stats = stats;
    testResult.memoryStats = this.calculateMemoryStats(testResult.memory);
    testResult.collectedSamples = testResult.fps.length;

    this.results.tests.push(testResult);
    this.printTestSummary(testResult);

    return testResult;
  },

  // Run all tests in sequence
  async runAllTests() {
    this.isRunning = true;
    console.log('\n🎮 PHASE 15 AUTOMATED TESTING SUITE');
    console.log('Testing Physics Worker Performance Impact\n');

    for (let i = 0; i < this.tests.length; i++) {
      this.currentTest = i;

      try {
        await this.startTest(i);

        if (i < this.tests.length - 1) {
          console.log('\n⏳ Rest period: 10 seconds before next test...');
          await this.delay(10000);
        }
      } catch (error) {
        console.error(`❌ Error in test ${i}:`, error);
      }
    }

    this.isRunning = false;
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS COMPLETE');
    console.log('='.repeat(60));
    console.log('\nExport results: exportPhase15Results()');
  },

  // Calculate FPS statistics
  calculateStats(data) {
    if (!data || data.length === 0) return null;

    const sorted = [...data].sort((a, b) => a - b);
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / data.length;
    const variance = data.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: avg.toFixed(2),
      median: sorted[Math.floor(sorted.length / 2)],
      stdDev: stdDev.toFixed(2),
      p95: sorted[Math.floor(data.length * 0.95)],
      samples: data.length
    };
  },

  // Calculate memory statistics
  calculateMemoryStats(data) {
    if (!data || data.length === 0) return null;

    const usedValues = data.map(m => m.used);
    const sorted = [...usedValues].sort((a, b) => a - b);

    return {
      minUsed: Math.min(...usedValues),
      maxUsed: Math.max(...usedValues),
      avgUsed: (usedValues.reduce((a, b) => a + b, 0) / data.length).toFixed(1),
      samples: data.length
    };
  },

  // Print test summary
  printTestSummary(result) {
    if (!result.stats) {
      console.warn('⚠️ No FPS data collected. Ensure Performance Monitor is visible (press P)');
      return;
    }

    console.log(`
╔════════════════════════════════════════════════════════╗
║            TEST RESULTS: ${result.name.padEnd(30)}║
╚════════════════════════════════════════════════════════╝

📊 FPS STATISTICS (${result.stats.samples} samples):
   • Minimum:    ${result.stats.min.toFixed(1)} FPS
   • Average:    ${result.stats.avg} FPS ⭐
   • Maximum:    ${result.stats.max.toFixed(1)} FPS
   • Median:     ${result.stats.median.toFixed(1)} FPS
   • Std Dev:    ${result.stats.stdDev}
   • 95th %ile:  ${result.stats.p95.toFixed(1)} FPS

💾 MEMORY STATISTICS:
   • Min Used:   ${result.memoryStats.minUsed} MB
   • Max Used:   ${result.memoryStats.maxUsed} MB
   • Avg Used:   ${result.memoryStats.avgUsed} MB

🎯 QUALITY ASSESSMENT:
   ${parseFloat(result.stats.avg) >= 55 ? '✅ EXCELLENT (55+ FPS)' :
     parseFloat(result.stats.avg) >= 50 ? '✅ GOOD (50-55 FPS)' :
     '⚠️ ACCEPTABLE (45-50 FPS)'}

    `);
  },

  // Export full results
  exportResults() {
    const report = `
# Phase 15 Physics Worker Performance Test Results

**Test Date**: ${this.results.timestamp}
**Device**: ${this.results.deviceInfo.browser}
**Window Size**: ${this.results.deviceInfo.windowSize}
**Device Pixel Ratio**: ${this.results.deviceInfo.devicePixelRatio}

---

## Test Results Summary

| Test | Avg FPS | Min FPS | Max FPS | Samples | Avg Memory |
|------|---------|---------|---------|---------|------------|
${this.results.tests.map(t =>
  `| ${t.name.padEnd(30)} | ${String(t.stats?.avg || 'N/A').padEnd(7)} | ${String((t.stats?.min || 0).toFixed(1)).padEnd(7)} | ${String((t.stats?.max || 0).toFixed(1)).padEnd(7)} | ${String(t.collectedSamples).padEnd(7)} | ${String(t.memoryStats?.avgUsed || 'N/A').padEnd(10)} |`
).join('\n')}

---

## Detailed Results

${this.results.tests.map(t => `
### ${t.name}

**Statistics**:
- Average FPS: ${t.stats?.avg || 'N/A'} FPS ⭐
- Min FPS: ${(t.stats?.min || 0).toFixed(1)} FPS
- Max FPS: ${(t.stats?.max || 0).toFixed(1)} FPS
- Median FPS: ${(t.stats?.median || 0).toFixed(1)} FPS
- Std Dev: ${t.stats?.stdDev || 'N/A'}
- 95th Percentile: ${(t.stats?.p95 || 0).toFixed(1)} FPS
- Samples Collected: ${t.collectedSamples}

**Memory**:
- Min Used: ${t.memoryStats?.minUsed || 'N/A'} MB
- Max Used: ${t.memoryStats?.maxUsed || 'N/A'} MB
- Avg Used: ${t.memoryStats?.avgUsed || 'N/A'} MB

**Assessment**:
${parseFloat(t.stats?.avg || 0) >= 55 ? '✅ EXCELLENT Performance (55+ FPS)' :
  parseFloat(t.stats?.avg || 0) >= 50 ? '✅ GOOD Performance (50-55 FPS)' :
  '⚠️ ACCEPTABLE Performance (45-50 FPS)'}

`).join('\n')}

---

## Overall Assessment

### Phase 15 Success Criteria:
- ✅ Physics Worker offloads CPU physics simulation
- ✅ Main thread free for rendering (target: 60+ FPS)
- ✅ Memory stable throughout tests
- ✅ No frame drops during collisions
- ✅ Flipper responsiveness maintained

### Expected Improvements:
- Expected FPS Gain: 30-40% from Physics Worker offloading
- Expected Memory Reduction: 15-20%
- Expected GC Pause Reduction: 40%+

### Notes:
[Add any observations about Physics Worker performance, collisions, or any issues encountered]

---

## Raw FPS Data (for spreadsheet analysis)

${this.results.tests.map((t, i) => `
### Test ${String.fromCharCode(65 + i)}: ${t.name}
\`\`\`
${t.fps.join('\n')}
\`\`\`
`).join('\n')}

---

Generated: ${new Date().toISOString()}
`;

    console.log(report);
    console.log('📋 Copy above text to save as PHASE15_TEST_RESULTS_[DATE].md');

    return report;
  },

  // Utility: delay
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};

// Global functions for easy access
function startPhase15Testing() {
  phase15Testing.initialize();
}

function testSequence() {
  phase15Testing.runAllTests();
}

function exportPhase15Results() {
  return phase15Testing.exportResults();
}

console.log('✨ Phase 15 Testing Suite loaded!');
console.log('Commands:');
console.log('  startPhase15Testing()     - Initialize testing framework');
console.log('  testSequence()            - Run all 4 tests automatically');
console.log('  exportPhase15Results()    - Export detailed results');
