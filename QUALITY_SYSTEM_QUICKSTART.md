# Quality System Quick-Start Guide

## What's New?

Future Pinball Web now includes an **Adaptive Quality System** that automatically adjusts graphics settings based on your device's performance. You can also manually control quality and monitor real-time performance metrics.

---

## Playing the Game

### Automatic Mode (Recommended)
The game automatically detects your device and selects an appropriate quality level:
- **Desktop computers** → High quality (60 FPS)
- **Tablets** → Medium quality (50+ FPS)
- **Smartphones** → Balanced quality (30–50 FPS, auto-optimizes)

**You don't need to do anything!** Just play and enjoy. The system adjusts in the background.

### Keyboard Controls
| Key | Action |
|-----|--------|
| **P** | Toggle performance monitor (FPS display) |
| **Shift+Left** | Left flipper |
| **Shift+Right** | Right flipper |
| **Space** | Plunger / Launch ball |
| **Left/Right Arrow** | Nudge table |

---

## Console Commands (Developer / Power Users)

Open your browser's **Developer Console** (Press `F12` → "Console" tab) to use these commands:

### Check Current Settings

```javascript
// View current quality preset
getQualityPreset()
// Output: { name: 'high', label: 'High (Quality)', ... }

// View available presets
getAvailableQualityPresets()
// Output: ['low', 'medium', 'high', 'ultra']

// View real-time performance metrics
getPerformanceMetrics()
// Output: { fps: 58, frameTime: 17.2, memoryUsed: 62, drawCalls: 245, ... }
```

### Change Quality Level

```javascript
// Switch to a specific preset
setQualityPreset('low')      // For older phones
setQualityPreset('medium')   // For tablets
setQualityPreset('high')     // For modern desktops
setQualityPreset('ultra')    // For gaming PCs
```

### Enable/Disable Auto-Adjustment

```javascript
// Toggle automatic quality adjustment
toggleAutoQuality()

// Output if auto-adjustment was OFF:
// 🎯 Auto-quality adjustment: ON

// The system will now:
// - Lower quality if FPS drops below 45
// - Raise quality if FPS stays above 55
```

### Monitor Performance

```javascript
// Toggle the FPS display
togglePerformanceMonitor()

// This shows FPS metrics in the console every 2 seconds
// 📊 FPS: 58 (17.2ms) | Mem: 62/256MB | Draw: 245 | Tri: 15.6M
```

---

## Quality Presets Explained

### Low (Performance)
**Best for**: Old smartphones, slow networks, extreme battery saving
- Older phones, budget devices
- No shadows
- Simple materials
- 50 particles max
- Lower resolution DMD
- 30 FPS target

### Medium (Balanced) ← **Recommended for Tablets**
**Best for**: Tablets, modern phones
- iPad, Galaxy Tab, iPhone 12+
- Shadows enabled
- Good materials & lighting
- 150 particles
- Standard DMD resolution
- 50 FPS target

### High (Quality) ← **Recommended for Desktop**
**Best for**: Desktop computers, modern browsers
- Laptops, desktops
- High-quality shadows (2048×2048)
- Advanced lighting
- 300 particles
- High-res DMD (256×64)
- 3D backglass
- 60 FPS target

### Ultra (Maximum)
**Best for**: High-end gaming computers
- Gaming PC with RTX/RTX 4090
- All features enabled
- Depth of field (cinematic blur)
- 500 particles
- Maximum detail
- 60 FPS target

---

## Troubleshooting

### "Game is running slowly (FPS is 30–40)"

**Option 1: Wait (Recommended)**
- Auto-adjustment will lower quality automatically
- Game will stabilize at higher FPS
- No action needed!

**Option 2: Manual Adjustment**
```javascript
setQualityPreset('medium')  // Try medium first
```

### "I want maximum graphics on my gaming PC"

```javascript
setQualityPreset('ultra')
```

### "I want to see the FPS counter"

```javascript
togglePerformanceMonitor()
```

This displays live FPS in the console every 2 seconds.

### "Auto-adjustment keeps changing quality"

If quality keeps bouncing between presets:

```javascript
toggleAutoQuality()  // Disable auto-adjustment
setQualityPreset('medium')  // Manually select
```

