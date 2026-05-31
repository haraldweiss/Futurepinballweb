# Future Pinball Web — Installer Usage Guide

## Overview

The Future Pinball Web installer (`installer.js`) is a comprehensive cross-platform setup utility that:
- Detects your operating system (Windows, macOS, Linux)
- Validates system requirements (Node.js, npm, RAM, storage, GPU)
- Auto-detects your screen configuration (resolution, rotation, display count)
- Installs missing npm dependencies
- Generates application configuration
- Sets up optimal quality presets based on your hardware

## Quick Start

### Option 1: npm Script (Recommended)

```bash
npm run install:setup
```

This will run the full installer with all checks and setup.

### Option 2: Direct Node Command

```bash
node installer.js
```

### Option 3: Check-Only Mode

```bash
npm run install:check
```

This validates requirements without making any changes.

## What the Installer Does

### 1. System Information Detection

The installer gathers information about your computer:

| Information | Details |
|------------|---------|
| **Operating System** | Windows, macOS, or Linux |
| **Architecture** | x64 (64-bit) or ARM (Apple Silicon) |
| **CPU Cores** | Number of processor cores available |
| **RAM** | Total system memory available |
| **Node.js Version** | Installed version and location |
| **npm Version** | Installed version |

### 2. Requirement Validation

The installer checks that your system meets minimum requirements:

| Requirement | Minimum | Recommended |
|------------|---------|-------------|
| **Node.js** | v18.0.0 | v20+ |
| **npm** | v9.0.0 | v10+ |
| **RAM** | 4 GB | 8 GB+ |
| **Free Disk Space** | 2 GB | 5 GB+ |
| **GPU** | Integrated OK | Dedicated GPU recommended |

#### If Requirements Are Not Met:
- ⚠️ **Warning**: System is below minimum but may still work
- ❌ **Error**: System cannot run the application (installer will stop)

### 3. Screen Detection

The installer auto-detects your display configuration:

- **Single Screen**: Laptop or desktop with one monitor
- **Dual Screen**: Main playfield + backglass panel (arcade setup)
- **Triple Screen**: Arcade cabinet with playfield + backglass + side panels
- **Rotation Detection**: Landscape (standard) or portrait (arcade)
- **Resolution**: Pixel dimensions for optimal quality preset selection

### 4. Dependency Installation

If npm dependencies are missing or outdated, the installer will:
1. Check if `node_modules/` exists
2. Validate installed package versions
3. Run `npm install` if needed
4. Provide progress updates

**Note**: First installation may take 2-5 minutes depending on internet speed.

### 5. Configuration Generation

The installer creates `.fpw-config.json` with:

```json
{
  "system": {
    "os": "darwin",
    "architecture": "arm64",
    "cpuCores": 8,
    "totalMemoryGB": 16,
    "nodeVersion": "20.10.0"
  },
  "display": {
    "screenCount": 2,
    "primaryResolution": {
      "width": 1920,
      "height": 1080
    },
    "rotation": "landscape"
  },
  "qualityPreset": "high",
  "qualitySettings": {
    "shadowMapSize": 2048,
    "bloomEnabled": true,
    "particleCount": 600,
    "volumetricLighting": true,
    "ssaoEnabled": true
  }
}
```

### 6. Quality Preset Selection

Based on detected hardware, the installer recommends:

| Hardware | Preset | Target FPS | Features |
|----------|--------|-----------|----------|
| **Low-End** (4GB RAM, integrated GPU) | `low` | 30-45 | Reduced effects, particle limit |
| **Mid-Range** (8GB RAM, GTX 1050 Ti) | `medium` | 45-60 | Balanced graphics and performance |
| **High-End** (16GB+ RAM, RTX 2060+) | `high` | 60 | Full effects enabled (default) |
| **Ultra** (32GB+ RAM, RTX 3080+) | `ultra` | 60 | Maximum visual quality |

## Output and Logs

### Successful Installation

```
✓ System: macOS (arm64) - 8 cores, 16 GB RAM
✓ Node.js: v20.10.0 (required: v18.0.0+)
✓ npm: v10.2.0 (required: v9.0.0+)
✓ Storage: 127 GB free (required: 2 GB)
✓ GPU: Apple M1 Max detected
✓ Display: 2 screens (1920x1080 + 1440x900)
✓ Dependencies: 3 packages already installed
✓ Configuration: .fpw-config.json generated
✓ Quality Preset: high (RTX2060 or equivalent detected)

Installation complete! Ready to play.
```

