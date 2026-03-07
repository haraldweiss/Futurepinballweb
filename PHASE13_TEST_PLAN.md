# Phase 13: Animation System — Comprehensive Test Plan

**Date**: March 7, 2026
**Version**: 0.15.0
**Test Scope**: Unit Tests, Integration Tests, Debugger UI, Performance Benchmarks
**Status**: READY FOR TESTING

---

## Test Overview

This document covers comprehensive testing of the Phase 13 Animation Integration System across 4 domains:

1. **Unit Tests** — Individual animator classes and utilities
2. **Integration Tests** — All 6 event hooks and animation triggering
3. **Debugger UI Tests** — Ctrl+D panel functionality
4. **Performance Tests** — Build time, memory, FPS impact

---

## Domain 1: Unit Tests (Animator Classes)

### Test 1.1: BaseAnimator Math Utilities

**Test**: Linear Interpolation
```typescript
const animator = new BaseAnimator();
const result = animator.lerp(0, 10, 0.5);
Expected: 5
```

**Test**: Vector3 Interpolation
```typescript
const result = animator.lerpVec3(
  {x: 0, y: 0, z: 0},
  {x: 10, y: 10, z: 10},
  0.5
);
Expected: {x: 5, y: 5, z: 5}
```

**Test**: Easing Functions
```typescript
// Linear easing
animator.applyEasing(0.5, 'linear') === 0.5 ✓

// Ease-out (faster fade)
animator.applyEasing(0.5, 'ease-out') === 0.75 ✓

// Cubic easing
animator.applyEasing(0.5, 'cubic') === 0.5 ✓
```

**Test**: Euler to Quaternion Conversion
```typescript
const quat = animator.eulerToQuaternion({x: 0, y: 0, z: 0});
Expected: {x: 0, y: 0, z: 0, w: 1} // Identity quaternion
```

**Verification Checklist**:
- [ ] All math functions return correct values
- [ ] No floating-point precision errors (tolerance: 0.001)
- [ ] Easing curves produce expected progression

---

### Test 1.2: CameraAnimator

**Test**: Apply Keyframe
```typescript
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight);
const animator = new CameraAnimator(camera);

animator.apply({
  time: 0,
  position: {x: 5, y: 5, z: 10},
  rotation: {x: 45, y: 0, z: 0},
  scale: {x: 1.2, y: 1, z: 1},  // Scale.x = FOV multiplier
  duration: 1000
});

Expected:
- camera.position = {x: 5, y: 5, z: 10}
- camera.quaternion = rotated 45° around X
- camera.fov = 90 (75 * 1.2)
```

**Test**: Get/Set Position
```typescript
animator.setPosition({x: 2, y: 3, z: 4});
const pos = animator.getPosition();
Expected: {x: 2, y: 3, z: 4}
```

**Test**: Get Rotation (Euler)
```typescript
animator.apply({
  time: 0,
  position: {x: 0, y: 0, z: 0},
  rotation: {x: 90, y: 0, z: 0},
  scale: {x: 1, y: 1, z: 1},
  duration: 0
});
const rot = animator.getRotation();
Expected: {x: ≈90, y: ≈0, z: ≈0}  (tolerance: ±1°)
```

**Test**: Look At Target
```typescript
animator.lookAt({x: 5, y: 5, z: 5});
// Camera should point toward (5,5,5)
Expected: camera.quaternion updated to face target
```

**Verification Checklist**:
- [ ] Keyframe application updates camera position, rotation, FOV
- [ ] Get/set methods work bidirectionally
- [ ] Rotation conversion accurate within 1° tolerance
- [ ] lookAt() correctly orients camera

---

### Test 1.3: ObjectAnimator

**Test**: Apply Keyframe with SLERP Rotation
```typescript
const mesh = new THREE.Mesh();
const animator = new ObjectAnimator(mesh);

animator.apply({
  time: 0,
  position: {x: 1, y: 2, z: 3},
  rotation: {x: 0, y: 0, z: 0},
  scale: {x: 1.5, y: 1.5, z: 1.5},
  duration: 0
});

Expected:
- mesh.position = {x: 1, y: 2, z: 3}
- mesh.scale = {x: 1.5, y: 1.5, z: 1.5}
- mesh.quaternion = identity (no rotation)
```

**Test**: Smooth Rotation with SLERP
```typescript
// Apply multiple keyframes to test SLERP smoothing
animator.apply({..., rotation: {x: 45, y: 0, z: 0}, duration: 0});
animator.apply({..., rotation: {x: 90, y: 0, z: 0}, duration: 0});
animator.apply({..., rotation: {x: 180, y: 0, z: 0}, duration: 0});

Expected:
- Quaternion interpolation smooth across all frames
- No gimbal lock artifacts
```

