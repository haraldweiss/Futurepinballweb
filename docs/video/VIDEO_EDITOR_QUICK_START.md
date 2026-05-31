# Video Editor — Quick Start Guide

## 5-Minute Setup

### 1. Open the Video Editor

```
Game Running
  ↓
Press "Editor" button in HUD
  ↓
Click "🎬 Videos" tab (4th tab)
  ↓
Video editor panel appears!
```

### 2. Add a Video (Two Methods)

**Method A: Upload Your Own**
```
Click "+ Upload" button
  ↓
Select MP4 or WebM file
  ↓
Fill in:
  - Video ID: my_bumper_hit
  - Name: Custom Bumper Hit
  - Type: backglass (or dmd)
  - Duration: 2.5 (seconds)
  - Volume: 80%
  ↓
Click "Upload"
```

**Method B: Use Template**
```
Click "Load Template" button
  ↓
Select template (e.g., "Bumper Hit")
  ↓
Auto-created with sensible defaults
```

### 3. Create a Binding

```
Click "+ Bind" button
  ↓
Select trigger event (dropdown)
  - bumper_hit
  - ramp_complete
  - multiball_start
  - combo_5, combo_10, combo_20, combo_50
  - level_complete
  - achievement_unlock
  - [and 20+ more...]
  ↓
Select video from dropdown
  ↓
Set priority (1-10)
  - 10 = plays first, can't be interrupted
  - 5 = medium priority
  - 1 = plays last, easily interrupted
  ↓
Set delay (0-5000ms)
  - 0 = play immediately
  - 500 = wait 500ms (good for impact timing)
  ↓
Toggle "Allow Interrupt"
  - ON = video can be skipped by higher priority
  - OFF = video always plays completely
  ↓
Click "Create Binding"
```

### 4. Test Your Binding

```
Click binding in the list to select it
  ↓
Click "🧪 Test Selected Binding"
  ↓
Video plays in appropriate container!
```

### 5. Apply Changes

```
Click "✓ Apply & Save"
  ↓
Editor closes
  ↓
Videos ready for in-game playback
```

---

## Common Scenarios

### Scenario 1: Bumper Hit Sound Effect

```
1. Upload video: bumper-spark.mp4
   ID: bumper_hit_spark
   Type: backglass
   Duration: 1.5s

2. Create binding:
   Trigger: bumper_hit
   Video: bumper_hit_spark
   Priority: 5
   Delay: 0
   Allow Interrupt: YES

3. Test → Apply
```

### Scenario 2: High-Score Achievement

```
1. Upload video: achievement-unlock.mp4
   ID: achievement_video
   Type: dmd
   Duration: 3.0s

2. Create binding:
   Trigger: achievement_unlock
   Video: achievement_video
   Priority: 9
   Delay: 100
   Allow Interrupt: NO

3. Test → Apply
```

### Scenario 3: Combo Milestone Animations

```
1. Upload 4 videos:
   - combo_5_hit.mp4 (1.5s)
   - combo_10_hit.mp4 (2.0s)
   - combo_20_hit.mp4 (2.5s)
   - combo_50_hit.mp4 (3.0s)

2. Create 4 bindings:
   combo_5 → combo_5_hit (Priority 6, Delay 0)
   combo_10 → combo_10_hit (Priority 7, Delay 100)
   combo_20 → combo_20_hit (Priority 8, Delay 200)
   combo_50 → combo_50_hit (Priority 10, Delay 300)

3. Test each → Apply all
```

---

## UI Layout Explained

