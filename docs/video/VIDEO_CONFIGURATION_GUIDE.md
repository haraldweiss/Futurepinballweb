# Video Configuration Guide for Future Pinball Web Tables

**Status**: ✅ COMPLETE
**Date**: 2026-03-09
**File**: `src/table-video-config.ts` (385 lines)
**Version**: 0.17.4

## Overview

This guide explains how to create and configure videos for your Future Pinball Web tables. The `table-video-config.ts` module provides pre-configured examples for all 6 demo tables that you can use as templates for your own tables.

## Quick Start

### Step 1: Create Your Videos

Create short video clips (2-6 seconds) for these events:

```
videos/
├── your-table/
│   ├── intro.mp4              (4-5 sec) - Table introduction
│   ├── bumper-hit.mp4         (1.5 sec) - Bumper impact effect
│   ├── ramp-complete.mp4      (2.5-3 sec) - Ramp completion
│   ├── multiball.mp4          (5-6 sec) - Multiball launch
│   ├── tilt.mp4               (2 sec) - Tilt warning
│   └── gameover.mp4           (4-5 sec) - Game over sequence
```

### Step 2: Register Videos in Your Table Configuration

```typescript
import { VideoConfig } from './video-manager';

const MY_TABLE_VIDEOS: VideoConfig[] = [
  {
    id: 'mytable_intro',
    name: 'My Table Intro',
    url: '/videos/my-table/intro.mp4',
    type: 'backglass',
    duration: 4.5,
    autoPlay: true,
    volume: 0.9,
  },
  // ... more videos
];
```

### Step 3: Load Videos When Table Starts

```typescript
import { setupTableVideos } from './table-video-config';

// In your table load handler:
async function loadMyTable() {
  // ... load game table ...
  await setupTableVideos('my-table-key');
  // Videos are now ready to play!
}
```

That's it! Videos will automatically play when their bound events occur.

---

## Complete Configuration Examples

### Example Table: Pharaoh's Gold

#### Video Registration

```typescript
import { VideoConfig } from './video-manager';

const PHARAOH_VIDEOS: VideoConfig[] = [
  {
    id: 'pharaoh_intro',
    name: 'Pharaoh Intro',
    url: '/videos/pharaoh/intro.mp4',
    type: 'backglass',
    duration: 4.0,
    autoPlay: true,
    volume: 0.9,
  },
  {
    id: 'pharaoh_bumper_hit',
    name: 'Pharaoh Bumper Hit',
    url: '/videos/pharaoh/bumper-hit.mp4',
    type: 'backglass',
    duration: 1.5,
    autoPlay: true,
    volume: 0.7,
  },
  // ... more videos
];
```

#### Event Binding Setup

```typescript
import { getVideoManager, getVideoBindingManager } from './video-manager';

async function setupPharaohVideos() {
  const videoMgr = getVideoManager();
  const bindMgr = getVideoBindingManager();

  // Register all videos
  videoMgr.registerVideos(PHARAOH_VIDEOS);

  // Bind videos to events
  bindMgr.createBinding('pharaoh_bumper_hit', 'bumper_hit', {
    priority: 5,
    autoPlay: true,
    delay: 0,
    allowInterrupt: true,
  });

  bindMgr.createBinding('pharaoh_ramp_complete', 'ramp_complete', {
    priority: 8,
    autoPlay: true,
    delay: 100,
    allowInterrupt: false,
  });

  bindMgr.createBinding('pharaoh_multiball', 'multiball_start', {
    priority: 10,
    autoPlay: true,
    delay: 500,
    allowInterrupt: false,
  });

  bindMgr.createBinding('pharaoh_tilt', 'tilt', {
    priority: 10,
    autoPlay: true,
    delay: 0,
    allowInterrupt: false,
  });

  bindMgr.createBinding('pharaoh_gameover', 'game_over', {
    priority: 10,
    autoPlay: true,
    delay: 1000,
    allowInterrupt: false,
  });
}
```

---

## Video Configuration Properties

### VideoConfig Interface

