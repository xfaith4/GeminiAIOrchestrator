import * as geminiService from './services/geminiService';
import * as githubService from './services/githubService';

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

export interface Session {
    id: string;
    timestamp: number;
    goal: string;
    uploadedFile: UploadedFile | null;
    plan: PlanStep[];
    logEntries: LogEntry[];
    scratchpad: string;
    artifact: string | null;
    error: string | null;
}

export interface OrchestrationServices {
  gemini: typeof geminiService;
  github: typeof githubService;
}

export interface OrchestrationParams {
  goal: string;
  uploadedFile: UploadedFile | null;
  services: OrchestrationServices;
  onLog: (agent: Agent, message: string, type?: 'info' | 'warning' | 'error') => void;
  onPlanUpdate: (plan: PlanStep[]) => void;
  onScratchpadUpdate: (scratchpad: string) => void;
  onStepUpdate: (stepIndex: number) => void;
  onFinalArtifact: (artifact: string) => void;
}

export interface TestResult {
    logs: LogEntry[];
    error: string | null;
    passed: boolean;
}