```
┌─────────────────────────────────────────────────────┐
│ 📝 Table Editor: Jungle Expedition                  │
├──────────────┬──────────────┬──────────────────────┤
│ 🎬 Videos    │              │                      │
└──────────────┴──────────────┴──────────────────────┘

┌─────────────────┬──────────────┬──────────────────┐
│  VIDEO LIBRARY  │ VIDEO DETAILS│  EVENT BINDINGS  │
├─────────────────┼──────────────┼──────────────────┤
│ 📹 Video 1      │ Video ID     │ bumper_hit →     │
│ 📹 Video 2      │ Name         │ video_1 (P5)     │
│ 📹 Video 3      │ Type: dmd    │                  │
│                 │ Duration: 3s │ ramp_complete →  │
│ [scroll area]   │ Volume: 100% │ video_2 (P8)     │
│                 │              │                  │
│                 │ Related:     │ multiball_start→ │
│                 │ • binding_1  │ video_3 (P10)    │
│                 │ • binding_2  │                  │
│                 │              │ [scroll area]    │
├─────────────────┼──────────────┼──────────────────┤
│ + Upload        │              │ BINDING CONFIG:  │
│ Load Template   │              │ Trigger: [v]     │
│ Remove Selected │              │ Video: [v]       │
└─────────────────┴──────────────┴──────────────────┘

┌─────────────────────────────────────────────────────┐
│ 🧪 Test  | Clear All | Status: ✅ Binding created │
└─────────────────────────────────────────────────────┘
```

**Left Panel**: Your video library
- Shows all registered videos
- Click to select and view details
- Remove unwanted videos

**Center Panel**: Selected video information
- Name, URL, type, duration, volume
- Which bindings use this video
- Quick reference

**Right Panel**: Event binding management
- All bindings for current table
- Configure trigger/priority/delay
- Test individual bindings

---

## Keyboard Shortcuts

Currently no keyboard shortcuts, but planned:
- `V` - Switch to video tab
- `U` - Open upload dialog
- `T` - Load template selector
- `B` - Create new binding
- `Delete` - Remove selected video/binding (with confirmation)

---

## Tips & Tricks

### Tip 1: Priority Ordering
```
Multiple videos can trigger on the same event!
Higher priority plays first:

bumper_hit → Video 1 (Priority 10) ← plays FIRST
bumper_hit → Video 2 (Priority 5)  ← plays SECOND
bumper_hit → Video 3 (Priority 1)  ← plays LAST

Use this for layered effects:
- Priority 10: Main bumper impact (can't interrupt)
- Priority 5: Bumper glow (can interrupt)
- Priority 1: Score popup (easily interrupted)
```

### Tip 2: Delay Timing
```
Play around with delays for impact:

combo_5:
  Delay 0ms - instant (tight, immediate)
  Delay 100ms - small pause (feels more weighty)
  Delay 300ms - longer pause (builds anticipation)

Experiment to find what feels best!
```

### Tip 3: Interrupt Modes
```
Use interruption strategically:

Protected (Allow Interrupt: OFF):
- combo_20 (don't interrupt mid-celebration)
- level_complete (important milestone)
- jackpot_hit (special moment)

Interruptible (Allow Interrupt: ON):
- bumper_hit (common, can skip for combos)
- ball_save (quick, doesn't interrupt gameplay)
- score_milestone (nice but not essential)
```

### Tip 4: Volume Management
```
Keep volumes balanced:

Backglass videos: 80-100% (visual focus)
DMD videos: 60-80% (complements backglass)
Quick effects: 40-60% (background)

Consider audio ducking in post-production!
```

### Tip 5: Testing Workflow
```
1. Create binding
2. Click to select it
3. Click "Test" button
4. Watch it play
5. Adjust if needed (priority/delay)
6. Save
7. Test again
8. Once satisfied → Apply All

Iterate until it feels perfect!
```

---

## Video Format Requirements

### Supported Formats
- ✅ MP4 (H.264) - RECOMMENDED
- ✅ WebM (VP9) - Good for modern browsers
- ✅ Ogg Theora - Fallback support
- ❌ AVI, MOV, MKV - Not supported

### Recommended Specifications

| Property | Value |
|----------|-------|
| Format | MP4 (H.264) |
| Resolution | 1080p or 720p |
| Bitrate | 4-8 Mbps |
| Frame Rate | 30 fps or 60 fps |
| Codec | H.264 (libx264) |
| Audio | AAC, 128kbps |
| File Size | <5 MB per minute |

