# Future Pinball Web — Startup Scripts

## Overview

This project includes multiple startup scripts for launching the game with **1, 2, or 3 screen configurations**. Choose the method that works best for your platform and use case.

## Quick Start

### Fastest Way (All Platforms)
```bash
npm start              # Auto-detect screens
npm run start:1        # Single screen
npm run start:2        # Dual screen (Playfield + Backglass)
npm run start:3        # Triple screen (Arcade Cabinet)
```

---

## Startup Methods

### 1️⃣ Using npm Scripts (Recommended)

All platforms (macOS, Linux, Windows)

```bash
# Auto-detect screen count (recommended for first launch)
npm start

# Single screen
npm run start:1

# Dual screen (Playfield + Backglass)
npm run start:2

# Triple screen (Full arcade cabinet setup)
npm run start:3
```

**Advantages:**
- ✅ Cross-platform (works on all OS)
- ✅ Automatic browser opening
- ✅ Automatic dev server startup
- ✅ Detailed startup messages

---

### 2️⃣ Using Node.js Script

```bash
# Same as npm scripts, but direct node execution
node start-game.js              # Auto-detect
node start-game.js 1            # Single screen
node start-game.js 2            # Dual screen
node start-game.js 3            # Triple screen

# Custom port
node start-game.js 2 8080       # Dual screen on port 8080
```

**Advantages:**
- ✅ Direct control
- ✅ Custom port support
- ✅ Colored console output

---

### 3️⃣ Using Shell Script (macOS/Linux)

```bash
./start-game.sh              # Auto-detect
./start-game.sh 1            # Single screen
./start-game.sh 2            # Dual screen
./start-game.sh 3            # Triple screen
```

**Advantages:**
- ✅ Native shell execution
- ✅ Port detection with `nc` command
- ✅ Lightweight and fast

**Requirements:**
- Bash shell
- `nc` (netcat) for port checking
- macOS or Linux

---

### 4️⃣ Using Batch Script (Windows)

```batch
start-game.bat              # Auto-detect
start-game.bat 1            # Single screen
start-game.bat 2            # Dual screen
start-game.bat 3            # Triple screen
```

**Advantages:**
- ✅ Native Windows batch script
- ✅ No dependencies
- ✅ Works in Command Prompt

---

### 5️⃣ Manual Dev Server + Browser

```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Open browser (once server is running)
# For single screen
open http://localhost:5174/?screens=1

# For dual screen
open http://localhost:5174/?screens=2&screen=1   # Playfield
open http://localhost:5174/?screens=2&screen=2   # Backglass

# For triple screen
open http://localhost:5174/?screens=3&screen=1   # Left
open http://localhost:5174/?screens=3&screen=2   # Center
open http://localhost:5174/?screens=3&screen=3   # Backglass
```

---

## Screen Configurations

### Single Screen (1 Screen)
```bash
npm run start:1
```
- 🎮 **Best for:** Casual play, laptop, single monitor
- 📱 **Display:** Full playfield + DMD + backglass in one window
- 🎯 **Use case:** Development, testing, casual arcade gaming

### Dual Screen (2 Screens)
```bash
npm run start:2
```
- 🎮 **Best for:** Arcade cabinet with 2 displays
- 📱 **Display 1:** Playfield and game elements
- 📱 **Display 2:** Backglass and information panel
- 🎯 **Use case:** Desktop cabinet, two-monitor setup

### Triple Screen (3 Screens)
```bash
npm run start:3
```
- 🎮 **Best for:** Full arcade cabinet
- 📱 **Display 1:** Left playfield section
- 📱 **Display 2:** Center playfield section
- 📱 **Display 3:** Backglass / DMD / info panel
- 🎯 **Use case:** Authentic arcade cabinet, widescreen setup

---

## Features

### Auto-Detection
When launching with **auto** or **no argument**, the system will:
1. Detect available displays
2. Automatically select appropriate screen configuration
3. Open browser windows for each screen

```bash
npm start       # Auto-detects available screens
```

### Automatic Dev Server
- If the dev server isn't running, scripts will start it automatically
- Waits for server to be ready before opening browsers
- Reuses existing server if already running

### Multi-Window Sync
- Each screen runs in its own browser window
- Windows communicate via **BroadcastChannel API**
- Synchronized game state across all screens
- Perfect for arcade cabinet setups

---

## Controls

### Game Controls
| Key | Action |
|-----|--------|
| **Z** | Left Flipper |
| **M** | Right Flipper |
| **SPACE** | Tilt |
| **ENTER** | Launch Ball |
| **P** | Performance Monitor (FPS/Memory) |
| **1, 2, 3** | Quality Presets (Low/Medium/High/Ultra) |
| **ESC** | Exit / Return to Menu |

