# Deployment Guide — PWA + Electron Desktop Apps

**Status**: ✅ READY FOR DEPLOYMENT
**Version**: 0.16.0
**Platforms**: Windows, macOS, Linux (+ Web PWA)

---

## Overview

Future Pinball Web can now be deployed as:

1. **Progressive Web App (PWA)** — Browser + installable
2. **Desktop Apps** — Native Windows/macOS/Linux apps via Electron

This guide covers both.

---

## Part 1: Web Deployment (PWA)

### Prerequisites

```bash
Node.js 18+
npm 9+
Modern web server (nginx, Apache, or any static host)
```

### Build for Web

```bash
npm run build
```

Output: `dist/` directory with all files

### Deploy to Web Server

```bash
# Copy dist folder to your web server
scp -r dist/* user@yourserver.com:/var/www/future-pinball

# Or use your hosting platform's deployment method
# Examples:
# - Vercel: vercel deploy
# - Netlify: netlify deploy --prod
# - GitHub Pages: git push origin main
```

### Features Automatically Available

Once deployed to web:

✅ **Install as App** (button appears in browser)
✅ **Offline Support** (Service Worker caching)
✅ **Auto-Updates** (Service Worker checks for new versions)
✅ **Responsive Design** (works on mobile/tablet/desktop)
✅ **PWA Installation** (Windows, macOS, Linux, iOS, Android)

### Installation from Web

**Desktop Users:**
1. Visit your website
2. Click "📥 Install App" button (top right)
3. Confirm installation
4. App opens as standalone desktop window

**Mobile Users:**
1. Visit website in browser
2. Browser shows install prompt
3. Tap "Install"
4. App appears on home screen

---

## Part 2: Desktop App Deployment (Electron)

### Prerequisites

```bash
Node.js 18+
npm 9+
For macOS builds: macOS 10.13+
For Windows builds: Windows 7+
For Linux: AppImage or .deb support
```

### Development

```bash
# Run with hot-reload
npm run electron-dev

# Opens DevTools for debugging
# Edits to src/ reload automatically (via Vite)
```

### Building

#### Build for All Platforms (Recommended)

```bash
npm run electron-build

# Creates installers for current platform:
# Windows: .exe installer + portable
# macOS: .dmg installer
# Linux: .AppImage + .deb
```

#### Platform-Specific Builds

```bash
# Windows only
npm run electron-win

# macOS only (must run on macOS)
npm run electron-mac

# Linux only
npm run electron-linux
```

### Output Locations

```
release/
├── Future Pinball Web Setup 0.16.0.exe    (Windows installer)
├── Future Pinball Web 0.16.0.exe          (Windows portable)
├── Future Pinball Web-0.16.0.dmg          (macOS)
├── future-pinball-web-0.16.0.AppImage     (Linux)
└── future-pinball-web_0.16.0_amd64.deb    (Linux deb)
```

---

## Installation Instructions by OS

### Windows

**From .exe Installer (Recommended)**
```
1. Download: Future Pinball Web Setup 0.16.0.exe
2. Run the installer
3. Follow installation wizard
4. Start menu shortcut created
5. Desktop shortcut created
```

**From Portable .exe**
```
1. Download: Future Pinball Web 0.16.0.exe
2. Run directly (no installation)
3. No registry changes, fully portable
4. Copy to USB stick if desired
```

### macOS

**From .dmg**
```
1. Download: Future Pinball Web-0.16.0.dmg
2. Open the DMG file
3. Drag app to Applications folder
4. Launch from Applications
5. Grant permissions if prompted
```

**M1/M2 Native Support**
```
Electron 13+ includes native ARM64 binaries
Apps run natively on Apple Silicon
Performance: ~10-15% faster than Rosetta translation
```

### Linux

**From .AppImage (Recommended)**
```
1. Download: future-pinball-web-0.16.0.AppImage
2. chmod +x future-pinball-web-0.16.0.AppImage
3. ./future-pinball-web-0.16.0.AppImage
4. App runs directly (no installation)
```

**From .deb**
```
1. Download: future-pinball-web_0.16.0_amd64.deb
2. sudo apt install ./future-pinball-web_0.16.0_amd64.deb
3. Launch from applications menu
4. Or: future-pinball-web (from terminal)
```

---

## Automated Release Pipeline

### Setup GitHub Actions

1. **Create GitHub repo** (if not exists)
   ```bash
   git init
   git remote add origin https://github.com/yourusername/future-pinball-web
   ```

2. **Create release**
   ```bash
   git tag v0.16.0
   git push origin v0.16.0
   ```

