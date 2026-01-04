const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Keep a global reference of the window object to avoid garbage collection
let mainWindow;
let guardianNative;

function loadGuardianModule() {
  const candidatePaths = [
    path.join(__dirname, '../build/Release/guardian.node'),
    process.resourcesPath ? path.join(process.resourcesPath, 'build/Release/guardian.node') : null,
    process.resourcesPath ? path.join(process.resourcesPath, 'app.asar.unpacked', 'build/Release/guardian.node') : null
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    try {
      // eslint-disable-next-line import/no-dynamic-require, global-require
      guardianNative = require(candidate);
      console.log('[Guardian] Loaded native module from', candidate);
      break;
    } catch (err) {
      console.warn('[Guardian] Failed to load native module from', candidate, err.message);
    }
  }
}

function registerGuardianHandler() {
  ipcMain.handle('guardian:sample', async () => {
    if (guardianNative?.sampleOnce) {
      return guardianNative.sampleOnce();
    }
    throw new Error('Guardian native module is unavailable on this platform.');
  });
}

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    backgroundColor: '#0f172a', // slate-950
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'Sentinel AI Task Manager'
  });

  // Load the app
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(() => {
  loadGuardianModule();
  registerGuardianHandler();
  createWindow();
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS it's common to re-create a window when the dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});
