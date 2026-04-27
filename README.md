# 🎮 Future Pinball Web

**Modern cross-platform 3D pinball game in your browser — with VPX-competitive graphics, advanced physics, multi-screen arcade cabinet support, and comprehensive video editing**

![Version](https://img.shields.io/badge/Version-0.20.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![Modules](https://img.shields.io/badge/Modules-60-orange)
![Code](https://img.shields.io/badge/Code-27.8K%20Lines-purple)
![Tests](https://img.shields.io/badge/Tests-582%20passing-success)
![Parser](https://img.shields.io/badge/Enhanced_FPT_Parser-v1.0-success)

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
- **[Download Installer](https://github.com/haraldweiss/Futurepinballweb/releases)** (180 MB)
  - Recommended: Auto-updates, Start menu shortcuts
  - Run installer → Follow wizard → Done!

- **[Download Portable](https://github.com/haraldweiss/Futurepinballweb/releases)** (160 MB)
  - No installation, run anywhere
  - Perfect for USB drives

**macOS**
- **[Download DMG](https://github.com/haraldweiss/Futurepinballweb/releases)** (200 MB)
  - Native M1/M2 support
  - Drag to Applications → Done!

**Linux**
- **[Download AppImage](https://github.com/haraldweiss/Futurepinballweb/releases)** (170 MB)
  - `chmod +x future-pinball-web-*.AppImage && ./future-pinball-web-*.AppImage`

- **[Download DEB](https://github.com/haraldweiss/Futurepinballweb/releases)** (160 MB)
  - `sudo apt install ./future-pinball-web_*.deb`

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
- **VPX-Competitive Visuals** 🎨
  - 🆕 **Volumetric lighting** with quality-based intensity scaling
  - 🆕 **Cascaded shadow mapping** for detailed real-time shadows
  - 🆕 **Depth of Field (DOF)** with dynamic focus
  - 🆕 **Film effects** — Chromatic aberration, vignette, grain
  - 🆕 **Advanced particle system** with custom emitters
  - 🆕 **Per-light bloom** for dramatic lighting
  - 🆕 **Motion blur** for dynamic scenes
  - Screen-Space Ambient Occlusion (SSAO)
  - Physically-Based Rendering (PBR)
  - Advanced lighting & shadows
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

### Display Modes & Multi-Screen Features
- **DMD (Dot Matrix Display)**
  - 128×32 authentic LED display
  - Attract, Playing, Event, Game Over modes
  - Top-5 highscores
  - 🆕 **Drag-to-resize with corner handles** — Custom sizing per screen
  - 🆕 **Responsive scaling** — Auto-adjusts to screen size
  - 🆕 **Persistent custom sizes** — Saved per screen in localStorage

- **Multi-Screen & Cabinet Support** 🆕
  - Single screen, 2-screen, 3-screen layouts
  - 🆕 **Flexible role assignment** — Assign playfield, backglass, or DMD to any screen
  - 🆕 **Per-screen resolution configuration** — Customize resolution for each screen
  - 🆕 **Cabinet rotation modes** — Vertical, Horizontal, Wide, Inverted (0°/90°/180°/270°)
  - 🆕 **Auto-detection system** — Detects screen count and orientation on startup
  - 🆕 **Cross-window synchronization** — Real-time state sync via BroadcastChannel
  - 🆕 **Startup scripts** — Auto-launch on Windows (.bat), macOS (.sh), Linux (.sh)

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
# One-shot setup: detects OS, GPU, screens, picks a quality preset,
# writes .fpw-config.json that the runtime reads on boot
npm run install:setup           # or `node installer.js`
npm run install:check           # detection only, no install

# Development with hot-reload (port 5173)
npm run dev

# Cross-platform launcher: starts dev server if needed, opens browser
npm start                       # auto-detect screen layout
npm run start:1                 # single-screen
npm run start:2                 # dual-screen (playfield + backglass)
npm run start:3                 # triple-screen (cabinet)

# Build for production
npm run build

# Production server with strict CSP + security headers (zero deps,
# Node built-ins only). Serves dist/ on PORT or 3000.
npm run serve

# Tests (582 passing, vitest)
npm run test:run

# Security checks (eslint security plugin + audit + custom XSS tests)
npm run security:check

# Build desktop apps (Electron toolchain pinned in package.json)
npm run electron-build          # current platform
npm run electron-win            # Windows installer + portable
npm run electron-mac            # macOS dmg + zip
npm run electron-linux          # AppImage + deb

# Run desktop app in development
npm run electron-dev
```

**Debug logging:** add `?debug=1` to the URL or run
`localStorage.setItem('fpw.debug','1')` in DevTools to enable verbose
logs — silent by default in production.

---

## ⚡ Quick Reference

### For Users 👥
| Want | Link |
|------|------|
| 🚀 Get started in 5 mins | [QUICK_START.md](./QUICK_START.md) |
| 🎮 Setup arcade cabinet (3 screens) | [MULTISCREEN_QUICK_REFERENCE.md](./MULTISCREEN_QUICK_REFERENCE.md) |
| 🎬 Create & add videos | [VIDEO_EDITOR_QUICK_START.md](./VIDEO_EDITOR_QUICK_START.md) |
| 💻 Setup desktop app | [DESKTOP_APP_QUICKSTART.md](./DESKTOP_APP_QUICKSTART.md) |
| 🐛 Troubleshooting | [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) |

### For Developers 👨‍💻
| Want | Link |
|------|------|
| 📖 Architecture overview | [CODE_QUALITY_ARCHITECTURE_DIAGRAM.md](./CODE_QUALITY_ARCHITECTURE_DIAGRAM.md) |
| 🔬 Video system internals | [EVENT_DRIVEN_VIDEO_SYSTEM.md](./EVENT_DRIVEN_VIDEO_SYSTEM.md) |
| ⚙️ Multi-screen deep dive | [MULTISCREEN_LAYOUT_GUIDE.md](./MULTISCREEN_LAYOUT_GUIDE.md) |
| 🎨 Graphics pipeline | [PHASE16_VISUAL_ENHANCEMENTS_SUMMARY.md](./PHASE16_VISUAL_ENHANCEMENTS_SUMMARY.md) |
| 📊 Performance analysis | [EFFICIENCY_REVIEW_EXECUTIVE_SUMMARY.md](./EFFICIENCY_REVIEW_EXECUTIVE_SUMMARY.md) |

---

## 📚 Documentation

### Getting Started 🚀
- **[QUICK_START.md](./QUICK_START.md)** — 5-minute setup guide
- **[STARTUP_GUIDE.md](./STARTUP_GUIDE.md)** — Multi-screen startup & auto-detection
- **[DESKTOP_APP_QUICKSTART.md](./DESKTOP_APP_QUICKSTART.md)** — Desktop app quick start

### Features & Configuration ⚙️
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** — Complete deployment for all platforms
- **[MULTISCREEN_QUICK_REFERENCE.md](./MULTISCREEN_QUICK_REFERENCE.md)** — Quick reference for multi-screen setup
- **[MULTISCREEN_LAYOUT_GUIDE.md](./MULTISCREEN_LAYOUT_GUIDE.md)** — Comprehensive multi-screen guide
- **[MULTISCREEN_VERIFICATION.md](./MULTISCREEN_VERIFICATION.md)** — Testing & troubleshooting multi-screen
- **[VIDEO_EDITOR_QUICK_START.md](./VIDEO_EDITOR_QUICK_START.md)** — Video editor quick start
- **[VIDEO_CONFIGURATION_GUIDE.md](./VIDEO_CONFIGURATION_GUIDE.md)** — Video configuration reference

### Technical Deep Dives 🔬
- **[ENHANCED_FPT_PARSER.md](./ENHANCED_FPT_PARSER.md)** — ✨ **NEW** Complete FPT parsing system based on fp-dump/fp-grab
  - 10 implementation phases with 3,972 lines of code
  - Multi-strategy extraction (gravity, elements, lights, physics, materials, scripts)
  - 90%+ physics accuracy vs 40-50% with heuristics
  - Full module reference and integration guide
- **[PWA_ELECTRON_IMPLEMENTATION_COMPLETE.md](./PWA_ELECTRON_IMPLEMENTATION_COMPLETE.md)** — PWA & Electron architecture
- **[VIDEO_EDITOR_UI_IMPLEMENTATION.md](./VIDEO_EDITOR_UI_IMPLEMENTATION.md)** — Video editor UI internals
- **[VIDEO_CREATION_WORKFLOW.md](./VIDEO_CREATION_WORKFLOW.md)** — Video creation workflow
- **[EVENT_DRIVEN_VIDEO_SYSTEM.md](./EVENT_DRIVEN_VIDEO_SYSTEM.md)** — Event-driven video binding system
- **[INTEGRATED_EDITOR_IMPLEMENTATION.md](./INTEGRATED_EDITOR_IMPLEMENTATION.md)** — Table editor architecture

### Quality & Performance 📊
- **[CODE_QUALITY_EXECUTIVE_SUMMARY.md](./CODE_QUALITY_EXECUTIVE_SUMMARY.md)** — Code quality overview
- **[CODE_QUALITY_REVIEW_INDEX.md](./CODE_QUALITY_REVIEW_INDEX.md)** — Code review documentation
- **[EFFICIENCY_REVIEW_EXECUTIVE_SUMMARY.md](./EFFICIENCY_REVIEW_EXECUTIVE_SUMMARY.md)** — Performance analysis
- **[PHASE16_VISUAL_ENHANCEMENTS_SUMMARY.md](./PHASE16_VISUAL_ENHANCEMENTS_SUMMARY.md)** — Graphics phase details
- **[PHASE17_VIDEO_SYSTEM_SUMMARY.md](./PHASE17_VIDEO_SYSTEM_SUMMARY.md)** — Video system phase details
- **[PLAYFIELD_VISUAL_ENHANCEMENTS.md](./PLAYFIELD_VISUAL_ENHANCEMENTS.md)** — Playfield visual details

### Production & Deployment 🚀
- **[PRODUCTION_DEPLOYMENT.md](./PRODUCTION_DEPLOYMENT.md)** — Production deployment checklist
- **[FPT_DRAGDROP_SUPPORT.md](./FPT_DRAGDROP_SUPPORT.md)** — Drag & drop FPT table loading

---

## 🏗️ Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Rendering | Three.js | 0.162 |
| Physics | Rapier2D | 0.12 |
| Build Tool | Vite | 7.3 |
| Language | TypeScript | 5.4 |
| Desktop | Electron | ^32.0.0 |
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
# The Electron toolchain is already in devDependencies (pinned)
npm run electron-build
# Installers in release/ folder
```
**Cost**: $0–400 (code signing optional)
**Time**: ~30 minutes
**Note**: auto-update is not active until a `publish` target is configured
in `package.json > build` plus code-signing certificates.

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
- **Modules**: 60 (optimized)
- **Build Time**: ~1.1 seconds
- **TypeScript Errors**: 0 ✓
- **Code Size**: ~27.8K lines
- **VBScript Functions**: 179+
- **Tests**: 582 passing across 20 vitest files
- **Git Commits**: 470+

### Performance
| Metric | Desktop | Tablet | Mobile |
|--------|---------|--------|--------|
| FPS | 60 | 55-60 | 50-60 |
| Memory | 280-350 MB | 200-280 MB | 150-200 MB |
| Bundle | ~568 KB gz | ~568 KB gz | ~568 KB gz |
| Build | 1.15s | — | — |

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

## 🔒 Security

User-supplied `.fpt` table files contain VBScript that the engine
transpiles to JS and evaluates. To keep that surface safe:

- **Sandboxed script execution** — every transpiled script runs inside
  a `Proxy` scope that returns `undefined` for any identifier outside
  an explicit allowlist (`Math`, `Date`, `JSON`, `console`,
  `setTimeout`, …). A pre-execution scan rejects scripts that
  reference `fetch`, `XMLHttpRequest`, `eval`, `localStorage`,
  `electronAPI`, `window`, `document.cookie`, location redirects, etc.
  See [src/utils/script-sandbox.ts](./src/utils/script-sandbox.ts).
- **Strict CSP** — Content-Security-Policy is set both via
  `<meta http-equiv>` in the bundled HTML (so it travels with
  Electron `file://` and any static host) and as a response header
  from the production `npm run serve`.
- **Electron hardening** — `sandbox: true`, `webSecurity: true`,
  default-deny permission handler, navigation pinned to the app
  origin, all `window.open` denied.
- **CI** — `.github/workflows/security.yml` runs ESLint security
  plugins, `npm audit`, and a custom XSS test suite on every push.
- **HTML escaping** — all user-controlled strings flowing into
  `innerHTML` go through [src/utils/html-escape.ts](./src/utils/html-escape.ts).

Run a local audit:
```bash
npm run security:check
```

---

## 📊 Project Statistics

- **Total Source Code**: ~27.8K lines (TypeScript + VBScript)
- **TypeScript Modules**: 60 (optimized)
- **TypeScript Files**: 50+
- **VBScript Functions**: 179+ (142+ game API functions)
- **Graphics Modules**: 15+ (volumetric lighting, cascaded shadows, DOF, particle system, etc.)
- **Supported Tables**: 6 demo tables (themed, progressive difficulty)
- **Game Events**: 28+ (video-bindable)
- **Video Events**: 28+ (bumper hit, target, ramp, multiball, drain, etc.)
- **Git History**: 470+ commits
- **Development Phases**: 18 completed phases
- **Documentation Files**: 30+ guides & references

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

## 🎉 What's New in v0.18.0 (Phase 18)

### Core Features ⭐
- 🎬 **Comprehensive Video System** — 28+ game events with video triggers
- 🖼️ **Integrated Table Editor** — Playfield, Backglass, DMD, Video editors
- 💾 **Multi-Screen Architecture** — True arcade cabinet support
- 📺 **DMD Drag-to-Resize** — Interactive resizing with corner handles
- 🎨 **Advanced Graphics Pipeline** — Volumetric lighting, cascaded shadows, DOF, film effects

### Multi-Screen & Cabinet Features 🆕
- 🎮 **Flexible Screen Assignment** — Assign playfield, backglass, or DMD to any screen
- ⚙️ **Per-Screen Resolution Config** — Configure resolution for each display
- 📐 **Cabinet Rotation Modes** — Support for vertical/horizontal/wide/inverted layouts
- 🔄 **Auto-Detection System** — Detects screen count, orientation, and physical layout
- 🚀 **Startup Scripts** — Auto-launch multi-screen setup (Windows, macOS, Linux)
- 📍 **Window Positioning** — Intelligent window placement across displays
- 🔗 **Cross-Window Sync** — Real-time state synchronization via BroadcastChannel

### Graphics Enhancements 🎨
- ✨ **Volumetric Lighting** — Dynamic light rays with quality scaling
- 🌑 **Cascaded Shadow Mapping** — Detailed real-time shadows
- 🔍 **Depth of Field** — Dynamic focus & blur
- 🎬 **Film Effects** — Chromatic aberration, vignette, film grain
- 🌟 **Per-Light Bloom** — Individual light bloom control
- 💫 **Advanced Particles** — Emitter system with custom effects
- ⚡ **Motion Blur** — Dynamic scene blur

### Quality & Documentation 📚
- ✅ **Comprehensive Documentation** — 30+ guides & technical references
- 📊 **Code Quality Reviews** — Architecture & efficiency analysis
- 🔒 **CI/CD Pipeline** — GitHub Actions for automated builds
- 📱 **Progressive Enhancement** — Mobile-first responsive design
- 🎯 **Performance Optimization** — 60 FPS on desktop, 50+ on mobile

### Deployment & Distribution 🚀
- 🌐 Progressive Web App (PWA) with offline support
- 📦 Native desktop apps (Windows, macOS, Linux)
- 🤖 Automated releases via GitHub Actions
- 🔄 Transparent auto-updates for all platforms
- 📥 One-click installation

---

## 🔗 Links

- **GitHub Repository**: [haraldweiss/Futurepinballweb](https://github.com/haraldweiss/Futurepinballweb)
- **Releases & Downloads**: [Latest Release](https://github.com/haraldweiss/Futurepinballweb/releases)
- **Issues & Bug Reports**: [GitHub Issues](https://github.com/haraldweiss/Futurepinballweb/issues)
- **Discussions**: [GitHub Discussions](https://github.com/haraldweiss/Futurepinballweb/discussions)

---

## 👥 Credits

**Future Pinball Web** is a modern implementation of the classic Future Pinball concept, featuring:
- Original VPX-inspired graphics
- Web/Electron hybrid deployment
- Community-driven development
- Open source contribution

---

**Made with ❤️ by Future Pinball Contributors**

Last Updated: March 12, 2026 | Version 0.18.0 | Phase 18 Complete ✅

---

**🚀 Ready to contribute?** Check out [CONTRIBUTING.md](./CONTRIBUTING.md) or see [GitHub Issues](https://github.com/haraldweiss/Futurepinballweb/issues) for open tasks!