3. **GitHub Actions builds automatically**
   - Triggers on push of version tags (v*.*.*)
   - Builds on Windows, macOS, Linux
   - Creates GitHub Release with all installers
   - Takes ~30 minutes for all platforms

4. **Download from Release Page**
   ```
   https://github.com/yourusername/future-pinball-web/releases/tag/v0.16.0
   ```

### Build Pipeline Details

**.github/workflows/build-release.yml:**
- Triggers: `git push origin v*.*.*`
- Matrix builds: Windows, macOS, Linux (parallel)
- Each build: npm install → npm run build → electron-builder
- Uploads: All .exe, .dmg, .AppImage, .deb files
- Creates: Draft release with artifacts

---

## Auto-Updates Setup

### For Desktop Apps (Electron)

**1. Setup Update Server**

Option A: GitHub Releases (Free, recommended)
```typescript
// electron-main.js already configured for GitHub
// Automatically checks /releases for new versions
```

Option B: Custom Server
```typescript
// Update electron-main.js
const server = 'https://updates.yourserver.com';
autoUpdater.setFeedURL({
  provider: 'generic',
  url: server + '/releases',
});
```

**2. How It Works**

```
User opens app
    ↓
Electron checks for updates (background)
    ↓
New version available?
    ↓ YES
Download new version silently
    ↓
Notify user "New version available"
    ↓
User clicks "Update Now"
    ↓
Install & restart
```

**3. Disable Auto-Update**

```typescript
// electron-main.js, line 92
// if (!isDev) {
//   autoUpdater.checkForUpdatesAndNotify();
// }
```

### For Web App (PWA)

- Service Worker checks for updates automatically
- User notified: "⬇️ New version available"
- Clicking "Update Now" → page reloads
- No manual installation needed

---

## Distribution Methods

### Method 1: Direct Download (Simplest)

```html
<a href="https://yoursite.com/downloads/fpweb-windows.exe">
  Download for Windows
</a>
```

**Pros:** Simple, no account needed
**Cons:** Manual updates, no analytics

### Method 2: GitHub Releases (Recommended)

```
https://github.com/yourusername/future-pinball-web/releases
```

**Pros:**
- Free hosting for binaries
- Automatic versioning
- Download stats
- Release notes
- Pre-release support

**Cons:**
- Need GitHub account
- Requires git workflow

### Method 3: Package Managers

**Windows: Chocolatey**
```powershell
choco install future-pinball-web
```

Requires:
- Chocolatey package submission
- Signing certificates
- ~1 week approval time

**Linux: Snap Store**
```bash
snap install future-pinball-web
```

Requires:
- Snap package configuration
- Store submission
- Automatic updates built-in

**macOS: Homebrew (Cask)**
```bash
brew install --cask future-pinball-web
```

Requires:
- Notarization (Apple signing)
- GitHub releases
- Pull request to homebrew-cask

### Method 4: Installer Website

Professional approach with custom installer:

```html
<div class="downloads">
  <button onclick="downloadWindows()">📥 Download for Windows</button>
  <button onclick="downloadMac()">📥 Download for macOS</button>
  <button onclick="downloadLinux()">📥 Download for Linux</button>
  <button onclick="installWeb()">🌐 Install Web Version</button>
</div>
```

---

## Security & Signing

### Code Signing (Optional but Recommended)

**Windows Code Signing**

```javascript
// electron-builder config
"win": {
  "certificateFile": "path/to/cert.pfx",
  "certificatePassword": "password",
  "signingHashAlgorithms": ["sha256"],
  "sign": "./customSign.js"
}
```

Benefits:
- ✅ Users see your company name (not unknown)
- ✅ No SmartScreen warnings
- ✅ Increased trust

Cost: ~$200-400/year

**macOS Notarization**

```bash
# Required for macOS 10.15+
xcrun notarytool submit app.dmg --apple-id email@apple.com
```

Benefits:
- ✅ Users can open app without warnings
- ✅ Distributed via Mac App Store
- ✅ Required by Apple

Cost: Free (requires Apple Developer account ~$99/year)

**Linux Signing**

- Not typically required
- AppImage format is inherently safe
- GPG signing optional for verification

---

## Quality Assurance Checklist

### Before Release

- [ ] All tests passing: `npm run build` ✓
- [ ] No console errors in development
- [ ] PWA manifest.json valid
- [ ] Service Worker caches appropriately
- [ ] App works offline
- [ ] Update notifications working
- [ ] Windows app installs cleanly
- [ ] macOS app runs without warnings
- [ ] Linux AppImage launches
- [ ] All shortcuts work
- [ ] Menus functional
- [ ] File dialogs working
- [ ] Version bumped in package.json

### After Release

