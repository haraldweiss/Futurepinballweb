// SPDX-License-Identifier: AGPL-3.0-or-later
// © 2026 Harald Weiss
/**
 * electron-main.cjs — Main Process for Desktop App
 *
 * The .cjs extension is intentional: package.json has "type": "module"
 * (so the Vite source code is treated as ESM), but Electron's main and
 * preload scripts use require() / CommonJS semantics. .cjs forces Node
 * to ignore the "type": "module" hint for these two files specifically.
 *
 * Handles:
 * - Window creation and management
 * - Auto-updates
 * - Native menu
 * - File dialogs
 * - System integration
 */

const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
// NOTE: `screen` is lazy-imported inside handlers — accessing it before
// app.ready throws on some platforms ("Cannot require screen module before app is ready").
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// Was previously `require('electron-is-dev')`. That package shipped a v3
// release as ESM-only — under Electron 41's Node 22, `require()` of an ESM
// returns a namespace object like { default: false }, which is truthy and
// always took the dev branch below. Result: the packaged app loaded
// http://localhost:5173 (whatever Vite dev server happened to be running)
// instead of the bundled dist/index.html. `app.isPackaged` is built into
// Electron and behaves correctly.
const isDev = !app.isPackaged;

// Keep a global reference of the window object
let mainWindow;

const childWindows = new Map(); // id -> BrowserWindow
let nextChildId = 1;

/**
 * Create the browser window
 */
function createWindow() {
  // On a pinball cabinet the playfield should fill the primary display.
  // Open AT the display's exact bounds — using show:false + maximize() then
  // show() caused the renderer to init at 0×0 and never pick up the resize,
  // resulting in an empty playfield window.
  let initX = 0, initY = 0;
  let initWidth = 1280, initHeight = 960;
  try {
    const { screen } = require('electron');
    const primary = screen.getPrimaryDisplay();
    initX = primary.workArea.x;
    initY = primary.workArea.y;
    initWidth = primary.workArea.width;
    initHeight = primary.workArea.height;
  } catch { /* fall back to defaults */ }

  mainWindow = new BrowserWindow({
    x: initX,
    y: initY,
    width: initWidth,
    height: initHeight,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
    icon: path.join(__dirname, 'public/icons/icon-512x512.png'),
  });

  // Deny every permission request by default — game does not need
  // mic/camera/geolocation/notifications/etc. Whitelist explicitly if needed.
  mainWindow.webContents.session.setPermissionRequestHandler((_wc, _perm, callback) => callback(false));

  // Block navigation away from app origin to prevent malicious tables
  // (which run via VBScript transpilation) from steering the renderer to
  // attacker-controlled origins.
  mainWindow.webContents.on('will-navigate', (event, navUrl) => {
    if (!navUrl.startsWith('http://localhost:5173') && !navUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));

  // Load the app
  const startUrl = isDev
    ? 'http://localhost:5173' // Vite dev server
    : `file://${path.join(__dirname, 'dist/index.html')}`; // Production build

  mainWindow.loadURL(startUrl);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Renderer-process crash handler. The legacy 'crashed' event was removed
  // in Electron 22; 'render-process-gone' replaces it and provides details
  // (reason: 'crashed' | 'killed' | 'oom' | 'launch-failed' | …).
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    const reason = details?.reason || 'unknown';
    dialog.showErrorBox('Error', `Renderer terminated (${reason}). Please restart.`);
    app.quit();
  });
}

/**
 * App event listeners
 */
app.on('ready', () => {
  createWindow();
  createMenu();

  // Auto-update against GitHub Releases (config: package.json > build >
  // publish). Skipped in dev. Wrapped because pre-1.0 the user may not
  // have published any release yet — that should not produce a startup
  // dialog. autoUpdater also emits an 'error' event we listen for below
  // and forward to the renderer; that path stays silent for the user.
  if (!isDev) {
    try {
      autoUpdater.autoDownload = true;
      autoUpdater.allowPrerelease = false;
      autoUpdater.checkForUpdatesAndNotify().catch((err) => {
        console.warn('[updater] check failed:', err.message);
      });
    } catch (err) {
      console.warn('[updater] init failed:', err.message);
    }
  }
});

