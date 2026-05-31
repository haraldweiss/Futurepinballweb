# Demo Table Video Configuration Examples

**Quick Reference for All 6 Demo Tables**

## 🏺 Pharaoh's Gold

### Overview
Ancient Egyptian theme with gold, scarabs, pyramids

### Video Files
```
/videos/pharaoh/
├── intro.mp4 (4 sec)         - Golden temple glows
├── bumper-hit.mp4 (1.5 sec)  - Scarab flashes
├── ramp-complete.mp4 (3 sec) - Pyramid rises
├── multiball.mp4 (5 sec)     - Curse unleashed
├── tilt.mp4 (2 sec)          - Temple crumbles
└── gameover.mp4 (4 sec)      - Tomb seals
```

### Quick Config
```typescript
import { setupTableVideos } from './table-video-config';

// In table load:
await setupTableVideos('pharaoh');
```

### Manual Setup
```typescript
const videos = [
  { id: 'pharaoh_bumper_hit', url: '/videos/pharaoh/bumper-hit.mp4', type: 'backglass', duration: 1.5, volume: 0.7 },
  { id: 'pharaoh_ramp_complete', url: '/videos/pharaoh/ramp-complete.mp4', type: 'backglass', duration: 3.0, volume: 1.0 },
  { id: 'pharaoh_multiball', url: '/videos/pharaoh/multiball.mp4', type: 'dmd', duration: 5.0, volume: 1.0 },
  { id: 'pharaoh_tilt', url: '/videos/pharaoh/tilt.mp4', type: 'backglass', duration: 2.0, volume: 0.8 },
  { id: 'pharaoh_gameover', url: '/videos/pharaoh/gameover.mp4', type: 'dmd', duration: 4.0, volume: 1.0 },
];

const bindings = [
  { trigger: 'bumper_hit', videoId: 'pharaoh_bumper_hit', delay: 0 },
  { trigger: 'ramp_complete', videoId: 'pharaoh_ramp_complete', delay: 100 },
  { trigger: 'multiball_start', videoId: 'pharaoh_multiball', delay: 500 },
  { trigger: 'tilt', videoId: 'pharaoh_tilt', delay: 0 },
  { trigger: 'game_over', videoId: 'pharaoh_gameover', delay: 1000 },
];
```

---

## 🐉 Dragon's Castle

### Overview
Dark fantasy with dragons, castles, dungeons

### Video Files
```
/videos/dragon/
├── intro.mp4 (5 sec)         - Dragon awakens
├── bumper-hit.mp4 (1.5 sec)  - Fire breath
├── ramp-complete.mp4 (3.5 sec) - Castle transforms
├── multiball.mp4 (6 sec)     - Dragon's hoard
├── tilt.mp4 (2.5 sec)        - Dragon roars
└── gameover.mp4 (5 sec)      - Castle collapses
```

### Quick Config
```typescript
await setupTableVideos('dragon');
```

### Event Timeline
- **0ms** - Bumper hit → video plays (allow interrupt)
- **100ms** - Ramp complete → video plays (no interrupt)
- **500ms** - Multiball launch → video plays (no interrupt)
- **0ms** - Tilt → video plays (no interrupt)
- **1000ms** - Game over → video plays

---

## ⚔️ Knight's Quest

### Overview
Medieval adventure with knights, quests, battles

### Video Files
```
/videos/knight/
├── intro.mp4 (4.5 sec)       - Knight rises
├── bumper-hit.mp4 (1.5 sec)  - Sword strike
├── ramp-complete.mp4 (3 sec) - Victory fanfare
├── multiball.mp4 (5.5 sec)   - Battle begins
├── tilt.mp4 (2 sec)          - Shield breaks
└── gameover.mp4 (4.5 sec)    - Knight falls
```

### Quick Config
```typescript
await setupTableVideos('knight');
```

### Special Handling
```typescript
// Optional: Only show bumper hit video on first 30 seconds
bindMgr.createBinding('knight_bumper_hit', 'bumper_hit', {
  condition: (state) => {
    return state.ballInPlay < 30; // First 30 seconds only
  },
});
```

---

## 🤖 Cyber Nexus

### Overview
Sci-fi cyberpunk with neon, robots, hacking

### Video Files
```
/videos/cyber/
├── intro.mp4 (5.5 sec)       - System boots
├── bumper-hit.mp4 (1.5 sec)  - Sparks fly
├── ramp-complete.mp4 (3 sec) - Data flows
├── multiball.mp4 (6 sec)     - AI awakens
├── tilt.mp4 (2.5 sec)        - System error
└── gameover.mp4 (5 sec)      - Shutdown
```

### Quick Config
```typescript
await setupTableVideos('cyber');
```

