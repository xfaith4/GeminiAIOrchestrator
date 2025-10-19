
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