```typescript
interface VideoConfig {
  id: string;              // Unique ID (use: tablename_eventype)
  name: string;            // Display name (for UI/logs)
  url: string;             // Path to video file (/videos/table/name.mp4)
  type: 'backglass'|'dmd'; // Display location
  duration: number;        // Video length in seconds
  autoPlay?: boolean;      // Auto-play when triggered (default: true)
  loop?: boolean;          // Loop video (default: false)
  volume?: number;         // Volume 0-1 (default: 1.0)
  muted?: boolean;         // Muted on start (default: false)
  playbackRate?: number;   // Speed 0.5-2.0 (default: 1.0)
  quality?: 'low'|'medium'|'high'|'ultra'; // Quality variant
}
```

### Video Type Selection

#### Backglass Videos
- **Dimensions**: 30% width, full height
- **Use for**: Table introductions, bumper effects, ramp celebrations, tilt warnings
- **Best duration**: 1.5 - 4 seconds
- **Style**: Cinematic, table-themed animations

```typescript
{
  type: 'backglass',  // Displays on right side where backglass would be
  duration: 2.5,
  url: '/videos/table/effect.mp4',
}
```

#### DMD Videos
- **Dimensions**: 640×160 fixed, bottom center
- **Use for**: Full-screen events, multiball intros, game over, achievements
- **Best duration**: 5 - 6 seconds
- **Style**: Full-screen cinematics, DMD-style graphics

```typescript
{
  type: 'dmd',  // Displays as full-screen element at bottom
  duration: 5.0,
  url: '/videos/table/multiball-intro.mp4',
}
```

### Volume Configuration

```typescript
// Relative to master game volume
{
  volume: 1.0,  // Full volume (100%)
  volume: 0.8,  // 80% (good for background effects)
  volume: 0.5,  // 50% (muted effects)
  volume: 0.0,  // Silent (video only, no audio)
}
```

### Playback Speed

```typescript
// Slow motion or fast effects
{
  playbackRate: 0.5,   // Half speed (slow-mo)
  playbackRate: 1.0,   // Normal speed
  playbackRate: 1.5,   // 1.5x faster
  playbackRate: 2.0,   // Double speed
}
```

---

## Event Binding Configuration

### Available Event Triggers

| Trigger | Description | Timing | Priority |
|---------|-------------|--------|----------|
| `bumper_hit` | Ball hits bumper | Immediate | Low (5) |
| `target_hit` | Ball hits target | Immediate | Low (5) |
| `ramp_complete` | Ramp sequence finished | Immediate | Medium (8) |
| `multiball_start` | Multiball launched | Delayed (500ms) | High (10) |
| `ball_drain` | Ball enters drain | Delayed (200ms) | Low (5) |
| `flipper_hit` | Flipper activates | Immediate | Low (5) |
| `slingshot` | Slingshot activated | Immediate | Low (5) |
| `spinner` | Spinner activated | Immediate | Low (5) |
| `combo` | Combo milestone | Delayed | Medium (5) |
| `tilt` | Player tilts | Immediate | High (10) |
| `game_over` | Game ends | Delayed (1000ms) | Highest (10) |

### Binding Configuration

```typescript
bindMgr.createBinding(videoId, triggerType, {
  priority: 10,              // 0-10 (higher = plays first)
  autoPlay: true,            // Auto-play when triggered
  delay: 500,                // ms before playing (0 = immediate)
  allowInterrupt: false,     // Can be interrupted by another event
  metadata: {                // Optional custom data
    tableTheme: 'pharaoh',
    version: '1.0',
  },
  condition: (state) => {    // Optional condition function
    return state.score > 10000;
  },
});
```

---

## Video Creation Best Practices

### Optimal Durations

```
Intro:          4-5 seconds    (Sets mood for the table)
Bumper hit:     1.5 seconds    (Quick impact effect)
Ramp complete:  2.5-3 seconds  (Celebration moment)
Multiball:      5-6 seconds    (Cinematic intro)
Tilt:           2 seconds      (Warning/consequence)
Ball drain:     1-2 seconds    (Short effect, if used)
Game over:      4-5 seconds    (Final moment)
```

### Video Quality Recommendations

