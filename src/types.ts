import * as geminiService from './geminiService';
import * as githubService from './githubService';

// This makes TypeScript aware of the external libraries loaded via script tags in index.html
declare global {
  interface Window {
    mammoth: any;
    XLSX: any;
    marked: any;
  }
}

export type Agent = 
  | 'Web Researcher' 
  | 'Data Analyst' 
  | 'Report Writer' 
  | 'Code Generator' 
  | 'GitHub Tool User'
  | 'Supervisor'
  | 'Reviewer'
  | 'Synthesizer'
  | 'Orchestrator'
  | 'User';

export interface PlanStep {
    step: number;
    task: string;
    agent: Agent;
    dependencies: number[];
    tool?: string; // e.g., 'github:getRepoTree'
    toolInput?: Record<string, any>; // e.g., { "repoUrl": "..." }
}

export type PlanState = 'idle' | 'generating' | 'awaitingApproval' | 'executing' | 'finished';

export interface LogEntry {
    timestamp: Date;
    agent: Agent;
    message: string;
    type: 'info' | 'warning' | 'error';
}

export interface ReviewResult {
    decision: 'APPROVE' | 'REVISE';
    reasoning: string;
}

export interface StepExecutionResult {
    output: string;
    error?: string;
}

export interface UploadedFile {
    name: string;
    content: string;
}

export interface Artifact {
  name: string;
  content: string;
  language: 'markdown' | 'json' | 'javascript' | 'python' | 'sql' | 'image' | 'video' | 'text';
}

export interface Session {
    id: string;
    timestamp: number;
    goal: string;
    uploadedFile: UploadedFile | null;
    plan: PlanStep[];
    logEntries: LogEntry[];
    scratchpad: string;
    artifacts: Artifact[] | null;
    error: string | null;
    cost?: number; // Optional cost field for session cost tracking
}

export interface OrchestrationServices {
  gemini: typeof geminiService;
  github: typeof githubService;
  select: {
    selectFiles: (fileTree: Array<{ path: string; type: string }>, context: string, step: any) => Promise<{ files: string[] }>;
  };
}

export interface OrchestrationParams {
  goal: string;
  uploadedFile: UploadedFile | null;
  services: OrchestrationServices;
  onLog: (agent: Agent, message: string, type?: 'info' | 'warning' | 'error') => void;
  onPlanUpdate?: (plan: PlanStep[]) => void; // Optional plan update callback
  onScratchpadUpdate: (scratchpad: string) => string; // Returns the current scratchpad
  onStepUpdate: (stepIndex: number) => void;
  onFinalArtifact: (artifacts: Artifact[]) => void;
  onCost?: (cost: number, label: string) => void; // Optional cost tracking callback
}

export interface CostBreakdown {
  model: string;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputUSD: number;
  outputUSD: number;
  totalUSD: number;
  modality: string;
  at: string;
  stepId?: string;
  timestamp?: number;
}

export interface TestResult {
    logs: LogEntry[];
    error: string | null;
    passed: boolean;
}
