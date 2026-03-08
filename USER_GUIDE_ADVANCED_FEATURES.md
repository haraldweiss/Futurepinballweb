# User Guide: Advanced Features & Power User Tips

**Version**: 1.0
**Date**: 2026-03-08
**Audience**: Advanced users, power users, enthusiasts

---

## 🚀 Welcome, Power User!

This guide covers **advanced features** that make Future Pinball Web even more powerful:

- **Favorites & Bookmarks** — Save your favorite tables
- **Batch Loading** — Queue multiple tables at once
- **Drag & Drop** — Intuitive file loading
- **Performance Tuning** — Optimize for your system
- **Console Commands** — Advanced user APIs

---

## ⭐ Favorites System

### What Are Favorites?

Favorites are **bookmarks** for your most-played tables. Save them once, load them instantly next time!

### Adding a Favorite

**From the File Browser:**

1. Browse to your tables folder
2. Select a table (click on it)
3. Click **"⭐ Add to Favorites"** button
4. Table is saved ✓

**From the Console (Advanced):**

```javascript
window.addToFavorites("Dragon's Castle.fpt", 'table');
// ⭐ Added to favorites: Dragon's Castle.fpt
```

### Using Favorites

**Next session, open File Browser:**

```
⭐ FAVORITEN
├─ Dragon's Castle.fpt ✕
├─ Pharaoh's Gold.fpt ✕
└─ Neon City.fpt ✕
```

Click any favorite to **load instantly** (no browsing needed!)

### Managing Favorites

**Remove a favorite:**
1. Hover over favorite name
2. Click **✕** (X button)
3. Removed from favorites

**See count of favorites:**
```javascript
const count = window.getAdvancedFavoritesCount();
console.log(`You have ${count} favorites saved`);
```

### Why Favorites Matter

| Use Case | Time Saved |
|----------|-----------|
| Load usual table | 5-10 seconds |
| Load from favorite | <1 second |
| Per session | ~30 seconds |
| Per week | ~5 minutes |
| Per year | **~4+ hours** |

---

## 📋 Batch Loading (Multiple Tables)

### What Is Batch Loading?

**Queue multiple tables to load sequentially.** Perfect for:
- Testing multiple tables in one session
- Loading tables for comparison
- Stress-testing your system
- Automated table testing

### Creating a Batch Job

**Method 1: From Console (Advanced)**

```javascript
// Create batch with multiple tables
const jobId = window.createBatchLoadJob([
  "Dragon's Castle.fpt",
  "Pharaoh's Gold.fpt",
  "Neon City.fpt"
]);
// 📋 Created batch job: batch-1709964800000-abc123
```

### Monitoring Progress

**Watch the batch job load:**

```javascript
const interval = setInterval(() => {
  const job = window.getBatchJobStatus(jobId);

  console.log(`Progress: ${job.progress}%`);
  console.log(`Status: ${job.status}`);
  console.log(`Current: ${job.currentFile?.name}`);

  if (job.status === 'completed') {
    clearInterval(interval);
    console.log('✅ All tables loaded!');
  }
}, 500);
```

### Viewing Results

After batch completes:

```javascript
const job = window.getBatchJobStatus(jobId);

// See all results
for (const result of job.results) {
  if (result.success) {
    console.log(`✓ ${result.file.name} (${result.duration}ms)`);
  } else {
    console.log(`✗ ${result.file.name}: ${result.error}`);
  }
}
```

### Batch Loading Use Cases

**Scenario 1: Quick Testing**
```
Load table 1 (test) → Reset → Load table 2 (test) → Reset...
Faster than manual browsing each time!
```

**Scenario 2: Stress Testing**
```
Load 10 large tables in sequence
See if system degrades or handles it fine
```

**Scenario 3: Content Review**
```
Load all Medieval tables one by one
Compare graphics, music, gameplay
```

---

## 🎯 Drag & Drop Files

### Enabling Drag & Drop

**From Console (Advanced):**

