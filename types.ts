export interface WorkerAgent {
  name: string;
  systemInstruction: string;
  model: string;
}

export interface AgentResponse {
  agentName: string;
  response: string;
  score: number | null;
  reasoning: string | null;
}

export interface ScorerResult {
  score: number;
  reasoning: string;
}

export interface AgentTemplate {
  name: string;
  description: string;
  agents: WorkerAgent[];
}