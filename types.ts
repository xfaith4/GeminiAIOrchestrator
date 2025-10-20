// Fix: Add declarations for window properties for external libraries used in GoalInput.tsx.
declare global {
    interface Window {
        mammoth: any;
        XLSX: any;
    }
}

// Fix: Define and export Agent type. This was previously causing a circular dependency.
export type Agent = 'Web Researcher' | 'Data Analyst' | 'Report Writer' | 'Code Generator' | 'GitHub Tool User';

// Fix: Define and export PlanStep interface, which was previously missing.
export interface PlanStep {
  step: number;
  task: string;
  agent: Agent;
  dependencies: number[];
}

// Fix: Define and export LogEntry interface, which was previously missing.
export interface LogEntry {
  agent: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'warning' | 'error';
}

// Fix: Define and export UploadedFile interface, which was previously missing.
export interface UploadedFile {
  name: string;
  content: string;
}

// Fix: Define and export ReviewResult interface, which was previously missing.
export interface ReviewResult {
  decision: 'APPROVE' | 'REVISE';
  reasoning: string;
}

// Fix: Define and export StepExecutionResult interface, which was previously missing.
export interface StepExecutionResult {
  output: string;
}
