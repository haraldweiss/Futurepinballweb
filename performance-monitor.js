/**
 * Phase 14 Performance Monitoring Helper
 *
 * Usage in browser console:
 * 1. Copy-paste this entire script
 * 2. Run: startMonitoring()
 * 3. Play for 60 seconds
 * 4. Run: stopMonitoring()
 * 5. Copy: exportResults()
 */

let perfMonitor = {
  isRunning: false,
  fps: [],
  memory: [],
  drawCalls: [],
  startTime: 0,
  measurementInterval: null,

  start() {
    if (this.isRunning) {
      console.warn('Monitor already running');
      return;
    }

    this.fps = [];
    this.memory = [];
    this.drawCalls = [];
    this.startTime = performance.now();
    this.isRunning = true;

    console.log('📊 Performance monitoring started...');
    console.log('⏱️  Will collect data every 100ms for 60 seconds');
    console.log('🎮 Play normally - hit stop when done');

    // Collect metrics every 100ms
    this.measurementInterval = setInterval(() => {
      this.collectMetrics();
    }, 100);

    // Auto-stop after 60 seconds (optional)
    setTimeout(() => {
      if (this.isRunning) {
        console.log('⏸️  Auto-stopped after 60 seconds');
        this.stop();
      }
    }, 60000);
  },

  stop() {
    if (!this.isRunning) {
      console.warn('Monitor not running');
      return;
    }

    this.isRunning = false;
    clearInterval(this.measurementInterval);

    console.log('✅ Performance monitoring stopped');
    console.log(`📈 Collected ${this.fps.length} FPS samples`);
    this.printSummary();
  },

  collectMetrics() {
    // Get FPS from performance monitor (if visible)
    const fpsDisplay = document.querySelector('[data-fps]');
    if (fpsDisplay) {
      const fpsText = fpsDisplay.textContent;
      const fpsMatch = fpsText.match(/(\d+\.?\d*)\s*fps/i);
      if (fpsMatch) {
        this.fps.push(parseFloat(fpsMatch[1]));
      }
    }

    // Get memory (if available)
    if (performance.memory) {
      this.memory.push({
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      });
    }
  },

  printSummary() {
    if (this.fps.length === 0) {
      console.warn('⚠️  No FPS data collected. Make sure performance monitor is visible (press P)');
      return;
    }

    const stats = this.calculateStats(this.fps);

    console.log(`
╔════════════════════════════════════════════════╗
║         PERFORMANCE METRICS SUMMARY            ║
╚════════════════════════════════════════════════╝

📊 FPS Statistics (${this.fps.length} samples):
   • Minimum:  ${stats.min.toFixed(1)} FPS
   • Average:  ${stats.avg.toFixed(1)} FPS
   • Maximum:  ${stats.max.toFixed(1)} FPS
   • Std Dev:  ${stats.stdDev.toFixed(1)}
   • 95th %ile: ${stats.p95.toFixed(1)} FPS

💾 Memory Statistics:
   • Peak Used:  ${Math.max(...this.memory.map(m => m.used))} MB
   • Avg Used:   ${Math.round(this.memory.reduce((a, m) => a + m.used, 0) / this.memory.length)} MB
   • Heap Limit: ${this.memory[0].limit} MB

🎯 Quality Assessment:
   ${stats.avg >= 50 ? '✅ EXCELLENT' : stats.avg >= 45 ? '⚠️  GOOD' : '❌ NEEDS REVIEW'} (Target: 50+ FPS)
    `);
  },

  calculateStats(data) {
    if (!data || data.length === 0) return null;

    const sorted = [...data].sort((a, b) => a - b);
    const sum = data.reduce((a, b) => a + b, 0);
    const avg = sum / data.length;

    // Standard deviation
    const variance = data.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    // Percentiles
    const p95idx = Math.floor(data.length * 0.95);
    const p95 = sorted[p95idx];

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: avg,
      stdDev: stdDev,
      p95: p95,
      median: sorted[Math.floor(sorted.length / 2)]
    };
  },

  export() {
    const stats = this.calculateStats(this.fps);
    const timestamp = new Date().toISOString();

    const report = `
# Phase 14 Performance Test Results
Date: ${timestamp}
Build: ${window.location.hostname}

## FPS Measurements
- Minimum: ${stats.min.toFixed(1)} FPS
- Average: ${stats.avg.toFixed(1)} FPS ⭐
- Maximum: ${stats.max.toFixed(1)} FPS
- StdDev: ${stats.stdDev.toFixed(2)}
- 95th Percentile: ${stats.p95.toFixed(1)} FPS

## Memory (if available)
${this.memory.length > 0 ? `- Peak: ${Math.max(...this.memory.map(m => m.used))} MB
- Average: ${Math.round(this.memory.reduce((a, m) => a + m.used, 0) / this.memory.length)} MB` : '- No memory data collected'}

## Raw Data (for spreadsheet)
${this.fps.join('\n')}

## Notes
[Add any observations, anomalies, or issues here]
    `;

    console.log(report);
    console.log('📋 Copy above text to save as PHASE14_TEST_RESULTS_[DATE].md');

    return report;
  }
};

// Global functions for easy access
function startMonitoring() { perfMonitor.start(); }
function stopMonitoring() { perfMonitor.stop(); }
function exportResults() { return perfMonitor.export(); }

console.log('✨ Performance monitor loaded!');
console.log('Commands: startMonitoring() | stopMonitoring() | exportResults()');