### Common Issues

#### Node.js or npm Not Found
```
✗ Node.js not found
  Please install Node.js from https://nodejs.org/
  Then run: npm run install:setup
```

**Solution**: Download and install Node.js from [nodejs.org](https://nodejs.org/)

#### Insufficient Disk Space
```
✗ Less than 2 GB free disk space available
  Game requires ~2 GB: 1.5 GB dependencies, 500 MB cache
```

**Solution**: Free up disk space and try again

#### Old Node.js Version
```
⚠ Node.js v16.10.0 is installed but v18+ recommended
  The application may have reduced performance
  Upgrade: https://nodejs.org/
```

**Solution**: Update Node.js to version 18 or newer

#### GPU Not Detected
```
⚠ GPU could not be auto-detected
  Assuming integrated GPU
  Adjust quality preset manually if needed: setQualityPreset('high')
```

**Solution**: Run the game and manually set quality if needed

## Manual Configuration

### Changing Quality Preset After Installation

Open the game console (Press `Esc` in-game) and run:

```javascript
// Check current preset
getPerformanceMetrics()

// Change preset
setQualityPreset('low')    // Low-end devices
setQualityPreset('medium') // Mid-range systems
setQualityPreset('high')   // High-end systems (default)
setQualityPreset('ultra')  // Maximum quality
```

### Editing Configuration

You can manually edit `.fpw-config.json`:

```bash
nano .fpw-config.json   # macOS/Linux
notepad .fpw-config.json # Windows
```

**Note**: Changes take effect after restarting the game.

## Troubleshooting

### Installer Hangs or Freezes
- Check internet connection (npm install needs network)
- Try killing process and running again: `npm run install:setup`
- Check disk space: `df -h` (macOS/Linux) or `dir` (Windows)

### Screen Detection Not Working
- Multi-monitor detection is best-effort
- You can manually configure in `.fpw-config.json`
- The game works fine with manual settings

### Dependencies Not Installing
```bash
# Force fresh install
rm -rf node_modules
npm run install:setup

# Or manually
npm install
```

### Wrong Quality Preset Selected
```bash
# Check configuration
cat .fpw-config.json

# Edit and update
npm run install:setup
```

## Platform-Specific Notes

### Windows
- Installer requires Administrator prompt for some operations
- GPU detection uses DirectX/WDDM drivers
- Storage check uses `diskpart` command

### macOS
- Requires Terminal.app or shell access
- Apple Silicon (M1/M2/M3) properly detected
- Storage check uses `df` command

### Linux
- Supports Ubuntu, Fedora, Arch, and other distributions
- GPU detection uses `lspci` or `glxinfo` if available
- May need additional dependencies on some distros

## Post-Installation

After successful installation, you can start the game:

```bash
# Start with auto-detected display configuration
npm start

# Or specific display modes
npm run start:1    # Single screen
npm run start:2    # Dual screen (playfield + backglass)
npm run start:3    # Triple screen (arcade cabinet)
```

## Next Steps

1. **Launch the Game**: `npm start`
2. **Browse Tables**: Use the 📁 TABLES tab to select a .fpt or .fp file
3. **Adjust Quality**: Press `P` to open Performance Monitor and adjust preset if needed
4. **Play**: Use arrow keys or spacebar to play, or touch controls on mobile

## Support & Debugging

### Enable Debug Logging
```javascript
// In browser console
(window as any).DEBUG_INSTALLER = true;
(window as any).DEBUG_QUALITY = true;
(window as any).DEBUG_PERFORMANCE = true;
```

### Export Performance Data
```javascript
// Save current metrics
const metrics = getPerformanceMetrics();
console.table(metrics);
// Copy and share for debugging
```

### Check System Capabilities
```javascript
// Verify installed features
console.log({
  graphics: {
    webgl: 'WebGL2' in window,
    canvas: 'HTMLCanvasElement' in window
  },
  audio: window.AudioContext || window.webkitAudioContext ? 'enabled' : 'disabled',
  storage: 'localStorage' in window ? 'enabled' : 'disabled'
});
```

## Version Information

- **Installer Version**: 1.0.0
- **Game Version**: 0.16.0
- **Last Updated**: 2026-03-14
- **Tested Platforms**: Windows 10+, macOS 11+, Ubuntu 20.04+

---

For additional help, see:
- `STARTUP_GUIDE.md` - Display configuration and startup options
- `QUICK_START.md` - Fast setup for experienced users
- `README.md` - General project documentation