app.on('window-all-closed', () => {
  // On macOS, apps typically stay open until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

/**
 * Create application menu
 */
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Future Pinball Web',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Future Pinball Web',
              message: 'Future Pinball Web',
              detail:
                'Modern cross-platform 3D pinball game\n\n' +
                'Version: ' +
                app.getVersion() +
                '\n' +
                'Electron: ' +
                process.versions.electron,
            });
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * IPC Handlers
 */

// Handle file open dialog
ipcMain.handle('dialog:openFile', async (event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Pinball Tables', extensions: ['fpt', 'fp', 'json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    ...options,
  });
  return result;
});

// Handle file save dialog
ipcMain.handle('dialog:saveFile', async (event, options = {}) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Pinball Table', extensions: ['fpt'] },
      { name: 'JSON Config', extensions: ['json'] },
    ],
    ...options,
  });
  return result;
});

// Handle directory selection
ipcMain.handle('dialog:selectDirectory', async (event) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  return result;
});

// Get app version
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// Get app path
ipcMain.handle('app:getPath', (event, name) => {
  return app.getPath(name);
});

// Screen enumeration — main process has access to all displays.
// Renderer can't see secondary displays in Electron's file:// context.
ipcMain.handle('screen:getAllDisplays', () => {
  const { screen } = require('electron');
  const displays = screen.getAllDisplays();
  const primaryId = screen.getPrimaryDisplay().id;
  return displays.map((d) => ({
    id: d.id,
    label: d.label || `Display ${d.id}`,
    bounds: { x: d.bounds.x, y: d.bounds.y, width: d.bounds.width, height: d.bounds.height },
    workArea: { x: d.workArea.x, y: d.workArea.y, width: d.workArea.width, height: d.workArea.height },
    scaleFactor: d.scaleFactor,
    rotation: d.rotation,
    isPrimary: d.id === primaryId,
    internal: d.internal === true,
  }));
});

