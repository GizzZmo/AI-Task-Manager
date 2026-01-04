const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // Future IPC methods will be added here as we implement native features
  // For now, this is a placeholder for the secure bridge

  getGuardianSnapshot: () => ipcRenderer.invoke('guardian:sample'),
  // Example for future use:
  // getProcessList: () => ipcRenderer.invoke('get-process-list'),
  // terminateProcess: (pid) => ipcRenderer.invoke('terminate-process', pid),
  // getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
});

// Log that preload script has loaded (helps with debugging)
console.log('Electron preload script loaded');