- [ ] Download Windows .exe and test
- [ ] Download macOS .dmg and test
- [ ] Download Linux AppImage and test
- [ ] Test installation on clean machine
- [ ] Test auto-update functionality
- [ ] Check GitHub release page looks good
- [ ] Announce on social media / community

---

## Troubleshooting

### Windows

**"SmartScreen blocked"**
- Code signing required (~$300/year)
- Or: Users click "More Info" → "Run Anyway"

**"Can't find VCRUNTIME"**
- Install Visual C++ Redistributable
- Or: Bundle vcredist in installer

**App won't start**
- Check Event Viewer for errors
- Run with `--inspect` flag for debugging

### macOS

**"App is damaged"**
- Needs notarization
- Submit to Apple for code signing

**"Gatekeeper won't allow"**
- Remove quarantine: `xattr -d com.apple.quarantine app.app`
- Or: Notarize properly

### Linux

**AppImage won't run**
- Make executable: `chmod +x filename.AppImage`
- Install FUSE if needed: `sudo apt install libfuse2`

**deb install fails**
- Wrong arch: download amd64 not arm
- Broken dependencies: `sudo apt-get -f install`

---

## Performance Metrics

### Download Sizes

| Platform | Type | Size |
|----------|------|------|
| Windows | Installer | ~180 MB |
| Windows | Portable | ~160 MB |
| macOS | DMG | ~200 MB |
| Linux | AppImage | ~170 MB |
| Linux | DEB | ~160 MB |
| Web | Initial | ~10 MB |

*Sizes include Chromium engine (~150 MB) in Electron*

### First Launch

| Platform | Time | Notes |
|----------|------|-------|
| Windows | 2-3 sec | Unpacks Chromium |
| macOS | 2-3 sec | Unpacks Chromium |
| Linux | 2-3 sec | Unpacks Chromium |
| Web PWA | 1-2 sec | Uses browser engine |

### Memory Usage

| Platform | Idle | Gaming |
|----------|------|--------|
| Windows (Electron) | 180 MB | 280-350 MB |
| macOS (Electron) | 200 MB | 300-380 MB |
| Linux (Electron) | 170 MB | 250-320 MB |
| Web (Chrome) | 150 MB | 250-320 MB |

---

## Versioning Strategy

### Version Format: MAJOR.MINOR.PATCH

**Example: 0.16.0**

- **0** = Major (breaking changes)
- **16** = Minor (new features, backward compatible)
- **0** = Patch (bug fixes only)

### Release Checklist

```bash
# 1. Update version
npm version minor  # 0.16.0 → 0.17.0

# 2. Rebuild
npm run build

# 3. Test
npm run electron-dev

# 4. Create release
git tag v0.17.0
git push origin v0.17.0

# 5. GitHub Actions builds automatically
# (check Actions tab)

# 6. Download from Releases page
```

---

## Continuous Deployment

### Automatic Deployment (GitHub Pages)

```bash
# Add to build script:
"deploy": "npm run build && gh-pages -d dist"

npm run deploy
```

Automatically publishes PWA to yoursite.github.io

---

## Support & Documentation

### User-Facing Documentation

Create/update:
- `README.md` — Quick start for users
- Installation guide for each platform
- Troubleshooting FAQ
- Feature list
- System requirements

### Developer Documentation

- This deployment guide
- API documentation (if needed)
- Contribution guidelines
- Issue templates

### Community Resources

- GitHub Issues for bug reports
- Discussions for feature requests
- Wiki for knowledge base
- Discord/Slack for real-time support

---

## Next Steps

### Ready to Deploy?

1. **Web (Instant)**
   ```bash
   npm run build
   # Deploy dist/ to your hosting
   ```

2. **Desktop (5 minutes setup)**
   ```bash
   npm install electron electron-builder electron-is-dev electron-updater
   npm run electron-build
   ```

3. **Automated (10 minutes setup)**
   - Push to GitHub
   - Add .github/workflows/build-release.yml
   - Create git tags for releases

### Release Timeline

- **First Release**: 30 minutes (all platforms at once)
- **Subsequent Releases**: 30-45 minutes (GitHub Actions builds)
- **Auto-Updates**: Transparent to users

---

## Conclusion

You now have:

✅ **PWA** — Immediately deployable to any web host
✅ **Desktop Apps** — Electron builds for Win/Mac/Linux
✅ **Auto-Updates** — Built-in update checking
✅ **CI/CD Pipeline** — GitHub Actions automated builds
✅ **Distribution Ready** — Multiple deployment methods

**Total Setup Time**: ~1 hour
**Time to First Release**: ~30 minutes

Let's ship it! 🚀