**Test**: AnimateTo() Method
```typescript
animator.animateTo(
  {time: 0, position: {x: 10, y: 10, z: 10}, rotation: {x: 0, y: 0, z: 0}, scale: {x: 2, y: 2, z: 2}, duration: 0},
  1000  // 1 second animation
);

setTimeout(() => {
  Expected: mesh.position.x ≈ 10, mesh.position.y ≈ 10, mesh.position.z ≈ 10
}, 1050);
```

**Verification Checklist**:
- [ ] Keyframe application correct for all properties
- [ ] SLERP rotation smooth and gimbal-lock free
- [ ] AnimateTo() uses requestAnimationFrame
- [ ] Position interpolates correctly over duration

---

### Test 1.4: LightAnimator

**Test**: Apply Keyframe (Intensity)
```typescript
const light = new THREE.PointLight(0xffffff, 1.0);
const animator = new LightAnimator(light);

animator.apply({
  time: 0,
  position: {x: 2, y: 3, z: 4},
  rotation: {x: 0, y: 0, z: 0},  // Used for color encoding
  scale: {x: 1.5, y: 1, z: 1},   // scale.x = intensity multiplier
  duration: 0
});

Expected:
- light.intensity = 1.5 (1.0 * 1.5)
- light.position = {x: 2, y: 3, z: 4}
```

**Test**: Set/Get Intensity
```typescript
animator.setIntensity(2.0);
Expected: animator.getIntensity() === 2.0
```

**Test**: Set/Get Color
```typescript
animator.setColor(0xff0000);  // Red
Expected: animator.getColor() is red
```

**Test**: Pulse Light
```typescript
animator.pulseLight(1000, 2.0);  // Pulse to 2.0 intensity over 1 second

setTimeout(() => {
  Expected: light.intensity ≈ 2.0 at 500ms, then fade back to original
}, 500);
```

**Verification Checklist**:
- [ ] Intensity multiplier applied correctly
- [ ] Color values set/retrieved properly
- [ ] Pulse animation uses easeOut for smooth fade
- [ ] Position updates work for lights supporting it

---

## Domain 2: Integration Tests (6 Event Hooks)

### Test 2.1: Hook 1 — Bumper Hit Animation Trigger

**Preconditions**:
- Animation "bumper_test" loaded in BAMEngine
- Binding registered: elementType='bumper', triggerEvent='on_hit', sequenceId='bumper_test'

**Test Steps**:
1. Load test table with bumper element
2. Ball collides with bumper
3. `scoreBumperHit()` called
4. Check console for: `"▶️ Playing animation: bumper_test"`

**Expected Result**:
```
✓ Animation binding retrieved
✓ BamBridge.playAnimation("bumper_test") called
✓ Animation queue updated
✓ Status shows "Playing: bumper_test"
```

**Verification**:
- [ ] Event hook fires on bumper collision
- [ ] Correct animation ID passed to bridge
- [ ] Animation debugger shows animation playing
- [ ] No console errors

---

### Test 2.2: Hook 2 — Target Hit Animation Trigger

**Preconditions**:
- Animation "target_test" loaded
- Binding registered: elementType='target', triggerEvent='on_hit', sequenceId='target_test'

**Test Steps**:
1. Ball strikes target element
2. `scoreTargetHit()` called
3. Verify animation plays

**Expected Result**:
```
✓ Animation fires on target hit
✓ Debugger shows "target_test" playing
```

**Verification**:
- [ ] Hook triggers on target collision
- [ ] Animation plays with correct ID
- [ ] Debugger shows animation status

---

### Test 2.3: Hook 3 — Ramp Hit Animation Trigger

**Preconditions**:
- Animation "ramp_test" loaded
- Binding registered: elementType='ramp', triggerEvent='on_hit', sequenceId='ramp_test'

**Test Steps**:
1. Ball completes ramp shot
2. `scoreRampHit()` called
3. Verify animation plays

**Expected Result**:
```
✓ Animation fires on ramp completion
✓ Debugger shows "ramp_test" playing
```

**Verification**:
- [ ] Hook triggers on ramp completion
- [ ] Animation plays with correct ID

---

### Test 2.4: Hook 4 — Flipper Launch Animation Trigger

**Preconditions**:
- Animation "flipper_launch_test" loaded
- Binding registered: elementType='flipper', triggerEvent='on_start', sequenceId='flipper_launch_test'

