# 🎮 Future Pinball Web — Quick Start

## Fastest Launch (30 seconds)

```bash
npm start              # Auto-detects screen count and launches
```

That's it! The game will:
1. ✅ Start the dev server
2. ✅ Detect available screens
3. ✅ Open game in your browser(s)
4. ✅ Be ready to play

---

## Choose Your Screen Setup

### 1️⃣ Single Screen (Laptop/Desktop)
```bash
npm run start:1
```
🎮 One window with everything (playfield + DMD + backglass)

### 2️⃣ Dual Screen (Home Arcade)
```bash
npm run start:2
```
🎮 Two windows: Playfield + Backglass
- Perfect for dual-monitor setups

### 3️⃣ Triple Screen (Full Cabinet)
```bash
npm run start:3
```
🎮 Three windows: Left + Center + Backglass
- Professional arcade cabinet setup

---

## Game Controls

| Key | Action |
|-----|--------|
| **Z** / **M** | Left / Right Flipper |
| **ENTER** | Launch Ball |
| **SPACE** | Tilt |
| **P** | Performance Monitor |
| **1/2/3** | Quality Presets |
| **ESC** | Exit |

---

## What Each Script Does

All scripts follow this workflow:

```
Check if server running?
    ↓
No → Start server, wait for ready
    ↓
Open browser window(s) with game
    ↓
Display helpful hints & controls
```

### npm Scripts (Recommended)
- Cross-platform (Windows, macOS, Linux)
- Automatic browser opening
- Best for beginners

### Node.js Script
```bash
node start-game.js [1|2|3|auto] [port]
```
- Direct control
- Custom port support
- Useful for automation

### Shell Script (macOS/Linux)
```bash
./start-game.sh [1|2|3|auto] [port]
```
- Native execution
- Minimal dependencies

### Batch Script (Windows)
```batch
start-game.bat [1|2|3|auto]
```
- Pure batch execution
- No external dependencies

---

## Troubleshooting

### Server already running?
Script detects existing server and reuses it

### Browser won't open?
Manually visit: `http://localhost:5174`

### Port in use?
```bash
# Use different port
node start-game.js 1 8080
```

### Want to stop the server?
Press `Ctrl+C` in the terminal

---

## Next Steps

- 📖 Read **STARTUP_GUIDE.md** for detailed options
- 🎯 See **MULTISCREEN_QUICK_REFERENCE.md** for cabinet setups
- 💻 Run `npm run dev` for development mode
- 📦 Run `npm run build` to create production build

---

## Platform-Specific Commands

### macOS
```bash
npm start                # Or use Zsh
./start-game.sh 2        # Shell script
```

### Linux
```bash
npm start
./start-game.sh 3        # Shell script
```

### Windows
```bash
npm start                # Recommended
start-game.bat 1         # Or batch script
```

---

**Ready to play? Run `npm start` now! 🚀**
