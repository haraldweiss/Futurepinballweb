# Animation System Testing — Quick Start Guide

**Time to Complete**: 15-20 minutes
**Prerequisites**: Build succeeds, application runs in browser
**Goal**: Verify all 6 event hooks and debugger UI working

---

## 🚀 5-Minute Setup

### Step 1: Verify Build (1 min)
```bash
cd /Library/WebServer/Documents/Futurepinball\ Web
npm run build
```

**Expected**: ✓ built in 874ms, 51 modules, 0 errors

### Step 2: Start Dev Server (1 min)
```bash
npm run dev
```

**Expected**: Dev server running on http://localhost:5173

### Step 3: Open Application (1 min)
1. Navigate to http://localhost:5173 in browser
2. Wait for table to load
3. Press **P** to open performance monitor (verify 60 FPS)

### Step 4: Open DevTools (1 min)
1. Press **F12** to open browser DevTools
2. Click **Console** tab
3. Ready to run tests

### Step 5: Run System Check (1 min)
Paste this into browser console:

```javascript
console.log('=== ANIMATION SYSTEM VERIFICATION ===');
console.log('✓ BAMBridge:', getBamBridge() !== null);
console.log('✓ AnimationQueue:', getAnimationQueue() !== null);
console.log('✓ BindingManager:', getAnimationBindingManager() !== null);
console.log('✓ Scheduler:', getAnimationScheduler() !== null);
console.log('✓ Debugger:', getAnimationDebugger() !== null);
const q = getAnimationQueue();
console.log('✓ Queue methods: enqueue/dequeue/playNext =',
  typeof q.enqueue === 'function' &&
  typeof q.dequeue === 'function' &&
  typeof q.playNext === 'function');
console.log('✅ ALL SYSTEMS INITIALIZED');
```

**Expected Output**:
```
=== ANIMATION SYSTEM VERIFICATION ===
✓ BAMBridge: true
✓ AnimationQueue: true
✓ BindingManager: true
✓ Scheduler: true
✓ Debugger: true
✓ Queue methods: enqueue/dequeue/playNext = true
✅ ALL SYSTEMS INITIALIZED
```

---

## 📋 Manual Testing (10 min)

### Test 1: Bumper Hit Animation Hook (2 min)

1. **Play a few bumper hits** by pressing **Z** (left flipper) or **M** (right flipper)
2. **Direct ball to bumper** on playfield
3. **Check console** for bumper hit animation logs

**Expected**:
- Ball hits bumper
- Console shows: `"📌 Animation queued: [animation_id] (priority [n])"`
- Debugger shows animation in queue

**Verification Checkbox**:
- [ ] Bumper generates collisions
- [ ] Console shows no errors
- [ ] Animation system detects event

---

### Test 2: Animation Debugger UI (2 min)