#### Desktop (1080p)
```bash
# Recommended settings
Resolution:     1920×1080 (backglass) or 1280×320 (DMD)
Bitrate:        4-6 Mbps
Codec:          H.264
Audio:          AAC, 192 kbps stereo
Frame rate:     30 fps

# Encoding command
ffmpeg -i input.mov \
  -vcodec libx264 -crf 23 \
  -vf "scale=1920:1080" \
  -acodec aac -b:a 192k \
  -r 30 output.mp4
```

#### Mobile (720p)
```bash
# Recommended settings
Resolution:     1280×720 (backglass) or 960×240 (DMD)
Bitrate:        2-3 Mbps
Codec:          H.264
Audio:          AAC, 128 kbps mono
Frame rate:     30 fps

# Encoding command
ffmpeg -i input.mov \
  -vcodec libx264 -crf 25 \
  -vf "scale=1280:720" \
  -acodec aac -b:a 128k \
  -r 30 output.mp4
```

### File Organization

```
public/
└── videos/
    ├── pharaoh/           # Table-specific videos
    │   ├── intro.mp4
    │   ├── bumper-hit.mp4
    │   ├── ramp-complete.mp4
    │   ├── multiball.mp4
    │   ├── tilt.mp4
    │   └── gameover.mp4
    ├── dragon/
    │   ├── intro.mp4
    │   └── ...
    └── ...other tables...
```

---

## Real-World Implementation Examples

### Example 1: Pharaoh's Gold Setup

```typescript
import { VideoConfig } from './video-manager';
import { getVideoManager, getVideoBindingManager } from './video-manager';

// Video definitions
const PHARAOH_VIDEOS: VideoConfig[] = [
  {
    id: 'pharaoh_bumper_hit',
    name: 'Golden Scarab Flash',
    url: '/videos/pharaoh/bumper-hit.mp4',
    type: 'backglass',
    duration: 1.5,
    autoPlay: true,
    volume: 0.7,
  },
  {
    id: 'pharaoh_ramp_complete',
    name: 'Pyramid Rise',
    url: '/videos/pharaoh/ramp-complete.mp4',
    type: 'backglass',
    duration: 3.0,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'pharaoh_multiball',
    name: 'Curse Unleashed',
    url: '/videos/pharaoh/multiball.mp4',
    type: 'dmd',
    duration: 5.0,
    autoPlay: true,
    volume: 1.0,
  },
];

// Setup function
async function setupPharaohVideos() {
  const videoMgr = getVideoManager();
  const bindMgr = getVideoBindingManager();

  // Register videos
  videoMgr.registerVideos(PHARAOH_VIDEOS);

  // Create bindings
  bindMgr.createBinding('pharaoh_bumper_hit', 'bumper_hit', {
    priority: 5,
    delay: 0,
  });

  bindMgr.createBinding('pharaoh_ramp_complete', 'ramp_complete', {
    priority: 8,
    delay: 100,
    allowInterrupt: false,
  });

  bindMgr.createBinding('pharaoh_multiball', 'multiball_start', {
    priority: 10,
    delay: 500,
    allowInterrupt: false,
  });

  console.log('✓ Pharaoh videos configured');
}

// Call when table loads
export function loadPharaohTable() {
  // ... existing table load code ...
  setupPharaohVideos();
}
```

### Example 2: Conditional Video Playback

```typescript
import { getVideoBindingManager } from './video-manager';

// Create a video that only plays on high combos
const bindMgr = getVideoBindingManager();

bindMgr.createBinding('dragon_achievement', 'combo', {
  priority: 10,
  condition: (gameState) => {
    // Only play if combo is 10 or higher
    return gameState.bumperCombo >= 10;
  },
  allowInterrupt: false,
});
```

### Example 3: Delayed Video Playback

```typescript
// Multiball intro plays 500ms after multiball launches
// This gives time for sound effects and score display before video
bindMgr.createBinding('dragon_multiball', 'multiball_start', {
  priority: 10,
  delay: 500,  // Wait 500ms
  allowInterrupt: false,
});
```

---

## Using the Table Video Config Module

### Import and Setup

