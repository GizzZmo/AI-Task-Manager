// Type definitions for Electron IPC exposed via preload script
// This allows TypeScript to recognize window.electron

export interface ElectronAPI {
  // Future IPC methods - examples for when native features are implemented:
  // getProcessList: () => Promise<ProcessData[]>;
  // terminateProcess: (pid: number) => Promise<{ success: boolean }>;
  // getSystemInfo: () => Promise<SystemInfo>;
  // showOpenDialog: () => Promise<{ filePaths: string[] }>;
}

declare global {
  interface Window {
    electron: ElectronAPI;
  }
}

export {};
