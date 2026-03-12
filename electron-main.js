/**
 * electron-main.js — Main Process for Desktop App
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
const isDev = require('electron-is-dev');
const fs = require('fs');

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
      preload: path.join(__dirname, 'electron-preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
    },
    icon: path.join(__dirname, 'public/icons/icon-512x512.png'),
  });

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

  // Handle any uncaught exceptions
  mainWindow.webContents.on('crashed', () => {
    dialog.showErrorBox('Error', 'Application crashed. Please restart.');
    app.quit();
  });
}

/**
 * App event listeners
 */
app.on('ready', () => {
  createWindow();
  createMenu();

  // Check for updates (only in production)
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
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
