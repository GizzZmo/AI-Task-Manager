# Electron Integration Guide

This document explains the Electron integration for Sentinel AI Task Manager.

## Architecture

The application uses a standard Electron architecture:

- **Main Process** (`electron/main.js`): Creates and manages the BrowserWindow, handles native OS interactions
- **Preload Script** (`electron/preload.js`): Secure bridge between main and renderer processes via `contextBridge`
- **Renderer Process**: The React/Vite application running in the Chromium window

## Security Model

- **Context Isolation**: Enabled to prevent renderer from accessing Node.js APIs directly
- **Node Integration**: Disabled for security
- **Preload Script**: Whitelisted IPC methods exposed via `contextBridge`

## Development Workflow

### Running in Development

1. Start the Vite dev server:
   ```bash
   npm run dev
   ```

2. In a separate terminal, launch Electron:
   ```bash
   npm run electron:dev
   ```

The Electron window will load from `http://localhost:3000` with hot reload support.

### Building for Production

Build the desktop application:
```bash
npm run electron:build
```

This will:
1. Build the React app with Vite (output: `dist/`)
2. Package everything with electron-builder (output: `release/`)

## Next Steps (Roadmap Implementation)

### 1. Native Windows Process APIs

Replace mock data with real Windows telemetry:

```javascript
// In main.js, add IPC handlers:
ipcMain.handle('get-process-list', async () => {
  // Use node-windows or FFI to call Win32 APIs
  // Return: [{ pid, name, cpu, memory, ... }]
});

// In preload.js:
contextBridge.exposeInMainWorld('electron', {
  getProcessList: () => ipcRenderer.invoke('get-process-list'),
});

// In React app:
const processes = await window.electron.getProcessList();
```

### 2. Process Control

Add secure process control via IPC:

```javascript
// main.js
ipcMain.handle('terminate-process', async (event, pid) => {
  // Validate permissions
  // Call Win32 TerminateProcess
  return { success: true };
});
```

### 3. File Dialogs

Replace mock file browser:

```javascript
// main.js
const { dialog } = require('electron');
ipcMain.handle('show-open-dialog', async () => {
  return dialog.showOpenDialog({ properties: ['openFile'] });
});
```

### 4. Guardian Integration

Integrate the C++ guardian agent:

- **Option A**: Spawn as child process, communicate via stdout/stdin
- **Option B**: Compile as native Node module with node-gyp
- **Option C**: Use named pipes for IPC

### 5. Packaging & Distribution

- Add code signing certificate
- Configure MSIX packaging for Windows Store
- Set up auto-updater with electron-updater
- Add CI workflow for automated builds

## Resources

- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [IPC Best Practices](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [electron-builder Configuration](https://www.electron.build/configuration/configuration)
