# 🎮 Future Pinball Web

**Modern cross-platform browser-based 3D pinball game with VPX-competitive graphics and physics**

![Version](https://img.shields.io/badge/Version-0.16.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)

---

## 📥 Installation & Download

### 🌐 Web Version (PWA) — No Installation Needed

**→ [Play in Browser](https://your-domain.com)** (recommended for first-time users)

Click "📥 Install App" to add to your home screen, then play offline!

**Features:**
- ✅ Play instantly, no download needed
- ✅ Works offline with Service Worker
- ✅ Auto-updates in background
- ✅ Installable on all devices (Windows, macOS, Linux, iOS, Android)
- ✅ Responsive design (desktop, tablet, mobile)

---

### 🖥️ Desktop Applications

**Windows**
- **[Download Installer](https://github.com/YOUR_USERNAME/future-pinball-web/releases/download/v0.16.0/Future%20Pinball%20Web%20Setup%200.16.0.exe)** (180 MB)
  - Recommended: Auto-updates, Start menu shortcuts
  - Run installer → Follow wizard → Done!

- **[Download Portable](https://github.com/YOUR_USERNAME/future-pinball-web/releases/download/v0.16.0/Future%20Pinball%20Web%200.16.0.exe)** (160 MB)
  - No installation, run anywhere
  - Perfect for USB drives

**macOS**
- **[Download DMG](https://github.com/YOUR_USERNAME/future-pinball-web/releases/download/v0.16.0/Future%20Pinball%20Web-0.16.0.dmg)** (200 MB)
  - Native M1/M2 support
  - Drag to Applications → Done!

**Linux**
- **[Download AppImage](https://github.com/YOUR_USERNAME/future-pinball-web/releases/download/v0.16.0/future-pinball-web-0.16.0.AppImage)** (170 MB)
  - `chmod +x future-pinball-web-*.AppImage && ./future-pinball-web-*.AppImage`

- **[Download DEB](https://github.com/YOUR_USERNAME/future-pinball-web/releases/download/v0.16.0/future-pinball-web_0.16.0_amd64.deb)** (160 MB)
  - `sudo apt install ./future-pinball-web_0.16.0_amd64.deb`

---

## 🎮 Features

### Core Gameplay
- **6 Themed Demo Tables**
  - 🏺 Pharaoh's Gold — Ancient Egyptian theme
  - 🐉 Dragon's Castle — Dark fantasy with dragons
  - ⚔️ Knight's Quest — Medieval adventure
  - 🤖 Cyber Nexus — Sci-fi cyberpunk
  - 🌃 Neon City — Urban nightlife
  - 🌿 Jungle Expedition — Adventure jungle

### Graphics & Physics
- **VPX-Competitive Visuals**
  - Screen-Space Ambient Occlusion (SSAO)
  - Physically-Based Rendering (PBR)
  - Advanced lighting & shadows
  - Particle effects & post-processing
  - ACES tone mapping

- **Advanced Physics**
  - Rapier2D 2D physics engine
  - Continuous Collision Detection (CCD)
  - Adaptive substeps (3-5 based on FPS)
  - ~95% Newton-compatible

### Game Mechanics
- **Scoring System**
  - Bumpers (100x), Targets (150x), Slingshots (300x)
  - Ramps, Rollovers, End-of-Ball Bonus

- **Advanced Features**
  - Multiball mode (10 bumper hits)
  - Ball Save (3.5 seconds)
  - Multiplier progression
  - Progressive targets & kickbacks
  - Combo system with visual feedback

### Customization
- **Integrated Table Editor**
  - 🎨 Playfield Editor — Position bumpers, targets, ramps
  - 🖼️ Backglass Editor — Customize cabinet appearance
  - 🔲 DMD Editor — Customize LED display colors & effects
  - 🎬 Video Manager — Add videos for game events

### Display Modes
- **DMD (Dot Matrix Display)**
  - 128×32 authentic LED display
  - Attract, Playing, Event, Game Over modes
  - Top-5 highscores

- **Multi-Screen Support**
  - Single screen, 2-screen, 3-screen layouts
  - Separate backglass & DMD windows
  - Cross-browser synchronization

### Audio & Video
- **Advanced Audio System**
  - Web Audio synthesizer
  - Layered sound mixing
  - Ambience system
  - Table-specific sounds

- **Event-Driven Video System**
  - 28+ game events with video triggers
  - Auto-Update notifications
  - Priority-based playback
  - Offline caching

---

## 🚀 Quick Start

### Users
1. **Web**: Visit URL and click "📥 Install App"
2. **Windows**: Download .exe and run
3. **macOS**: Download .dmg, drag to Applications
4. **Linux**: Download AppImage or DEB

### Developers
```bash
# Install dependencies
npm install

# Development with hot-reload
npm run dev

# Build for production
npm run build

# Build desktop apps (requires Electron)
npm install -D electron electron-builder electron-is-dev electron-updater
npm run electron-build

# Run desktop app in development
npm run electron-dev
```

---

## 📚 Documentation

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** — Complete deployment guide for all platforms
- **[DESKTOP_APP_QUICKSTART.md](./DESKTOP_APP_QUICKSTART.md)** — 5-minute quick start for desktop apps
- **[PWA_ELECTRON_IMPLEMENTATION_COMPLETE.md](./PWA_ELECTRON_IMPLEMENTATION_COMPLETE.md)** — Technical implementation details
- **[VIDEO_EDITOR_UI_IMPLEMENTATION.md](./VIDEO_EDITOR_UI_IMPLEMENTATION.md)** — Video editor documentation
- **[VIDEO_EDITOR_QUICK_START.md](./VIDEO_EDITOR_QUICK_START.md)** — Video editor quick start
- **[VIDEO_CREATION_WORKFLOW.md](./VIDEO_CREATION_WORKFLOW.md)** — How to create videos for tables

---

## 🏗️ Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Rendering | Three.js | 0.162 |
| Physics | Rapier2D | 0.12 |
| Build Tool | Vite | 7.3 |
| Language | TypeScript | 5.4 |
| Desktop | Electron | Latest |
| Audio | Web Audio API | Native |
| PWA | Service Worker | Native |

---

## 💻 System Requirements

### Web (Browser)
- **Desktop**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Android, Firefox Android
- **Internet**: First load ~10 MB, then offline

### Desktop Apps
- **Windows**: Windows 7+, 180-200 MB RAM
- **macOS**: macOS 10.13+, 200-250 MB RAM (M1/M2 native)
- **Linux**: 170-250 MB RAM, glibc 2.29+

---

## 🎯 Deployment Options

### Option 1: Web (PWA) ⭐
```bash
npm run build
# Deploy dist/ to any web server
# Users install from browser
```
**Cost**: $0 (GitHub Pages free)
**Time**: Instant

### Option 2: Desktop Apps
```bash
npm install -D electron electron-builder electron-is-dev electron-updater
npm run electron-build
# Installers in release/ folder
```
**Cost**: $0-400 (code signing optional)
**Time**: ~30 minutes

### Option 3: Automated Releases (GitHub Actions)
```bash
git tag v0.16.1
git push origin v0.16.1
# GitHub Actions builds all platforms automatically
```
**Cost**: $0
**Time**: 10-15 minutes (automatic)

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

---

## 🔧 Development

### Project Structure
```
src/
├── main.ts                      # Game entry point
├── table.ts                     # Table builder
├── game.ts                      # Game state machine
├── physics/                     # Physics systems
├── video-manager.ts             # Video playback system
├── integrated-editor.ts         # Table editor
├── backglass.ts                 # Backglass renderer
├── dmd.ts                       # LED display
└── [other modules]

public/
├── manifest.json                # PWA manifest
├── sw.js                        # Service Worker
├── pwa.js                       # PWA manager
└── icons/                       # App icons

.github/workflows/
└── build-release.yml            # CI/CD pipeline
```

### Build Status
- **Modules**: 78
- **Build Time**: ~1.1 seconds
- **TypeScript Errors**: 0
- **Code Size**: ~28,000 lines
- **VBScript Functions**: 179+

### Performance
| Metric | Desktop | Mobile |
|--------|---------|--------|
| FPS | 60 | 50-60 |
| Memory | 280-350 MB | 150-200 MB |
| Bundle | ~850 KB gz | ~850 KB gz |

---

## 🎨 Customization

### Edit Table Configuration
Edit `src/types.ts` to customize:
- Table colors and appearance
- Bumper positions and properties
- Ramp configurations
- Backglass settings
- DMD display settings
- Video event bindings

### Add Custom Videos
See [VIDEO_EDITOR_QUICK_START.md](./VIDEO_EDITOR_QUICK_START.md):
1. Open integrated editor
2. Click "🎬 Videos" tab
3. Upload videos or use templates
4. Configure event bindings
5. Click "Apply & Save"

### Create New Tables
Use the integrated editor:
1. Select table in startup
2. Click "Editor" button
3. Edit playfield, backglass, DMD
4. Test in preview
5. Apply changes

---

## 🐛 Troubleshooting

### Common Issues

**Web app won't load**
- Clear browser cache (Ctrl+Shift+Delete)
- Check browser console (F12)
- Ensure modern browser (Chrome 90+)

**Desktop app won't start**
- Check system requirements
- Try portable version instead of installer
- Reinstall application

**Videos not playing**
- Check video file format (MP4 recommended)
- Verify video exists at URL path
- Check browser console for errors

**Performance issues**
- Reduce video quality/bitrate
- Lower quality preset in settings
- Close other applications
- Check GPU acceleration enabled

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed troubleshooting.

---

## 📊 Project Statistics

- **Total Source Code**: ~28,000 lines
- **TypeScript Files**: 50+
- **VBScript Functions**: 179+
- **Build Modules**: 78
- **Supported Tables**: 6 demo tables
- **Game Events**: 28+
- **Development Time**: Multiple phases

---

## 🤝 Contributing

### Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build and test
npm run build
npm run preview
```

### Code Guidelines
- Use TypeScript for type safety
- Follow existing code style
- Add comments for complex logic
- Test changes before commit
- Update documentation

---

## 📝 License

MIT License - See LICENSE file for details

---

## 🙋 Support & Feedback

### Getting Help
- Check documentation files above
- Review GitHub Issues
- Check console for error messages (F12)

### Reporting Bugs
1. Open GitHub Issue
2. Describe the problem
3. Include browser/OS version
4. Provide error message from console

### Suggesting Features
1. Check GitHub Issues
2. Discuss in Discussions tab
3. Provide use case and rationale

---

## 🎉 What's New in v0.16.0

### Major Features
- ✨ Progressive Web App (PWA) support
- 🖥️ Electron desktop apps (Windows, macOS, Linux)
- 🎬 Event-driven video system
- 📝 Video editor UI in integrated editor
- 🔄 Auto-update system for both PWA & Electron
- ⚙️ GitHub Actions CI/CD pipeline

### Improvements
- 📊 Enhanced playfield visuals (SSAO, PBR)
- 🎨 Backglass customization
- 🔲 DMD editor & customization
- 🎯 Extended video event types (28 total)
- 📱 Responsive PWA design
- 🚀 Optimized build process

### Deployment
- 🌐 Deploy to any web server (PWA)
- 📦 Native installers for all platforms
- 🤖 Automated releases via GitHub Actions
- 📥 One-click installation for users
- 🔄 Transparent auto-updates

---

## 🔗 Links

- **GitHub**: [future-pinball-web](https://github.com/YOUR_USERNAME/future-pinball-web)
- **Releases**: [Download Latest](https://github.com/YOUR_USERNAME/future-pinball-web/releases)
- **PWA Web**: [Play Online](https://your-domain.com)

---

## 👥 Credits

**Future Pinball Web** is a modern implementation of the classic Future Pinball concept, featuring:
- Original VPX-inspired graphics
- Web/Electron hybrid deployment
- Community-driven development
- Open source contribution

---

**Made with ❤️ by Future Pinball Contributors**

Last Updated: March 2026 | Version 0.16.0