1. **Press Ctrl+D** to toggle debugger panel
2. **Panel should appear** in top-right corner with:
   - Green border (#00ff88)
   - Status section
   - Animation list
   - ✕ close button

3. **Check status shows**:
   - `⚙️ Queue: 0 pending` (or higher if animations queued)
   - `▶️ Current: none` (or animation ID)
   - `🎯 Playing: NO` (or YES)
   - `📊 Bindings: X`

4. **Press Ctrl+D again** to toggle off

**Expected**:
- Panel visible when toggled ON
- Panel hidden when toggled OFF
- Status displays current system state
- Green styling applied

**Verification Checkbox**:
- [ ] Ctrl+D toggle works both ways
- [ ] Panel styling matches spec
- [ ] Status section visible
- [ ] No console errors

---

### Test 3: Play Button in Debugger (2 min)

1. **Press Ctrl+D** to open debugger
2. **Look for animation list** (if animations loaded)
3. **If animations present**:
   - Click **▶ PLAY** button next to any animation
   - Watch status update
   - Check console for: `"▶️ Playing animation: [id]"`

4. **Check queue status**:
   - `Queue: 1 pending` should increase
   - `Current: [animation_id]` should show

**Expected**:
- Play button clickable
- Animation queued
- Status updates in real-time
- Console shows playback message

**Verification Checkbox**:
- [ ] Play buttons functional
- [ ] Animation queues after click
- [ ] Status updates real-time
- [ ] No console errors

---

### Test 4: Ball Drain Animation Hook (2 min)

1. **Let ball drain** through the table
2. **Ball passes flippers** and falls out
3. **Check console** for drain animation logs
4. **Watch debugger** to see animation triggered

**Expected**:
- Ball drains
- No errors in console
- Animation system shows drain event
- Animation queue updates if binding exists

**Verification Checkbox**:
- [ ] Ball drains successfully
- [ ] No animation errors
- [ ] System detects drain event

---

### Test 5: Performance Check (2 min)

1. **Press P** to open performance monitor
2. **Monitor shows**:
   - FPS: 60
   - Memory usage
   - Draw calls

3. **Open debugger** (Ctrl+D)
4. **Monitor FPS** with debugger visible

**Expected**:
- FPS stays at 60
- No drops or stuttering
- Debugger <1% FPS impact
- Memory stable

**Verification Checkbox**:
- [ ] FPS 60 maintained
- [ ] No stuttering
- [ ] Debugger minimal overhead
- [ ] Memory stable

---

## 🎯 Advanced Testing (Optional)

### Test 6: Console API Testing

Run this in console to test all VBScript API methods:

```javascript
const bridge = getBamBridge();

// Test animation control
console.log('Testing animation control...');
// bridge.playAnimation('test_anim');  // Uncomment if animation loaded
console.log('✓ playAnimation method exists');
console.log('✓ stopAnimation method exists');
console.log('✓ isAnimationPlaying:', bridge.isAnimationPlaying());

// Test table control
console.log('\nTesting table control...');
bridge.setTableTilt(5, 0, 0);
console.log('✓ setTableTilt:', bridge.getTableTilt());

// Test flipper control
console.log('\nTesting flipper control...');
bridge.setFlipperPower('left', 0.8);
console.log('✓ setFlipperPower:', bridge.getFlipperPower('left'));

// Test light control
console.log('\nTesting light control...');
bridge.setLightIntensity(1.5);
console.log('✓ setLightIntensity:', bridge.getLightIntensity());

// Test config
console.log('\nTesting config persistence...');
bridge.saveConfig('test_key', 'test_value');
console.log('✓ loadConfig:', bridge.loadConfig('test_key'));

console.log('\n✅ ALL API METHODS FUNCTIONAL');
```

**Expected**: All methods work without errors

---

### Test 7: Binding System Testing

Run this to check animation bindings:

```javascript
const bindingMgr = getAnimationBindingManager();

// List all bumper bindings
const bumperBindings = bindingMgr.getBindingsFor('bumper', 'on_hit');
console.log('Bumper bindings:', bumperBindings.length);
bumperBindings.forEach(b => {
  console.log(`  - ${b.id}: priority=${b.priority}, seq=${b.sequenceId}`);
});

// List all target bindings
const targetBindings = bindingMgr.getBindingsFor('target', 'on_hit');
console.log('Target bindings:', targetBindings.length);

// List all drain bindings
const drainBindings = bindingMgr.getBindingsFor('drain', 'on_drain');
console.log('Drain bindings:', drainBindings.length);

console.log('\nTotal bindings:',
  bumperBindings.length + targetBindings.length + drainBindings.length);
```

**Expected**: Shows count of registered bindings per event type

---

### Test 8: Queue State Testing

Run this to monitor queue state:

```javascript
const queue = getAnimationQueue();

console.log('=== ANIMATION QUEUE STATE ===');
console.log('Queue size:', queue.size());
console.log('Current animation:', queue.getCurrent());
console.log('Is empty:', queue.isEmpty());
console.log('Is playing:', queue.playing());
console.log('Transition factor:', queue.getTransitionFactor());

// Pause animation
queue.pause();
console.log('After pause - playing:', queue.playing());

// Resume animation
queue.resume();
console.log('After resume - playing:', queue.playing());
```

**Expected**: All methods return valid values without errors

---

## ✅ Verification Checklist

After running all tests, verify:

- [ ] **Build**: Succeeds in <900ms
- [ ] **System Init**: All 5 components initialized
- [ ] **Debugger UI**: Ctrl+D toggles panel
- [ ] **Status Display**: Shows accurate queue/animation state
- [ ] **Play Buttons**: Click to queue animations
- [ ] **Event Hooks**: Bumper/drain events detected
- [ ] **Performance**: 60 FPS maintained
- [ ] **Memory**: <25KB overhead
- [ ] **Console**: No errors or warnings
- [ ] **API Methods**: All VBScript methods functional
- [ ] **Bindings**: Animation bindings registered
- [ ] **Queue**: Queue operations work correctly

---

## 🐛 Troubleshooting

### Issue: "getBamBridge is not defined"
**Solution**:
- Verify build succeeded
- Reload page (Ctrl+R)
- Check console for TypeScript errors

### Issue: "Debugger panel doesn't appear on Ctrl+D"
**Solution**:
- Check browser console for errors (F12)
- Try pressing Ctrl+D slowly (not too fast)
- Verify `getAnimationDebugger()` returns non-null

### Issue: "FPS drops below 60 with debugger visible"
**Solution**:
- Close debugger (Ctrl+D)
- Check if other tabs open (close them)
- Reload page to reset
- If issue persists, check Performance monitor

### Issue: "Animation doesn't play on event"
**Solution**:
- Check console for binding logs
- Verify animation is loaded (look in debugger list)
- Check binding has correct elementType and triggerEvent
- Manually click play button in debugger

### Issue: "Console errors about undefined functions"
**Solution**:
- Wait for page to fully load
- Check network tab in DevTools for failed resources
- Reload page and try again
- Check browser console (F12) for detailed error messages

---

## 📊 Performance Benchmarks (Expected Values)

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Build Time | <900ms | — | |
| Modules | 51 | — | |
| Queue Update | <0.1ms | — | |
| FPS with Debugger | 60 (±0) | — | |
| Memory (10 anims) | <25KB | — | |

---

## 📝 Test Results

**Test Date**: _______________
**Tester**: _______________
**Build Version**: 0.15.0

### Summary
- [ ] All manual tests passed
- [ ] All advanced tests passed
- [ ] No console errors
- [ ] Performance within spec
- [ ] Ready for Phase 14

### Notes
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

**Next Steps**: If all tests pass, proceed to Phase 14 planning or create demo tables with animations.

**Support**: See PHASE13_ANIMATION_INTEGRATION.md for detailed documentation.
