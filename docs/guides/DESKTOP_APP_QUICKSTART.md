# Desktop App — Quick Start (5 Minuten)

Du möchtest Future Pinball Web als Desktop-App bauen? Folge diesen 5 einfachen Schritten:

---

## Schritt 1: Vorbereitung (1 Minute)

```bash
# Stelle sicher, dass Node.js 18+ installiert ist
node --version        # sollte v18.0.0 oder höher sein
npm --version         # sollte 9.0.0 oder höher sein

# Falls nicht installiert:
# https://nodejs.org/ (LTS Version herunterladen)
```

---

## Schritt 2: Abhängigkeiten installieren (2 Minuten)

```bash
# Gehe ins Projekt-Verzeichnis
cd /Library/WebServer/Documents/Futurepinball\ Web

# Installiere Electron und Build-Tools
npm install electron electron-builder electron-is-dev electron-updater --save-dev

# Dauert ~2-3 Minuten...
```

---

## Schritt 3: App bauen (1 Minute)

```bash
# Baue die Web-App zuerst
npm run build

# Dann baue die Desktop-App
npm run electron-build

# Dauert ~3-5 Minuten je nach Plattform...
```

---

## Schritt 4: Installers finden (1 Minute)

Nach dem Build befinden sich die Installers im `release/` Ordner:

```
release/
├── Future Pinball Web Setup 0.16.0.exe    (Windows)
├── Future Pinball Web 0.16.0.exe          (Windows portable)
├── Future Pinball Web-0.16.0.dmg          (macOS)
├── future-pinball-web-0.16.0.AppImage     (Linux)
└── future-pinball-web_0.16.0_amd64.deb    (Linux deb)
```

---

## Schritt 5: Installieren & Starten

### Windows

**Mit Installer (empfohlen):**
```
1. Double-click: Future Pinball Web Setup 0.16.0.exe
2. Installation wizard folgen
3. Fertig!
```

**Oder portable Version:**
```
1. Double-click: Future Pinball Web 0.16.0.exe
2. App startet direkt (keine Installation)
```

### macOS

```
1. Double-click: Future Pinball Web-0.16.0.dmg
2. Drag app to Applications folder
3. Open Applications folder
4. Double-click Future Pinball Web
5. Fertig!
```

### Linux (AppImage)

```bash
# Download: future-pinball-web-0.16.0.AppImage
chmod +x future-pinball-web-0.16.0.AppImage
./future-pinball-web-0.16.0.AppImage

# Oder: Ubuntu/Debian
sudo apt install ./future-pinball-web_0.16.0_amd64.deb
```

---

## Nur für deine Plattform bauen

```bash
# Nur Windows
npm run electron-win

# Nur macOS (muss auf macOS ausgeführt werden)
npm run electron-mac

# Nur Linux
npm run electron-linux
```

---

## Entwicklung (Hot-Reload)

```bash
# App mit DevTools starten
npm run electron-dev

# Änderungen in src/ laden automatisch neu
# DevTools öffnet automatisch zum Debuggen
```

---

## Häufige Fehler

### "electron ist nicht installiert"

```bash
npm install electron --save-dev
```

### "electron-builder nicht gefunden"

```bash
npm install electron-builder --save-dev
```

### Windows: "VCRUNTIME fehlt"

Benutzer müssen Visual C++ Redistributable installieren:
https://support.microsoft.com/en-us/help/2977003

Oder: In Zukunft in `package.json` hinzufügen

### macOS: "App kann nicht geöffnet werden"

Quarantine-Flag entfernen:
```bash
xattr -d com.apple.quarantine /Applications/Future\ Pinball\ Web.app
```

### Linux: AppImage startet nicht

```bash
chmod +x future-pinball-web-*.AppImage
sudo apt install libfuse2  # Falls nötig
```

---

## Was ist enthalten?

✅ **Alle Pinball-Features**
- 6 Demo-Tabellen
- VPX-ähnliche Grafiken
- Vollständige Physik
- Backglass & DMD
- Video-System
- Editor

✅ **Desktop-Features**
- Standalone window
- Offline support
- Auto-Updates
- File dialogs
- System integration

✅ **Auto-Updates**
- Prüfung auf Hintergrund
- User-Benachrichtigung
- Ein-Klick-Update
- Transparente Installation

---

## Speichergröße

| Datei | Größe |
|-------|-------|
| Windows Installer | ~180 MB |
| Windows Portable | ~160 MB |
| macOS DMG | ~200 MB |
| Linux AppImage | ~170 MB |
| Linux DEB | ~160 MB |

*Enthält Chromium Browser-Engine (~150 MB)*

---

## Nächste Schritte

### PWA (Web-Version) auch verfügbar!

```bash
npm run build
# Kopiere dist/ zu deinem Web-Server
# Sofort installierbar im Browser
```

### Für GitHub/Veröffentlichung

Siehe: `DEPLOYMENT_GUIDE.md`

---

## Support

**Problem?**

1. Beende die App vollständig
2. Starte sie neu
3. Prüfe Konsole (bei electron-dev) auf Fehler
4. Siehe `DEPLOYMENT_GUIDE.md` Troubleshooting-Sektion

**Code-Änderungen?**

1. Bearbeite `src/` Dateien
2. `npm run build`
3. `npm run electron-build`
4. Neue Installers im `release/` Ordner

---

**Fertig!** 🎉

Deine Desktop-App ist bereit!