```javascript
window.setupTableDragDrop();
// ✓ Drag & drop enabled for game canvas
```

### Using Drag & Drop

**Step 1:** Open file explorer (Windows Explorer, Finder, etc.)

**Step 2:** Find your `.fpt` table file

**Step 3:** **Drag** it from file explorer onto the game window

**Step 4:** **Drop** it (release mouse)

**Result:** Table loads automatically! 🎉

```
File Explorer              Game Window
│                          │
├─ table.fpt ─drag───→ [GAME CANVAS]
│                          │
└─ drop!  ──────────→ ✓ Loading...
```

### Supported File Types

| Extension | What Happens |
|-----------|---|
| `.fpt` | Table loads immediately ✓ |
| `.fpl` / `.lib` | Library added to selection |
| Other files | Ignored (no action) |

---

## 📊 Sorting & Filtering

### Sort Tables by Different Criteria

**From Console (Advanced):**

```javascript
// Sort by name (A-Z)
const sorted = window.sortTableFiles('name');

// Sort by size (largest first)
const sorted = window.sortTableFiles('size');

// Sort by date (newest first)
const sorted = window.sortTableFiles('date');

// Sort by type (by extension)
const sorted = window.sortTableFiles('type');
```

### Search/Filter in Browser

**When you browse a directory:**

```
[🔍 Tisch durchsuchen...]  ← Type to search
↓
Updated list shows only matches
```

**Examples:**
- Type "dragon" → Shows "Dragon's Castle.fpt"
- Type "space" → Shows "Space Quest.fpt"
- Type ".fpt" → Shows all FPT files

---

## 🔍 Performance Tuning

### Generate a Performance Report

**See detailed performance analysis:**

```javascript
// Generate comprehensive report
const report = await window.generatePerformanceReport();
console.log(report);
```

### Report Contents

```javascript
report.deviceProfile      // Device type (mobile/tablet/desktop)
report.benchmarks         // Load time, memory, GC improvements
report.phases             // Each phase's metrics
report.recommendations    // Actionable suggestions
report.summary            // Overall score (0-100, A+/A/B/C/F)
```

### Understanding Performance Metrics

**Load Time Improvement:**
- 40-60% = Good (parallel loading working)
- 60-75% = Excellent (all phases optimized)
- 75%+ = Outstanding (excellent optimization)

**Memory Reduction:**
- 25-40% = Good (some savings)
- 50-65% = Excellent (streaming + caching working)
- 65%+ = Outstanding (all systems optimized)

**GC Pressure Reduction:**
- 50-75% = Good (pooling working)
- 75-90% = Excellent (high reuse rate)
- 90%+ = Outstanding (minimal allocation)

### Get Recommendations

```javascript
const report = await window.generatePerformanceReport();

// See recommendations
for (const rec of report.recommendations) {
  console.log(`${rec.priority}: ${rec.description}`);
  console.log(`  Action: ${rec.actionItem}`);
}
```

### Compare Performance Over Time

```javascript
// Generate report 1
const report1 = await window.generatePerformanceReport();

// Wait 1 hour, load tables, etc...

// Generate report 2
const report2 = await window.generatePerformanceReport();

// Compare
const comparison = window.comparePerformanceReports(report1, report2);
console.log(`Score changed: ${comparison.scoreChange}`);
console.log(`Load time improved: ${comparison.loadTimeImprovement}ms`);
console.log(`Memory usage changed: ${comparison.memoryImprovement}MB`);
```

---

## 💻 Console API Reference

### File Browser APIs

```javascript
// Browse directories
window.browseTableDirectory();          // Select FPT folder
window.browseLibraryDirectory();        // Select FPL/LIB folder

// Load tables
window.loadSelectedTable();             // Load selected table + libraries
```

### Favorites APIs

```javascript
// Manage favorites
window.addToFavorites(filename, type);  // Add bookmark
window.getAdvancedFavoritesCount();     // Count of favorites

// Get favorites (via manager)
const mgr = getAdvancedFileBrowserManager();
const favorites = mgr.getFavorites();
```

