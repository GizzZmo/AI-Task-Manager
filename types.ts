export enum RiskLevel {
  SAFE = 'SAFE',
  SUSPICIOUS = 'SUSPICIOUS',
  MALICIOUS = 'MALICIOUS',
  UNKNOWN = 'UNKNOWN'
}

export interface ModuleInfo {
  name: string;
  path: string;
  isSigned: boolean;
  baseAddress: string;
  size: number; // KB
}

export interface ProcessData {
  pid: number;
  name: string;
  user: string;
  session: number;
  cpu: number; // Percentage
  memory: number; // MB
  diskIo: number; // MB/s
  networkIo: number; // KB/s
  entropy: number; // 0-8
  isSigned: boolean;
  handleCount: number;
  parentPid: number;
  path: string;
  riskLevel: RiskLevel;
  tags: string[];
  modules: ModuleInfo[];
}

export interface AnalysisResponse {
  riskScore: number; // 0-1
  classification: RiskLevel;
  reasoning: string;
  recommendedAction: string;
}

export interface ResearchResponse {
  content: string;
  sources: { title: string; uri: string }[];
}

export interface ChartPoint {
  time: string;
  value: number;
}