### Video Styling Tips
- Use neon colors (#00ff00, #ff00ff, #00ffff)
- Fast-paced cuts for cyber feel
- Digital effects and glitch transitions
- Minimal audio (sci-fi beeps)

---

## 🌃 Neon City

### Overview
Urban nightlife with neon lights, clubs, street racing

### Video Files
```
/videos/neon/
├── intro.mp4 (4 sec)         - Neon city lights
├── bumper-hit.mp4 (1.5 sec)  - Neon flash
├── ramp-complete.mp4 (2.5 sec) - Neon explosion
├── multiball.mp4 (5 sec)     - Club anthem
├── tilt.mp4 (2 sec)          - Neon crash
└── gameover.mp4 (4 sec)      - Lights out
```

### Quick Config
```typescript
await setupTableVideos('neon');
```

### Recommended Audio
- High-energy electronic music
- Neon buzzing/humming sounds
- Club atmosphere ambience

---

## 🌿 Jungle Expedition

### Overview
Adventure jungle with exotic animals, ancient ruins

### Video Files
```
/videos/jungle/
├── intro.mp4 (4.5 sec)       - Jungle awakens
├── bumper-hit.mp4 (1.5 sec)  - Animal encounter
├── ramp-complete.mp4 (3 sec) - Ruins revealed
├── multiball.mp4 (5.5 sec)   - Wildlife stampede
├── tilt.mp4 (2 sec)          - Earthquake
└── gameover.mp4 (4.5 sec)    - Nature reclaims
```

### Quick Config
```typescript
await setupTableVideos('jungle');
```

### Atmospheric Elements
- Natural jungle sounds (birds, insects)
- Leaves rustling, vines swaying
- Ancient stone/ruin textures
- Wildlife movements

---

## 📝 Universal Template

Use this template for creating videos for any new table:

```typescript
const MY_TABLE_VIDEOS = [
  {
    id: 'mytable_bumper_hit',
    name: 'Bumper Hit Effect',
    url: '/videos/mytable/bumper-hit.mp4',
    type: 'backglass',
    duration: 1.5,
    autoPlay: true,
    volume: 0.7,
  },
  {
    id: 'mytable_ramp_complete',
    name: 'Ramp Celebration',
    url: '/videos/mytable/ramp-complete.mp4',
    type: 'backglass',
    duration: 3.0,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'mytable_multiball',
    name: 'Multiball Intro',
    url: '/videos/mytable/multiball.mp4',
    type: 'dmd',
    duration: 5.0,
    autoPlay: true,
    volume: 1.0,
  },
  {
    id: 'mytable_tilt',
    name: 'Tilt Warning',
    url: '/videos/mytable/tilt.mp4',
    type: 'backglass',
    duration: 2.0,
    autoPlay: true,
    volume: 0.8,
  },
  {
    id: 'mytable_gameover',
    name: 'Game Over Sequence',
    url: '/videos/mytable/gameover.mp4',
    type: 'dmd',
    duration: 4.0,
    autoPlay: true,
    volume: 1.0,
  },
];

async function setupMyTableVideos() {
  const videoMgr = getVideoManager();
  const bindMgr = getVideoBindingManager();

  videoMgr.registerVideos(MY_TABLE_VIDEOS);

  bindMgr.createBinding('mytable_bumper_hit', 'bumper_hit', {
    priority: 5,
    delay: 0,
    allowInterrupt: true,
  });

  bindMgr.createBinding('mytable_ramp_complete', 'ramp_complete', {
    priority: 8,
    delay: 100,
    allowInterrupt: false,
  });

  bindMgr.createBinding('mytable_multiball', 'multiball_start', {
    priority: 10,
    delay: 500,
    allowInterrupt: false,
  });

  bindMgr.createBinding('mytable_tilt', 'tilt', {
    priority: 10,
    delay: 0,
    allowInterrupt: false,
  });

  bindMgr.createBinding('mytable_gameover', 'game_over', {
    priority: 10,
    delay: 1000,
    allowInterrupt: false,
  });
}
```

---

## 🎬 Video Creation Checklist

For each video you create:

### Pre-Production
- [ ] Define scene/animation
- [ ] Gather assets/footage
- [ ] Script any motion graphics
- [ ] Plan audio track

### Production
- [ ] Record/create main content (30 fps minimum)
- [ ] Add effects/transitions
- [ ] Add table-themed audio
- [ ] Color-grade to match table theme

### Post-Production
- [ ] Export as MP4 (H.264)
- [ ] Optimize file size (<10MB per minute)
- [ ] Test in browser
- [ ] Verify timing with game events

### Quality Verification
- [ ] Video plays on desktop (Chrome)
- [ ] Video plays on mobile (iOS Safari)
- [ ] Audio syncs with visuals
- [ ] No compression artifacts
- [ ] File size acceptable

---

## 📊 File Size Guide

### Target Sizes by Video Type

| Type | Duration | Bitrate | Size |
|------|----------|---------|------|
| Bumper Hit | 1.5 sec | 2 Mbps | 0.4 MB |
| Ramp Complete | 3 sec | 3 Mbps | 1.1 MB |
| Multiball | 5 sec | 4 Mbps | 2.5 MB |
| Tilt | 2 sec | 2 Mbps | 0.5 MB |
| Game Over | 4 sec | 3 Mbps | 1.5 MB |
| **Total** | **15.5 sec** | — | **~6.5 MB** |

---

## 🚀 Quick Start Steps

1. **Choose a table** (e.g., Pharaoh's Gold)
2. **Create 5 videos** (~15 seconds total)
3. **Place in** `/public/videos/tablename/`
4. **Update URLs** in config
5. **Call** `setupTableVideos('tablename')`
6. **Test** in browser!

---

## 📞 Support

- See `VIDEO_CONFIGURATION_GUIDE.md` for detailed setup
- See `EVENT_DRIVEN_VIDEO_SYSTEM.md` for API reference
- Check console logs for video loading errors
- Verify video files exist with correct URLs

**Happy video creating! 🎬🎮**
