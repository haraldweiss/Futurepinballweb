# Multi-Screen Layout System — Complete Guide

## Overview
The Future Pinball Web application supports 1, 2, and 3-screen arcade cabinet layouts using browser windows synchronized via BroadcastChannel API.

## Layout Configurations

### Layout 1: Single Screen (Default)
- **Windows**: 1 (Main playfield window only)
- **Use case**: Single monitor or compact setup
- **Content**: Playfield + inline backglass panel
- **Activation**: Select "1-Screen" or default startup

### Layout 2: Two-Screen (Playfield + Backglass)
- **Windows**: 2
  - **Primary**: Main playfield (keyboard input, physics, game logic)
  - **Secondary**: Dedicated backglass display window
- **Use case**: Arcade cabinet with playfield screen + backglass/DMD screen
- **Activation**: Select "2-Screen" in multiscreen modal
- **Window spec**: Full screen dimensions recommended

```
┌─────────────────┐     ┌──────────────────┐
│   PLAYFIELD     │     │    BACKGLASS     │
│   + Controls    │────▶│   Display Only   │
│   (All Logic)   │     │   (BroadcastCh)  │
└─────────────────┘     └──────────────────┘
       Monitor 1             Monitor 2
```

### Layout 3: Three-Screen (Playfield + Backglass + DMD)
- **Windows**: 3
  - **Primary**: Main playfield (keyboard input, physics, game logic)
  - **Secondary**: Dedicated backglass display window
  - **Tertiary**: Dedicated DMD (128×32 LED) display window
- **Use case**: Full arcade cabinet with separate playfield, backglass, and DMD screens
- **Activation**: Select "3-Screen" in multiscreen modal
- **Window positioning**: Suggested ~75% for backglass, ~55% width × 28% height for DMD

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────┐
│   PLAYFIELD     │     │    BACKGLASS     │     │   DMD   │
│   + Controls    │────▶│   Display Only   │────▶│ Display │
│   (All Logic)   │     │   (BroadcastCh)  │     │(Broadcast)
└─────────────────┘     └──────────────────┘     └─────────┘
       Monitor 1             Monitor 2           Monitor 3
