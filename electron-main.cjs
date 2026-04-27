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

/**
 * Create the browser window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 960,
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