### Encoding Example (FFmpeg)

```bash
# High quality (desktop)
ffmpeg -i input.mov \
  -vcodec libx264 -crf 23 \
  -acodec aac -b:a 192k \
  output.mp4

# Mobile optimized
ffmpeg -i input.mov \
  -vf scale=854:480 \
  -vcodec libx264 -crf 25 \
  -acodec aac -b:a 128k \
  output-480p.mp4
```

---

## Extended Event Types (Complete List)

### Core Events (11)
```
bumper_hit         - Ball hits bumper
target_hit         - Ball hits target
ramp_complete      - Ramp sequence finished
multiball_start    - Multiball launched
ball_drain         - Ball lost
flipper_hit        - Flipper activated with ball
slingshot          - Slingshot activated
spinner            - Spinner activated
tilt               - Player tilted
game_over          - Game finished
```

### Extended Events (17+)
```
combo_5            - 5-hit combo reached
combo_10           - 10-hit combo reached
combo_20           - 20-hit combo reached
combo_50           - 50-hit combo reached (extreme!)

level_complete     - Level/stage finished
achievement_unlock - Achievement earned
bonus_round        - Bonus round started
skill_shot         - Skill shot hit

jackpot_hit        - Jackpot activated
ball_save          - Ball save triggered
extra_ball         - Extra ball earned
score_milestone    - 100K, 500K, 1M, 5M+

combo_breaker      - Combo chain broken
danger_drain       - Ball near drain (warning)
victory_lap        - Victory sequence
perfect_game       - Perfect score/completion
easter_egg         - Hidden Easter egg found
special_event      - Custom table event
```

---

## Troubleshooting

### Video doesn't appear in list after upload
- Check browser console for errors (F12)
- Ensure file was selected
- Try a different video format
- Check file size isn't too large

### Binding doesn't trigger
- Verify trigger event is correct
- Check that video is registered
- Test the binding (click "Test" button)
- Confirm event is actually happening in game

### Video plays but sound is missing
- Check volume slider in video details
- Verify audio codec (should be AAC)
- Confirm audio exists in video file
- Check browser audio isn't muted

### Performance issues
- Reduce video bitrate/resolution
- Lower video volume settings
- Reduce number of simultaneous bindings
- Check for hardware acceleration in browser settings

### UI looks broken
- Try refreshing browser (F5)
- Clear browser cache (Ctrl+Shift+Delete)
- Try different browser
- Check browser console for JS errors

---

## Advanced Configuration

### Using Conditions (Future Feature)

Currently, conditions are not exposed in UI, but can be used programmatically:

```typescript
// In main.ts or custom scripts
const bindMgr = getVideoBindingManager();
bindMgr.createBinding('video_id', 'combo_5', {
  priority: 7,
  delay: 100,
  condition: (gameState) => {
    // Only play if combo >= 5 AND score > 100K
    return gameState.bumperCombo >= 5 && gameState.score > 100000;
  }
});
```

---

## Getting Help

1. **Check the Documentation**
   - `VIDEO_EDITOR_UI_IMPLEMENTATION.md` - Complete reference
   - `PHASE17_VIDEO_SYSTEM_SUMMARY.md` - Architecture overview
   - `EVENT_DRIVEN_VIDEO_SYSTEM.md` - Event system details

2. **Test Your Video**
   - Use "🧪 Test" button to verify playback
   - Check video details for metadata
   - Verify file format and codec

3. **Debug in Console**
   - Open browser console (F12)
   - Look for error messages
   - Check network tab for file loading

4. **Check Build Status**
   - Run `npm run build`
   - Should complete in ~1 second
   - Should show 0 errors

---

## Summary

The Video Editor lets you:
✅ Upload custom videos (MP4, WebM)
✅ Trigger videos on 28+ game events
✅ Configure priority, delay, interruption
✅ Test bindings in real-time
✅ Manage multiple videos + bindings
✅ Use pre-made templates for quick setup

**It's that simple!** Upload → Bind → Test → Apply.

Happy video editing! 🎬
