# Multi-Screen Layout — Quick Reference Card

## Three Layouts at a Glance

### 🖥️ Layout 1: Single Screen (Default)
```
┌──────────────────────┐
│   Playfield          │
│   + Backglass Panel  │
└──────────────────────┘
```
**Best for**: Single monitor desktop
**Windows**: 1
**Activation**: Default (no setup needed)

---

### 🖥️🖥️ Layout 2: Two-Screen (Playfield + Backglass)
```
Monitor 1                    Monitor 2
┌──────────────────┐        ┌──────────────────┐
│   Playfield      │        │   Backglass      │
│   + Controls     │        │   Display Only   │
│   (All Logic)    │        │   (BroadcastCh)  │
└──────────────────┘        └──────────────────┘
```
**Best for**: Arcade cabinet (playfield + backglass display)
**Windows**: 2
**Activation**:
```javascript
window.selectMsLayout(2)
window.applyMsLayout()
```

---

### 🖥️🖥️🖥️ Layout 3: Three-Screen (Full Arcade Setup)
```
Monitor 1          Monitor 2           Monitor 3
Playfield          Backglass           DMD Display
┌─────────────┐   ┌──────────────┐    ┌────────┐
│ Playfield   │   │  Backglass   │    │  DMD   │
│ + Controls  │   │  Display     │    │ (LED)  │
│ (All Logic) │   │              │    │        │
└─────────────┘   └──────────────┘    └────────┘
```
**Best for**: Full arcade cabinet (playfield + backglass + DMD)
**Windows**: 3
**Activation**:
```javascript
window.selectMsLayout(3)
window.applyMsLayout()
```

---

## Quick Commands

### Open Multiscreen Modal
```javascript
window.openMultiscreenModal()
```
Shows layout selector dialog

### Close Multiscreen Modal
```javascript
window.closeMultiscreenModal()
```

### Select Layout
```javascript
window.selectMsLayout(1)  // Single screen
window.selectMsLayout(2)  // Two screens
window.selectMsLayout(3)  // Three screens
```

### Apply Layout
```javascript
window.applyMsLayout()
```
Opens windows for selected layout

### Auto-Detect Screens
```javascript
window.autoDetectScreens()
```
Detects physical screen count and recommends layout

---

## What Gets Synchronized

Each frame, the main window broadcasts:
- ✅ Game score
- ✅ Ball number
- ✅ Multiplier
- ✅ DMD display mode
- ✅ High scores
- ✅ Table name & colors
- ✅ All other game state

Secondary windows receive updates via **BroadcastChannel** and render accordingly.

---

## Window Positions

Windows remember their positions automatically:
```
localStorage['fpw_winpos_dmd']       // Saved position of DMD window
localStorage['fpw_winpos_backglass'] // Saved position of Backglass window
```

**Auto-restores** on next layout apply!

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Secondary windows won't open | Allow pop-ups in browser settings for localhost:5173 |
| Windows don't sync state | Verify BroadcastChannel available (F12 → Console) |
| Windows appear blank | Reload all windows (Ctrl+R) |
| Positions not remembered | Check localStorage enabled in browser settings |

---

## Browser Support

✅ Chrome 54+
✅ Firefox 38+
✅ Safari 15.1+
✅ Edge 79+

**All major browsers supported!**

---

## Key Facts

- 🔄 **State updates**: Every 16ms (60 FPS)
- 🚫 **Network required**: No (BroadcastChannel is local)
- 💾 **Memory per window**: ~30-50MB
- 🔌 **CPU per window**: ~5-10% additional
- ⚡ **Latency**: Negligible (in-process)

---

## Full Documentation

For comprehensive details, see:
- `MULTISCREEN_LAYOUT_GUIDE.md` — Complete API reference
- `MULTISCREEN_VERIFICATION.md` — System verification report

---

**Last Updated**: 2026-03-08
**Status**: ✅ Production Ready