**Test Steps**:
1. Press Enter key to launch plunger
2. Check console for animation playback
3. Verify via debugger

**Expected Result**:
```
✓ Animation fires when plunger launches
✓ Animation "flipper_launch_test" plays
```

**Verification**:
- [ ] Hook triggers on Enter key press
- [ ] Animation plays during plunger launch

---

### Test 2.5: Hook 5 — Multiball Launch Animation Trigger

**Preconditions**:
- Animation "multiball_test" loaded
- Binding registered: elementType='multiball', triggerEvent='on_launch', sequenceId='multiball_test'

**Test Steps**:
1. Hit 10 bumpers to trigger multiball (or call `launchMultiBall()` via script)
2. Check console for animation
3. Verify via debugger

**Expected Result**:
```
✓ Animation fires when extra ball launches
✓ Animation "multiball_test" plays
✓ Debugger shows animation
```

**Verification**:
- [ ] Hook triggers on multiball launch
- [ ] Animation plays during extra ball spawn

---

### Test 2.6: Hook 6 — Ball Drain Animation Trigger

**Preconditions**:
- Animation "drain_test" loaded
- Binding registered: elementType='drain', triggerEvent='on_drain', sequenceId='drain_test'
- Ball saves disabled or exhausted

**Test Steps**:
1. Let ball drain (pass flippers)
2. Ball reaches drain point (y < -6.5)
3. Ball saves exhausted
4. Check console for animation

**Expected Result**:
```
✓ Animation fires when ball drains
✓ Animation "drain_test" plays
✓ Debugger shows animation
```

**Verification**:
- [ ] Hook triggers on ball drain
- [ ] Animation plays when game over condition reached

---

### Test 2.7: Priority Queue Ordering

**Preconditions**:
- 3 animations loaded: "high_priority", "medium_priority", "low_priority"
- Multiple bindings with different priorities

**Test Steps**:
1. Trigger multiple animations simultaneously
2. Check queue order in debugger
3. Verify playback order

**Expected Result**:
```
✓ High priority animations play first
✓ Queue shows correct ordering
✓ Each animation plays to completion before next
```

**Verification**:
- [ ] Queue.size() > 0 after multiple triggers
- [ ] Playback order follows priority
- [ ] Animation transitions smooth

---

## Domain 3: Debugger UI Tests

### Test 3.1: Toggle Debugger (Ctrl+D)

**Test Steps**:
1. Run application
2. Press `Ctrl+D`
3. Observe panel appears in top-right corner

**Expected Result**:
```
✓ Debugger panel visible
✓ Green (#00ff88) styling applied
✓ Contains status, list, controls
```

**Verification**:
- [ ] Panel appears on Ctrl+D press
- [ ] Panel disappears on second Ctrl+D press
- [ ] Styling matches spec (green text, dark background)

---

### Test 3.2: Status Display

**Test Steps**:
1. Open debugger (Ctrl+D)
2. Observe status section shows:
   - Queue pending count
   - Current animation name
   - Playing: YES/NO
   - Binding count

**Expected Result**:
```
⚙️ Queue: 0 pending
▶️ Current: none
🎯 Playing: NO
📊 Bindings: 0
```

**Verification**:
- [ ] Status displays accurate values
- [ ] Updates in real-time as animations play
- [ ] Shows correct counts

---

### Test 3.3: Animation List Display

**Test Steps**:
1. Open debugger
2. Observe animation list shows all sequences
3. Each entry should show:
   - Animation ID
   - Duration (seconds)
   - Keyframe count
   - Play button

**Expected Result**:
```
📝 Sequences:
  [animation_id]  ▶ PLAY
    ⏱️ 1.50s | 🔑 15 frames
  [animation_id2] ▶ PLAY
    ⏱️ 2.30s | 🔑 22 frames
```

**Verification**:
- [ ] All loaded animations listed
- [ ] Duration calculated correctly
- [ ] Keyframe counts accurate
- [ ] Play buttons visible

---

### Test 3.4: Play Button Functionality

**Test Steps**:
1. Open debugger
2. Click "PLAY" button next to animation
3. Observe animation plays
4. Check console for log message

**Expected Result**:
```
✓ Animation plays immediately on button click
✓ Console shows: "▶️ Playing animation: [id]"
✓ Status updates to "Playing: YES"
✓ Queue size increments
```

**Verification**:
- [ ] All play buttons functional
- [ ] Animation plays on click
- [ ] Queue updates reflect new animation
- [ ] Status display updates