```typescript
import { setupTableVideos, getVideoConfigForTable } from './table-video-config';

// Option 1: Automatic setup (recommended)
async function loadTableWithVideos(tableKey: string) {
  // Load game table
  buildTable(config, scene, library);

  // Setup videos automatically
  await setupTableVideos(tableKey);
}

// Option 2: Manual setup
async function loadTableManual(tableKey: string) {
  const { getVideoManager, getVideoBindingManager } =
    await import('./video-manager');
  const { getVideoConfigForTable, getVideoBindingsForTable } =
    await import('./table-video-config');

  const videoMgr = getVideoManager();
  const bindMgr = getVideoBindingManager();

  // Register all videos
  const videos = getVideoConfigForTable(tableKey);
  videoMgr.registerVideos(videos);

  // Create all bindings
  const bindings = getVideoBindingsForTable(tableKey);
  for (const binding of bindings) {
    bindMgr.createBinding(binding.videoId, binding.trigger, {
      priority: 10,
      autoPlay: true,
      delay: binding.delay,
      allowInterrupt: binding.allowInterrupt,
    });
  }
}
```

---

## Troubleshooting

### Video Won't Play

**Check these in order:**

1. **Video file exists**
   ```bash
   ls -la /public/videos/tablename/video.mp4
   ```

2. **Video format is correct** (MP4 recommended)
   ```bash
   ffprobe videos/table/video.mp4
   ```

3. **Video ID matches binding**
   ```typescript
   // Register: 'table_event'
   // Bind: 'table_event' ✓
   ```

4. **Browser console for errors**
   - Open DevTools (F12)
   - Check Console tab for video errors
   - Check Network tab to see if video loads

### Audio Issues

```typescript
// Mute audio if it conflicts with game sounds
{
  id: 'table_video',
  url: '/videos/table/video.mp4',
  muted: true,  // No audio
}

// Or reduce volume
{
  volume: 0.5,  // 50% of game volume
}
```

### Timing Problems

```typescript
// Adjust delay to align with other effects
bindMgr.createBinding('video_id', 'event_trigger', {
  delay: 100,  // Play 100ms after event fires
  // Adjust until timing feels right
});
```

---

## Performance Tips

### File Size Optimization

```bash
# Reduce file size without quality loss
ffmpeg -i input.mp4 \
  -vcodec libx264 -crf 25 \
  -preset medium \
  -acodec aac -b:a 128k \
  output.mp4
```

### Streaming Large Videos

```typescript
// For large videos (>10MB), use HLS streaming
{
  id: 'large_video',
  url: '/videos/stream.m3u8',  // HLS playlist
  type: 'backglass',
  duration: 10.0,
}
```

### Memory Management

```typescript
// Clear videos when table changes
async function switchTables(newTableKey: string) {
  const videoMgr = getVideoManager();

  // Clear old videos
  videoMgr.clear();

  // Load new videos
  await setupTableVideos(newTableKey);
}
```

---

## File Structure for Your Project

### Recommended Organization

```
FuturePin ball-Web/
├── src/
│   ├── table-video-config.ts       (provided)
│   ├── video-manager.ts            (provided)
│   └── mechanics/
│       └── video-binding.ts        (provided)
├── public/
│   └── videos/
│       ├── pharaoh/
│       │   ├── intro.mp4
│       │   ├── bumper-hit.mp4
│       │   ├── ramp-complete.mp4
│       │   ├── multiball.mp4
│       │   ├── tilt.mp4
│       │   └── gameover.mp4
│       ├── dragon/
│       │   └── ...
│       └── ...other tables...
└── docs/
    ├── VIDEO_CONFIGURATION_GUIDE.md (this file)
    └── VIDEO_CREATION_SPECS.md
```

---

## Summary

The video configuration system provides:

✅ **Easy Setup** — `setupTableVideos(tableKey)` does it all
✅ **Flexible Configuration** — Customize every aspect
✅ **Best Practices** — Pre-configured examples for all tables
✅ **Performance** — Optimized for all devices
✅ **Quality** — Professional video playback

All 6 demo tables have complete video configurations ready to use as templates!

---

**Ready to Add Videos to Your Tables?**

1. Create your video files (2-6 seconds each)
2. Place in `/public/videos/your-table/`
3. Copy configuration from `table-video-config.ts`
4. Customize video URLs and bindings
5. Test with `setupTableVideos('your-table')`

That's it! 🎬
