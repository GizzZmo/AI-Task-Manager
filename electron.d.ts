// Type definitions for Electron IPC exposed via preload script
// This allows TypeScript to recognize window.electron

export interface GuardianSample {
  pid: number;
  name: string;
  imagePath: string;
  cpuPercent: number;
  workingSetBytes: number;
  privateBytes: number;
  handleCount: number;
  entropy: number;
  isSigned: boolean;
  riskLevel: string;
  riskScore: number;
  reason: string;
}

export interface ElectronAPI {
  getGuardianSnapshot: () => Promise<GuardianSample[]>;
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