### Multi-Screen Controls
| Key | Action |
|-----|--------|
| **2** | Switch to Dual-Screen Layout |
| **3** | Switch to Triple-Screen Layout |
| **Shift+M** | Open Multiscreen Modal |

---

## Troubleshooting

### Server Won't Start
```bash
# Check if port is in use
lsof -i :5174          # macOS/Linux
netstat -ano | find ":5174"  # Windows

# Kill existing process
kill -9 <PID>          # macOS/Linux
taskkill /PID <PID> /F   # Windows

# Try different port
npm start -- start-game.js 1 8080
```

### Browser Won't Open
- Manually open `http://localhost:5174/?screens=1` in your browser
- Check firewall settings
- Ensure default browser is configured

### Windows Not Syncing
- Verify all windows are on the **same domain** (localhost:5174)
- Check browser console for BroadcastChannel errors
- All windows must be same-origin (same protocol, domain, port)

### Performance Issues
- Use quality presets: Press **1** (Low), **2** (Medium), **3** (High)
- Reduce screen count if running on weak hardware
- Close other applications
- Check Performance Monitor with **P** key

---

## Advanced Usage

### Custom Port
```bash
node start-game.js 2 8080      # Dual screen on port 8080
```

### Environment Variables
```bash
# On macOS/Linux
PORT=8080 npm start

# On Windows (Command Prompt)
set PORT=8080 && npm start

# On Windows (PowerShell)
$env:PORT=8080; npm start
```

### Programmatic Usage
```javascript
// In your own scripts
import('./start-game.js');  // Runs with default args
```

---

## Cabinet Setup Guide

### For 2-Screen Cabinet
1. Connect two monitors (primary + secondary)
2. Start with: `npm run start:2`
3. Window 1: Full-screen on primary monitor (playfield)
4. Window 2: Full-screen on secondary monitor (backglass)
5. Both windows share game state via BroadcastChannel

### For 3-Screen Cabinet
1. Connect three monitors (left, center, right + backglass monitor above)
2. Start with: `npm run start:3`
3. Window 1: Full-screen on left monitor
4. Window 2: Full-screen on center monitor
5. Window 3: Full-screen on top monitor (backglass)

### Positioning Tips
```bash
# Windows will remember positions from previous launches
# Position is saved in localStorage under "fpw_winpos_[role]"

# To reset window positions, clear localStorage:
# Open Developer Tools (F12) → Console →
# localStorage.clear()
```

---

## Recommended Setups

### Laptop Gaming
```bash
npm run start:1
```
Single window, optimal for 13-16" displays

### Desktop Gaming
```bash
npm run start:auto
```
Auto-detect available monitors, good flexibility

### Home Arcade (2 screens)
```bash
npm run start:2
```
Playfield monitor + backglass monitor above

### Full Cabinet (3+ screens)
```bash
npm run start:3
```
Professional arcade cabinet setup

---

## System Requirements

| Requirement | Details |
|---|---|
| **Node.js** | v14+ (for npm scripts) |
| **npm** | v6+ |
| **Browser** | Chrome/Firefox/Safari (support for ES6 modules) |
| **RAM** | 2GB minimum (4GB+ recommended for 3-screen) |
| **CPU** | Dual-core minimum |
| **Network** | Localhost access (127.0.0.1) |

---

## Script Files

| File | Platform | Type | Usage |
|------|----------|------|-------|
| `start-game.js` | All | Node.js | `npm start` or `node start-game.js` |
| `start-game.sh` | macOS/Linux | Bash | `./start-game.sh` |
| `start-game.bat` | Windows | Batch | `start-game.bat` |

---

## Development

### Building Production
```bash
npm run build       # Create optimized dist/
npm run preview     # Preview production build
```

### Testing Different Screens
```bash
npm run start:1     # Test single screen mode
npm run start:2     # Test dual screen mode
npm run start:3     # Test triple screen mode
```

### Performance Testing
- Launch with `npm start`
- Press **P** to show performance monitor
- Check FPS, memory usage, draw calls
- Use quality presets to optimize

---

## FAQ

**Q: Can I use this in production?**
A: Yes! Build with `npm run build`, then serve from a server. Scripts are for development launch.

**Q: How do I make the app fullscreen?**
A: Press **F11** in each browser window for fullscreen mode.

**Q: Can I resize the windows?**
A: Yes, windows are resizable. Position is saved automatically.

**Q: Do I need Electron for multiscreen?**
A: No, it works with standard browsers. Electron is optional for desktop app distribution.

**Q: What about mobile/tablet?**
A: Single-screen mode works on mobile. Multiscreen requires desktop browsers.

---

## Support

For issues with startup scripts:
1. Check `/tmp/fpw-dev.log` (macOS/Linux)
2. Review browser console (F12)
3. Try `npm run dev` manually to check errors
4. Ensure port 5174 is available

---

**Happy Pinball! 🎮🎰**