### Batch Loading APIs

```javascript
// Create and monitor batch jobs
const jobId = window.createBatchLoadJob(tableNames);
const job = window.getBatchJobStatus(jobId);

// Job object contains:
job.progress              // 0-100%
job.status               // pending|loading|completed|failed
job.currentFile          // Currently loading file
job.results              // Array of load results
```

### Drag & Drop APIs

```javascript
// Enable drag & drop on game canvas
window.setupTableDragDrop();

// Automatically detects and loads:
// - .fpt files as tables
// - .fpl/.lib files as libraries
```

### Sorting APIs

```javascript
// Sort files by different criteria
window.sortTableFiles('name');          // Alphabetical
window.sortTableFiles('size');          // Largest first
window.sortTableFiles('date');          // Newest first
window.sortTableFiles('type');          // By extension
```

### Recent Files APIs

```javascript
// Get recently loaded files
const recent = window.getRecentTables();

// Returns array of most recently loaded tables
// Automatically tracked when you load tables
```

### Performance APIs

```javascript
// Generate performance report
const report = await window.generatePerformanceReport();

// Compare two reports
const comparison = window.comparePerformanceReports(report1, report2);

// Get performance generator
const gen = window.getPerformanceReportGenerator();
```

---

## 🎯 Pro Tips for Power Users

### Tip 1: Organize Your Tables Directory

Create subfolders by theme:

```
📁 Tables
  ├─ 📁 Egyptian
  │  ├─ Pharaoh.fpt
  │  └─ Pyramid.fpt
  ├─ 📁 Medieval
  │  ├─ Dragon.fpt
  │  └─ Castle.fpt
  └─ 📁 Sci-Fi
     ├─ Space.fpt
     └─ Cyber.fpt
```

Then browse the subfolder for instant themed lists!

### Tip 2: Use Keyboard Shortcuts

**In browser console (F12):**
- ↑ ↓ = Navigate recent commands
- Ctrl+L = Clear console
- Ctrl+Shift+J = Open console directly

### Tip 3: Create Script for Batch Testing

```javascript
// Save in browser bookmarks bar, name "Test Tables"
javascript:(async()=>{
  const tables = ["Dragon.fpt", "Space.fpt", "Castle.fpt"];
  const jobId = window.createBatchLoadJob(tables);
  console.log(`Testing ${tables.length} tables...`);
})();
```

Click bookmark anytime to test multiple tables!

### Tip 4: Monitor System Performance

```javascript
// Check system every 5 seconds
setInterval(async () => {
  const report = await window.generatePerformanceReport();
  console.log(`FPS: ${report.deviceProfile.gpu}, Memory: ${report.benchmarks.estimatedMemoryBefore}MB`);
}, 5000);
```

### Tip 5: Export Performance Data

```javascript
const report = await window.generatePerformanceReport();
const json = JSON.stringify(report, null, 2);

// Save to file (copy/paste into text editor)
console.log(json);

// Or analyze in spreadsheet
console.table(report.phases);
```

---

## 🐛 Advanced Troubleshooting

### Check Which Phases Are Working

```javascript
const report = await window.generatePerformanceReport();

// Phase 1: Parallel loading
const p1 = report.phases.phase1?.expectedSpeedup;
console.log(`Phase 1 speedup: ${p1}% (should be 40-60%)`);

// Phase 4: Resource manager
const p4 = report.phases.phase4?.currentMemory;
console.log(`Phase 4 memory: ${p4}MB (should be <150MB)`);

// Phase 5: Library cache
const p5 = report.phases.phase5?.hitRate;
console.log(`Phase 5 hit rate: ${p5} (should be >80%)`);

// Phase 6: Audio pooling
const p6 = report.phases.phase6?.reuseRate;
console.log(`Phase 6 reuse: ${p6} (should be >95%)`);
```

### Debug Batch Loading Issues