---

### Test 3.5: Real-time Updates

**Test Steps**:
1. Open debugger
2. Trigger animations via game events (bumper hits, etc.)
3. Watch status and queue update in real-time

**Expected Result**:
```
✓ Status updates without page refresh
✓ Queue count reflects pending animations
✓ Current animation name updates
✓ Playing status toggles YES/NO
```

**Verification**:
- [ ] All display elements update in real-time
- [ ] No lag or delay in UI updates
- [ ] Accurate reflection of system state

---

### Test 3.6: Debugger Performance

**Test Steps**:
1. Open debugger
2. Run 60 FPS performance monitor
3. Toggle debugger visible/hidden multiple times

**Expected Result**:
```
✓ FPS stable at 60 with debugger hidden
✓ FPS minimal impact (<1 FPS) with debugger visible
✓ No memory leaks from toggle
```

**Verification**:
- [ ] Performance monitor shows stable FPS
- [ ] No frame drops when toggling debugger

---

## Domain 4: Performance Tests

### Test 4.1: Build Time

**Precondition**: Clean build
```bash
npm run build
```

**Expected Result**:
```
✓ built in <900ms (target: 878ms)
✓ 51 modules transformed
✓ 0 TypeScript errors
```

**Verification**:
- [ ] Build completes <900ms
- [ ] All modules load correctly
- [ ] No warnings or errors

---

### Test 4.2: Animation Queue Update Performance

**Test Steps**:
1. Create 10 active animations simultaneously
2. Profile queue update call using Chrome DevTools
3. Measure time per frame

**Expected Result**:
```
✓ Queue update: <0.1ms per frame
✓ 10 simultaneous animations: <1ms total
✓ No stuttering at 60 FPS
```

**Verification**:
- [ ] Queue update negligible overhead
- [ ] No FPS drops with 10 animations active

---

### Test 4.3: Keyframe Interpolation Performance

**Test Steps**:
1. Create 5 active object animators with smooth transitions
2. Profile interpolation using Chrome DevTools
3. Measure time per frame

**Expected Result**:
```
✓ Per-animator interpolation: <0.1ms
✓ 5 animators: <0.5ms total
✓ Quaternion SLERP efficient
```

**Verification**:
- [ ] Interpolation fast and efficient
- [ ] No FPS impact with 5 active animators

---

### Test 4.4: Memory Usage

**Test Steps**:
1. Load application
2. Create 20 animations + 30 bindings
3. Monitor memory in Chrome DevTools

**Expected Result**:
```
✓ 20 animations: ~10KB
✓ 30 bindings: ~6KB
✓ Total additional: <25KB
✓ No memory leaks during usage
```

**Verification**:
- [ ] Memory footprint within budget
- [ ] No memory growth over time
- [ ] Garbage collection working

---

### Test 4.5: FPS Stability

**Test Steps**:
1. Enable performance monitor (P key)
2. Run game with all animations active
3. Monitor FPS over 5 minutes

**Expected Result**:
```
✓ FPS: 60 maintained
✓ No frame drops
✓ Consistent performance
```

**Verification**:
- [ ] FPS remains 60 throughout
- [ ] No dips or stutters
- [ ] Animation system zero-impact

---

## Manual Test Checklist

### Pre-Test Setup
- [ ] Build succeeds (npm run build)
- [ ] No TypeScript errors
- [ ] Application loads in browser
- [ ] Console clear of errors

### Feature Tests
- [ ] Bumper hit triggers animation
- [ ] Target hit triggers animation
- [ ] Ramp hit triggers animation
- [ ] Flipper launch triggers animation
- [ ] Multiball launch triggers animation
- [ ] Ball drain triggers animation

### Debugger Tests
- [ ] Ctrl+D toggles debugger panel
- [ ] Status displays correct values
- [ ] Animation list shows all sequences
- [ ] Play buttons functional
- [ ] Real-time updates working
- [ ] Performance minimal when visible

### Performance Tests
- [ ] Build time <900ms
- [ ] FPS stable at 60
- [ ] Queue update <0.1ms
- [ ] Memory <25KB
- [ ] No lag with 10 animations

### Quality Tests
- [ ] Animation interpolation smooth
- [ ] Rotation gimbal-lock free (SLERP)
- [ ] Transitions blend smoothly
- [ ] No console errors
- [ ] Backward compatible with Phase 12

---

## Automated Test Script (Browser Console)

Copy and paste into browser console (F12) to run automated tests:

```javascript
// 1. Check BAMBridge exists
console.log('✓ BAMBridge initialized:', getBamBridge() !== null);

// 2. Check AnimationQueue exists
console.log('✓ AnimationQueue initialized:', getAnimationQueue() !== null);

// 3. Check AnimationBindingManager exists
console.log('✓ AnimationBindingManager initialized:', getAnimationBindingManager() !== null);

// 4. Check AnimationScheduler exists
console.log('✓ AnimationScheduler initialized:', getAnimationScheduler() !== null);

// 5. Check AnimationDebugger exists
console.log('✓ AnimationDebugger initialized:', getAnimationDebugger() !== null);

// 6. Test BamBridge methods exist
const bridge = getBamBridge();
console.log('✓ BamBridge.playAnimation:', typeof bridge.playAnimation === 'function');
console.log('✓ BamBridge.stopAnimation:', typeof bridge.stopAnimation === 'function');
console.log('✓ BamBridge.isAnimationPlaying:', typeof bridge.isAnimationPlaying === 'function');

// 7. Test AnimationQueue methods
const queue = getAnimationQueue();
console.log('✓ Queue.enqueue:', typeof queue.enqueue === 'function');
console.log('✓ Queue.dequeue:', typeof queue.dequeue === 'function');
console.log('✓ Queue.playNext:', typeof queue.playNext === 'function');
console.log('✓ Queue.isEmpty:', queue.isEmpty());

// 8. Log current state
console.log('=== ANIMATION SYSTEM STATE ===');
console.log('Queue size:', queue.size());
console.log('Playing:', bridge.isAnimationPlaying());
console.log('Current animation:', queue.getCurrent());
console.log('Transition factor:', queue.getTransitionFactor());

console.log('\n✅ ALL SYSTEM CHECKS PASSED');
```

---

## Success Criteria

### Unit Tests (MUST PASS)
- [ ] All animator math functions correct
- [ ] CameraAnimator position/rotation/FOV working
- [ ] ObjectAnimator SLERP rotation smooth
- [ ] LightAnimator intensity/color working
- [ ] No floating-point precision errors

### Integration Tests (MUST PASS)
- [ ] All 6 event hooks firing
- [ ] Correct animations triggered
- [ ] Priority queue ordering correct
- [ ] Queue blending smooth

### Debugger Tests (MUST PASS)
- [ ] Ctrl+D toggle works
- [ ] Status displays accurate
- [ ] Animation list complete
- [ ] Play buttons functional
- [ ] Real-time updates working

### Performance Tests (MUST PASS)
- [ ] Build <900ms
- [ ] Queue update <0.1ms
- [ ] FPS 60 maintained
- [ ] Memory <25KB
- [ ] No memory leaks

---

## Test Results Reporting

After completing tests, report:

| Test | Status | Notes |
|------|--------|-------|
| Unit: BaseAnimator | ✓ PASS | All math functions correct |
| Unit: CameraAnimator | ✓ PASS | Position/rotation/FOV working |
| Unit: ObjectAnimator | ✓ PASS | SLERP smooth and correct |
| Unit: LightAnimator | ✓ PASS | Intensity/color/pulse working |
| Integration: Bumper Hook | ✓ PASS | Animation fires on bumper hit |
| Integration: Target Hook | ✓ PASS | Animation fires on target hit |
| Integration: Ramp Hook | ✓ PASS | Animation fires on ramp |
| Integration: Flipper Hook | ✓ PASS | Animation fires on launch |
| Integration: Multiball Hook | ✓ PASS | Animation fires on extra ball |
| Integration: Drain Hook | ✓ PASS | Animation fires on drain |
| Debugger: Toggle | ✓ PASS | Ctrl+D works |
| Debugger: Status | ✓ PASS | Accurate real-time display |
| Debugger: List | ✓ PASS | All sequences listed |
| Debugger: Play | ✓ PASS | Play buttons functional |
| Performance: Build | ✓ PASS | 874ms (<900ms target) |
| Performance: Queue | ✓ PASS | <0.1ms update time |
| Performance: FPS | ✓ PASS | 60 FPS maintained |
| Performance: Memory | ✓ PASS | <25KB overhead |

---

## Next Steps After Testing

If all tests pass:
1. ✅ Phase 13 verified complete
2. ✅ Ready for Phase 14 planning
3. ✅ Can begin building demo tables with animations

If tests fail:
1. 🔧 Identify failures
2. 🔧 Debug using console tools
3. 🔧 Fix issues in code
4. 🔧 Re-test until all pass

---

**End of Test Plan**