// Open a child window at a specific position/size (multi-screen layouts).
// Routes around setWindowOpenHandler's denial of renderer-initiated window.open.
ipcMain.handle('window:openOnDisplay', async (_event, options) => {
  const { url, x, y, width, height, role } = options || {};
  if (typeof url !== 'string') throw new Error('url required');
  if ([x, y, width, height].some((v) => typeof v !== 'number' || !Number.isFinite(v))) {
    throw new Error('numeric x, y, width, height required');
  }

  const allowed =
    url.startsWith('http://localhost:5173') ||
    url.startsWith('file://');
  if (!allowed) throw new Error('disallowed url');

  const child = new BrowserWindow({
    x, y, width, height,
    frame: false,
    resizable: true,
    fullscreenable: true,
    title: role ? `Future Pinball — ${role}` : 'Future Pinball',
    webPreferences: {
      preload: path.join(__dirname, 'electron-preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  });
  child.setMenuBarVisibility(false);
  child.webContents.session.setPermissionRequestHandler((_wc, _p, cb) => cb(false));
  child.webContents.on('will-navigate', (event, navUrl) => {
    if (!navUrl.startsWith('http://localhost:5173') && !navUrl.startsWith('file://')) {
      event.preventDefault();
    }
  });
  child.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  child.loadURL(url);

  // Re-assert position+size right after window has its first paint. On some
  // Windows configs the initial x/y/width/height in the constructor are
  // ignored if they cross display boundaries — child ends up on the primary
  // display at default size. setBounds AFTER ready-to-show forces it onto
  // the intended display at the intended size.
  child.once('ready-to-show', () => {
    try {
      child.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
    } catch { /* may fail if window already destroyed */ }
  });

  const id = nextChildId++;
  childWindows.set(id, child);
  child.on('closed', () => childWindows.delete(id));
  return id;
});

ipcMain.handle('window:close', (_event, id) => {
  const w = childWindows.get(id);
  if (w && !w.isDestroyed()) {
    w.close();
  }
  childWindows.delete(id);
});

ipcMain.handle('window:closeAllChildren', () => {
  for (const w of childWindows.values()) {
    if (!w.isDestroyed()) w.close();
  }
  childWindows.clear();
});

// Phase B0: paths that the renderer is allowed to read.
// Populated when fpt:scanDirectory returns entries — the renderer can only
// read files the scanner has surfaced (i.e. .fpt files in user-picked dirs).
const allowedFPTPaths = new Set();

// FPT directory scanner — list .fpt files with basic metadata.
// Renderer can't safely use fs.readdir; main process owns filesystem access.
ipcMain.handle('fpt:scanDirectory', async (_event, dirPath) => {
  if (typeof dirPath !== 'string' || dirPath.length === 0) return [];
  try {
    allowedFPTPaths.clear(); // reset before populating for the new scan
    const dirents = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const fptFiles = dirents.filter(d => d.isFile() && d.name.toLowerCase().endsWith('.fpt'));
    const out = [];
    for (const dirent of fptFiles) {
      const fullPath = path.join(dirPath, dirent.name);
      try {
        const stat = await fs.promises.stat(fullPath);
        out.push({
          path: fullPath,
          name: dirent.name.replace(/\.fpt$/i, ''),
          size: stat.size,
          mtime: stat.mtimeMs,
        });
        allowedFPTPaths.add(fullPath);
      } catch { /* ignore individual stat failures */ }
    }
    return out;
  } catch (err) {
    console.warn('[fpt:scanDirectory] failed:', err.message);
    return [];
  }
});

// Show a native OS folder picker for the user to choose their FPT directory.
ipcMain.handle('fpt:pickDirectory', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select your Future Pinball tables directory',
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Read an FPT file from disk and return its bytes to the renderer.
// SECURITY: only paths previously returned by fpt:scanDirectory are accepted.
// This prevents a compromised renderer (XSS) from reading arbitrary files.
ipcMain.handle('fpt:readFile', async (_event, filePath) => {
  if (typeof filePath !== 'string') throw new Error('filePath required');
  if (!filePath.toLowerCase().endsWith('.fpt')) throw new Error('not an fpt file');
  if (!allowedFPTPaths.has(filePath)) {
    throw new Error('path not in allowlist — call scanFPTDirectory first');
  }
  const buf = await fs.promises.readFile(filePath);
  // Convert to ArrayBuffer so structured clone gives renderer-friendly bytes.
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
});

// Cross-window state relay. The playfield window emits per-frame state
// (score, DMD frame, animation flags). BroadcastChannel does not bridge
// independent BrowserWindow instances reliably, so we relay via IPC:
// playfield → main → all child windows. We deliberately do NOT echo the
// message back to the sender (it already has its own state).
ipcMain.on('mp:broadcast', (event, data) => {
  const senderId = event.sender.id;
  for (const w of childWindows.values()) {
    if (!w.isDestroyed() && w.webContents.id !== senderId) {
      w.webContents.send('mp:state', data);
    }
  }
  // Also relay to the main playfield window if a child triggered it
  // (rare, but keeps the bus symmetric).
  if (mainWindow && !mainWindow.isDestroyed() && mainWindow.webContents.id !== senderId) {
    mainWindow.webContents.send('mp:state', data);
  }
});

// Check for updates
ipcMain.handle('updater:checkForUpdates', async () => {
  if (isDev) {
    return { available: false };
  }
  try {
    const result = await autoUpdater.checkForUpdates();
    return {
      available: result?.updateInfo?.version !== app.getVersion(),
      version: result?.updateInfo?.version,
    };
  } catch (err) {
    console.error('Update check failed:', err);
    return { available: false, error: err.message };
  }
});

// Perform update
ipcMain.handle('updater:quitAndInstall', () => {
  if (isDev) return;
  autoUpdater.quitAndInstall();
});

// Listen for update events
autoUpdater.on('update-available', () => {
  mainWindow?.webContents.send('updater:update-available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow?.webContents.send('updater:update-downloaded');
});

autoUpdater.on('error', (err) => {
  mainWindow?.webContents.send('updater:error', err.message);
});