```

## How It Works

### State Synchronization
- **Primary window** (playfield) broadcasts game state every frame via BroadcastChannel
- **Secondary/Tertiary windows** listen for state updates and render accordingly
- **Communication channel**: 'fpw-multiscreen' BroadcastChannel

### Broadcast Payload
```typescript
{
  type: 'state',
  score: number,
  ballNum: number,
  multiplier: number,
  inLane: boolean,
  dmdMode: 'attract' | 'playing' | 'event' | 'gameover',
  dmdEventText: string,
  dmdAnimFrame: number,
  dmdScrollX: number,
  dmdEventTimer: number,
  lastRank: number,
  lastScore: number,
  bumperHits: number,
  tableName: string,
  tableAccent: number,      // hex color
  tableColor: number,       // hex color
  highScores: array
}
```

### Role Detection
Windows are identified by URL query parameter:
- **Main playfield**: No `role` parameter (or `role` not set)
- **DMD window**: `?role=dmd`
- **Backglass window**: `?role=backglass`

### Window Management
- URLs use relative paths: `location.origin + location.pathname`
- Window positions saved in localStorage for persistence:
  - `fpw_winpos_dmd`: `{x, y, w, h}`
  - `fpw_winpos_backglass`: `{x, y, w, h}`
- Window references tracked in `_msWindows` object
- Physics worker auto-disposed when secondary windows close

## API Reference

### Open/Close Multiscreen Modal
```javascript
window.openMultiscreenModal()   // Show layout selector
window.closeMultiscreenModal()  // Hide layout selector
```

### Layout Selection
```javascript
window.selectMsLayout(n)  // Select layout: 1, 2, or 3
window.applyMsLayout()    // Apply selected layout (opens windows)
```

### Auto-Detection
```javascript
window.autoDetectScreens()
// Detects number of physical screens
// Automatically selects optimal layout
// Updates UI with detection info
```

### Layout Info
```javascript
const currentLayout = localStorage.getItem('fpw_ms_layout') || '1'
```

## Technical Details

### File Locations
| Component | File | Lines |
|-----------|------|-------|
| BroadcastChannel Setup | src/main.ts | 300-302 |
| State Broadcasting | src/main.ts | 1987-1998 |
| Layout Selector Functions | src/main.ts | 2700-2744 |
| DMD Window Setup | src/main.ts | 2747-2762 |
| Backglass Window Setup | src/main.ts | 2764-2785 |
| Role Detection | src/main.ts | 296-298 |
| Role-based Initialization | src/main.ts | 3108-3116 |

### DMD Window (`role=dmd`)
- Canvas-based rendering of 128×32 LED display
- Receives state updates via BroadcastChannel
- Displays attract, playing, event, and gameover screens
- Responsive scaling based on window size

### Backglass Window (`role=backglass`)
- Canvas-based rendering with gradients and text
- Optional embedded DMD display (`?nodmd=1` to hide)
- Shows table name, score, high scores
- Responsive layout

### Playfield Window (Main)
- Full Three.js 3D rendering
- Rapier2D physics simulation
- Keyboard input handling (flippers, plunger)
- BroadcastChannel state publisher
- VBScript execution engine

## Usage Workflow

### Starting Multi-Screen Mode

1. **Open Main App**
   ```
   Load: http://localhost:5173
   ```

2. **Access Multiscreen Modal**
   - Click "Multiscreen" button in main UI
   - Or call: `window.openMultiscreenModal()`

3. **Select Layout**
   - Click "1-Screen", "2-Screen", or "3-Screen" card
   - Optional: Click "Auto-Detect" to let system choose

4. **Apply Layout**
   - Click "Apply" button
   - Secondary windows open automatically
   - Position windows across monitors as needed

5. **Load Game**
   - Select table in main playfield window
   - Secondary windows automatically sync state
   - All screens display synchronized state

### Moving Windows to Monitors

On Windows/Linux/macOS:
1. Drag DMD/Backglass window to desired monitor
2. Resize window to preferred dimensions
3. Position will be remembered for next session
4. Auto-restores on next multi-screen setup

## Browser Support

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| BroadcastChannel | ✅ 54+ | ✅ 38+ | ✅ 15.1+ | ✅ 79+ |
| Multi-window | ✅ | ✅ | ✅ | ✅ |
| localStorage | ✅ | ✅ | ✅ | ✅ |
| Screen API | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited | ⚠️ Limited |

## Troubleshooting

### Windows Don't Open
**Issue**: Secondary windows blocked by browser
**Solution**:
1. Ensure windows aren't blocked by browser settings
2. Check console for errors (F12)
3. Allow popups for this site

### State Not Syncing
**Issue**: DMD/Backglass shows incorrect state
**Solution**:
1. Check BroadcastChannel support (F12 console)
2. Verify all windows are on same origin
3. Check localStorage is enabled
4. Reload all windows (Ctrl+R)

### Windows Can't Find Each Other
**Issue**: DMD/Backglass windows appear blank
**Solution**:
1. Ensure same protocol (http/https)
2. Same domain/port required
3. Check browser console for CORS errors
4. Try incognito/private mode

### Position Not Remembered
**Issue**: Windows don't restore previous position
**Solution**:
1. Ensure localStorage isn't cleared on exit
2. Check browser privacy settings
3. Verify `fpw_winpos_*` keys in localStorage

## Development Notes

### Adding New State Fields
1. Add property to broadcast payload (main.ts:1988-1998)
2. Add property to DMD state listener (main.ts:2761)
3. Add property to backglass state listener (main.ts:2784)
4. Update TypeScript types if needed

### Optimizing State Updates
- Current: Full state broadcast every frame
- Future: Only delta changes (reduce bandwidth)
- Implement: Message batching or WebSocket upgrade

### Quality Considerations
- **Latency**: BroadcastChannel is synchronous (negligible)
- **CPU**: Secondary windows use ~5-10% additional CPU
- **RAM**: ~30-50MB per secondary window
- **Bandwidth**: ~100KB/s per secondary window

## Future Enhancements

### Phase 16+ Potential Features
- [ ] Remote screen display via WebRTC
- [ ] Network-based multi-screen (multiple machines)
- [ ] Shared physics simulation (reduce redundancy)
- [ ] Touch input forwarding from secondary screens
- [ ] Custom window layouts (2×2, L-shaped, etc.)
- [ ] Recording sync across all screens
- [ ] Spectator mode (read-only windows)

## References

- BroadcastChannel API: https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel
- Screen API: https://w3c.github.io/screen-orientation/
- localStorage: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- window.open(): https://developer.mozilla.org/en-US/docs/Web/API/Window/open