```javascript
const jobId = window.createBatchLoadJob(['test.fpt']);
const job = window.getBatchJobStatus(jobId);

// Check what happened
for (const result of job.results) {
  if (!result.success) {
    console.error(`Failed: ${result.file.name}`);
    console.error(`Reason: ${result.error}`);
    console.error(`Duration: ${result.duration}ms`);
  }
}
```

### Check Browser Capabilities

```javascript
// Run full compatibility test
const report = await window.runFullTestSuite();

// See what features work
console.log(`Pass rate: ${report.summary.passRate}%`);
console.log(`Failed tests: ${report.summary.failed}`);

// Details for each category
for (const result of report.results) {
  if (result.status === 'failed') {
    console.warn(`${result.name}: ${result.message}`);
  }
}
```

---

## 📈 Performance Optimization Checklist

- [ ] Generate initial performance report (baseline)
- [ ] Close other browser tabs (free up memory)
- [ ] Close background applications (free up CPU)
- [ ] Clear browser cache (Ctrl+Shift+Delete)
- [ ] Test with small table first (ensure system works)
- [ ] Test with large table (see memory usage)
- [ ] Monitor for 30 minutes (check for memory leaks)
- [ ] Generate final report (compare to baseline)
- [ ] Review recommendations (implement if helpful)

**Expected Results:**
- ✓ Load time improvement: 40-60%
- ✓ Memory reduction: 50-80%
- ✓ GC pressure reduction: 75%+
- ✓ Cache hit rate: 80%+
- ✓ Audio pool reuse: 95%+

---

## 🎓 Learning Resources

### Built-in Documentation

```javascript
// View all available commands
console.log('Available APIs:', {
  fileBrowser: window.browseTableDirectory,
  favorites: window.addToFavorites,
  batch: window.createBatchLoadJob,
  performance: window.generatePerformanceReport,
  testing: window.runFullTestSuite
});
```

### Online Guides

- `USER_GUIDE_FILE_BROWSER.md` — Basic file browser guide
- `OPTION_A_ADVANCED_TABLE_MANAGEMENT.md` — Technical advanced features
- `PERFORMANCE_REPORT_GUIDE.md` — Performance analysis details
- `OPTION_B_TESTING_VALIDATION.md` — Testing system reference

### Getting Help

**In Console:**
```javascript
help()  // General help (if available)
// Or check browser console for error messages (F12)
```

---

## ✨ Advanced User Workflow

Here's a complete workflow for a power user session:

```javascript
// 1. Check baseline performance
const baselineReport = await window.generatePerformanceReport();
console.log(`Baseline: ${baselineReport.summary.overallScore}/100`);

// 2. Enable drag & drop for quick loading
window.setupTableDragDrop();

// 3. Load your favorite table
window.addToFavorites("Dragon's Castle.fpt", 'table');

// 4. Check recent files
const recent = window.getRecentTables();
console.log(`Recent: ${recent.map(f => f.name).join(', ')}`);

// 5. Create batch job for testing
const jobId = window.createBatchLoadJob(['Space.fpt', 'Castle.fpt']);

// 6. Monitor progress
const job = window.getBatchJobStatus(jobId);
console.log(`Batch progress: ${job.progress}%`);

// 7. Compare performance after loading
const newReport = await window.generatePerformanceReport();
const comparison = window.comparePerformanceReports(baselineReport, newReport);
console.log(`Performance change: ${comparison.scoreChange > 0 ? '+' : ''}${comparison.scoreChange}`);

// 8. Run full test suite to verify all phases
const testResults = await window.runFullTestSuite();
console.log(`Tests passing: ${testResults.summary.passRate}%`);
```

---

## 🎉 You're a Power User Now!

You now know:

✓ How to save favorite tables
✓ How to batch load multiple tables
✓ How to use drag & drop
✓ How to sort and filter files
✓ How to monitor performance
✓ How to use advanced console APIs
✓ How to troubleshoot advanced issues
✓ How to optimize your system

**Ready to explore?** 🚀

---

**Version**: 1.0 | **Last Updated**: 2026-03-08 | **Audience**: Advanced Users
