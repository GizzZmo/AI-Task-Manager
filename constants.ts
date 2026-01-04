import { ProcessData, RiskLevel, ModuleInfo } from './types';

// Helper to generate common modules
const COMMON_MODULES: ModuleInfo[] = [
  { name: 'ntdll.dll', path: 'C:\\Windows\\System32\\ntdll.dll', isSigned: true, baseAddress: '0x7FFC34000000', size: 2048 },
  { name: 'kernel32.dll', path: 'C:\\Windows\\System32\\kernel32.dll', isSigned: true, baseAddress: '0x7FFC33000000', size: 768 },
  { name: 'kernelbase.dll', path: 'C:\\Windows\\System32\\kernelbase.dll', isSigned: true, baseAddress: '0x7FFC32000000', size: 2900 },
];

// Simulating the "Golden Image" baseline data
export const INITIAL_PROCESSES: ProcessData[] = [
  {
    pid: 4,
    name: 'System',
    user: 'SYSTEM',
    session: 0,
    cpu: 0.1,
    memory: 24,
    diskIo: 15.2,
    networkIo: 0,
    entropy: 1.2,
    isSigned: true,
    handleCount: 12050,
    parentPid: 0,
    path: 'C:\\Windows\\System32\\ntoskrnl.exe',
    riskLevel: RiskLevel.SAFE,
    tags: ['kernel'],
    modules: [
        { name: 'ntoskrnl.exe', path: 'C:\\Windows\\System32\\ntoskrnl.exe', isSigned: true, baseAddress: '0xFFFFF80000000000', size: 10240 },
        { name: 'hal.dll', path: 'C:\\Windows\\System32\\hal.dll', isSigned: true, baseAddress: '0xFFFFF80000A00000', size: 512 },
        ...COMMON_MODULES
    ]
  },
  {
    pid: 1024,
    name: 'svchost.exe',
    user: 'NETWORK SERVICE',
    session: 0,
    cpu: 0.5,
    memory: 128,
    diskIo: 0.1,
    networkIo: 45.2,
    entropy: 6.1,
    isSigned: true,
    handleCount: 850,
    parentPid: 600,
    path: 'C:\\Windows\\System32\\svchost.exe',
    riskLevel: RiskLevel.SAFE,
    tags: ['service'],
    modules: [
        { name: 'svchost.exe', path: 'C:\\Windows\\System32\\svchost.exe', isSigned: true, baseAddress: '0x7FF710000000', size: 56 },
        { name: 'rpcrt4.dll', path: 'C:\\Windows\\System32\\rpcrt4.dll', isSigned: true, baseAddress: '0x7FFC35000000', size: 1200 },
        { name: 'sechost.dll', path: 'C:\\Windows\\System32\\sechost.dll', isSigned: true, baseAddress: '0x7FFC36000000', size: 450 },
        ...COMMON_MODULES
    ]
  },
  {
    pid: 5620,
    name: 'chrome.exe',
    user: 'User',
    session: 1,
    cpu: 12.4,
    memory: 850,
    diskIo: 2.5,
    networkIo: 1200,
    entropy: 6.8,
    isSigned: true,
    handleCount: 1500,
    parentPid: 1420,
    path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    riskLevel: RiskLevel.SAFE,
    tags: ['browser'],
    modules: [
        { name: 'chrome.exe', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', isSigned: true, baseAddress: '0x7FF740000000', size: 3050 },
        { name: 'chrome_elf.dll', path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome_elf.dll', isSigned: true, baseAddress: '0x7FFC50000000', size: 120 },
        { name: 'libglesv2.dll', path: 'C:\\Program Files\\Google\\Chrome\\Application\\libglesv2.dll', isSigned: true, baseAddress: '0x7FFC51000000', size: 4500 },
        ...COMMON_MODULES
    ]
  },
  {
    pid: 9999,
    name: 'powershell.exe',
    user: 'User',
    session: 1,
    cpu: 0.1,
    memory: 45,
    diskIo: 0,
    networkIo: 0,
    entropy: 5.5,
    isSigned: true,
    handleCount: 320,
    parentPid: 1420,
    path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',
    riskLevel: RiskLevel.SUSPICIOUS, // Suspicious because spawned by user randomly
    tags: ['shell'],
    modules: [
        { name: 'powershell.exe', path: 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe', isSigned: true, baseAddress: '0x7FF780000000', size: 450 },
        { name: 'mscoree.dll', path: 'C:\\Windows\\System32\\mscoree.dll', isSigned: true, baseAddress: '0x7FFC60000000', size: 320 },
        { name: 'clr.dll', path: 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\clr.dll', isSigned: true, baseAddress: '0x7FFC61000000', size: 8500 },
        ...COMMON_MODULES
    ]
  },
  {
    pid: 1337,
    name: 'updater_svc.exe',
    user: 'SYSTEM',
    session: 0,
    cpu: 88.5,
    memory: 2048,
    diskIo: 120.0,
    networkIo: 5500,
    entropy: 7.9, // High entropy (packed)
    isSigned: false, // Not signed
    handleCount: 45000,
    parentPid: 1024,
    path: 'C:\\Temp\\updater_svc.exe',
    riskLevel: RiskLevel.MALICIOUS, // Simulating a crypto miner or ransomware
    tags: ['unknown', 'high-resource'],
    modules: [
        { name: 'updater_svc.exe', path: 'C:\\Temp\\updater_svc.exe', isSigned: false, baseAddress: '0x140000000', size: 1500 },
        { name: 'wininet.dll', path: 'C:\\Windows\\System32\\wininet.dll', isSigned: true, baseAddress: '0x7FFC38000000', size: 2300 },
        { name: 'miner_logic.dll', path: 'C:\\Temp\\miner_logic.dll', isSigned: false, baseAddress: '0x7FFC90000000', size: 450 }, // Suspicious module
        { name: 'crypto_lib.dll', path: 'C:\\Temp\\crypto_lib.dll', isSigned: false, baseAddress: '0x7FFC91000000', size: 890 },
        ...COMMON_MODULES
    ]
  },
];

export const MOCK_LOGS = [
  "[KERNEL] PSAPI: EnumProcesses completed in 4ms.",
  "[PDH] Querying \\Process(*)\\% Processor Time...",
  "[WTS] Session ID 1 mapped to user 'Dev_User'.",
  "[AI] ONNX Runtime initialized. Provider: DML.",
  "[SECURITY] SeDebugPrivilege acquired for snapshot.",
];