Then try a different preset until you find one that's stable.

### "The game looks worse than before"

Try enabling higher quality:

```javascript
setQualityPreset('high')
// Wait a few seconds for the game to update
```

---

## Performance Tips

### Desktop Users
- Keep browser updated (better GPU drivers)
- Close other tabs to free up resources
- Use Chrome/Chromium for best performance

### Mobile Users
- Close background apps before playing
- Disable animations in browser settings
- Avoid portrait mode (landscape plays better)
- Use Wi-Fi instead of mobile data

### Tablet Users
- Keep enough free disk space (>1GB)
- Avoid battery saver mode while playing
- Use landscape orientation
- Close heavy apps

---

## What Changed Visually?

### Before vs. After

| Feature | Before | After |
|---------|--------|-------|
| **Ball** | Flat white sphere | Reflective with glow |
| **Bumpers** | Basic cylinders | Detailed with chrome rims |
| **Shadows** | Flat black | Realistic, detailed shadows |
| **DMD (Score Display)** | Simple dots | Glowing LEDs with halos |
| **Backglass** | Hidden or 2D | Full 3D with artwork |
| **Lighting** | Basic 2 lights | 3 lights + dynamic effects |
| **Color Range** | Limited | Full RGB with bloom |

### Quality Levels Visually

- **Low**: No shadows, simple colors, basic effects
- **Medium**: Subtle shadows, good lighting, standard DMD
- **High**: Detailed shadows, realistic materials, glow effects, HD DMD
- **Ultra**: Maximum detail, depth effects, best quality materials

---

## FAQ

**Q: Will auto-adjustment affect my gameplay?**
A: No. Quality changes are smooth and won't interrupt gameplay. You won't notice the transitions.

**Q: Can I save my quality preference?**
A: Yes! The game remembers your last selected preset and auto-adjustment setting.

**Q: Does lower quality mean slower gameplay?**
A: No. Physics and gameplay speed are identical. Only graphics change.

**Q: Why does my old phone get "Low" preset?**
A: The device auto-detection considers CPU, GPU, and screen resolution. Lower presets are optimized for older hardware.

**Q: Can I disable the FPS counter?**
A: Yes, press `P` to toggle it.

**Q: What's the difference between "standard" and "high-res" DMD?**
A: Standard is 128×32 (classic pinball), High-res is 256×64 (sharper/more detailed).

**Q: Is the 3D backglass always shown?**
A: On desktop: Yes. On mobile/tablet: Only in High+ quality. You can disable it in quality settings.

**Q: Why am I only getting 30 FPS on my phone?**
A: Modern games are demanding! Try `setQualityPreset('low')` for 40+ FPS.

---

## Advanced Console Tricks

### Monitor FPS Over Time
```javascript
// Log FPS every second
setInterval(() => {
  const m = getPerformanceMetrics();
  console.log(`FPS: ${m.fps} | Draw: ${m.drawCalls}`);
}, 1000);
```

### Test All Presets
```javascript
// Switch presets every 5 seconds
['low', 'medium', 'high', 'ultra'].forEach((preset, i) => {
  setTimeout(() => setQualityPreset(preset), i * 5000);
});
```

### Benchmark Comparison
```javascript
// Save baseline
const baseline = getPerformanceMetrics();

// Change preset
setQualityPreset('ultra');

// Check difference after 2 seconds
setTimeout(() => {
  const after = getPerformanceMetrics();
  console.log(`FPS difference: ${after.fps - baseline.fps}`);
}, 2000);
```

---

## Need More Help?

- Check the browser console for error messages (F12)
- Try reloading the page
- Clear cache/cookies and refresh
- Try a different browser if available
- Check your internet connection

---

## Summary

✅ **Game auto-optimizes** based on your device
✅ **You can manually adjust** quality anytime
✅ **Performance is monitored** in real-time
✅ **Settings are saved** between sessions
✅ **Zero gameplay impact** — only graphics change

**Just press P for FPS, use console commands to adjust, and enjoy!**

---

**Last Updated**: March 6, 2026
**Quality System Version**: 1.0 (Production Ready)
