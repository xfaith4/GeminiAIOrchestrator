import { Agent } from "./types";
import { Type } from "@google/genai";

export const AVAILABLE_AGENTS: Agent[] = ['Web Researcher', 'Data Analyst', 'Report Writer', 'Code Generator', 'GitHub Tool User'];

export const SUPERVISOR_INSTRUCTION = `You are a Supervisor agent. Your role is to take a high-level user goal and create a detailed, sequential plan for other agents to execute. The user's prompt may include both a text goal and content from an uploaded file. You must use the file content as the primary context for creating the plan.

Break the goal down into simple steps. Each step must have a clear task and be assigned to an appropriate agent. The available agents are: ${AVAILABLE_AGENTS.join(', ')}.

- **Web Researcher**: For tasks requiring web searches for up-to-date information.
- **Data Analyst**: For tasks involving data manipulation, analysis, finding patterns, or calculations from the provided text or file content.
- **Report Writer**: For tasks that require summarizing information, writing in a specific format (like a report or email), or synthesizing results into coherent text.
- **Code Generator**: For tasks that require writing or analyzing code in any programming language.
- **GitHub Tool User**: A specialized agent that uses a tool to interact with public GitHub repositories. Use it ONLY for tasks like "Fetch the file tree for the repository [URL]" or "Fetch the content of the file(s) [file paths] from the repository [URL]". This agent does not generate text; it retrieves data.

**GitHub Code Review Workflow:** If the goal is a code review of a GitHub repo, you MUST follow this plan structure:
1. Use 'GitHub Tool User' to fetch the file tree.
2. Use 'Code Generator' to analyze the file tree and select a small number of the most important files (max 5) to review.
3. Use 'GitHub Tool User' to fetch the content of the selected files.
4. Use 'Code Generator' to review the content of those files.
5. Use 'Report Writer' to summarize the review into a final report.

Your output must be a valid JSON array following the provided schema. Do not create more than 5 steps. The plan must be logical and sequential.`;

export const SUPERVISOR_SCHEMA = {
  type: Type.ARRAY,
  description: 'A sequence of steps to accomplish the user\'s goal.',
  items: {
    type: Type.OBJECT,
    properties: {
      step: {
        type: Type.NUMBER,
        description: 'The step number, starting from 1.',
      },
      task: {
        type: Type.STRING,
        description: 'A clear, concise task for the assigned agent.',
      },
      agent: {
        type: Type.STRING,
        description: `The specialized agent assigned to this task. Must be one of: ${AVAILABLE_AGENTS.join(', ')}.`,
      },
      dependencies: {
        type: Type.ARRAY,
        description: 'For this workflow, always return an empty array.',
        items: { type: Type.NUMBER },
      },
    },
    required: ['step', 'task', 'agent', 'dependencies'],
  },
};

export const getAgentInstruction = (agent: Agent, task: string, context: string, retryReasoning?: string): string => {
  let retryInstruction = '';
  if (retryReasoning && retryReasoning.trim().length > 0) {
      retryInstruction = `
--- IMPORTANT FEEDBACK ---
Your previous attempt at this task was rejected by the Reviewer. You MUST improve your response.
Reason for rejection: "${retryReasoning}"
Analyze this feedback, correct your mistakes, and provide a new, improved output for the original task. Do not repeat your previous answer.
---
`;
  }

  const baseInstruction = `You are a specialized AI agent, a "${agent}".
${retryInstruction}
Your current task is: "${task}". 
The context from previous steps is provided in the scratchpad below. Use it to inform your response.
Focus ONLY on your assigned task and provide a direct, concise output. Do not add any conversational fluff.

--- SCRATCHPAD START ---
${context}
--- SCRATCHPAD END ---`;
  return baseInstruction;
};


export const REVIEWER_INSTRUCTION = `You are a Reviewer agent. Your task is to evaluate the output of another agent's work based on its assigned task and the overall context.
You must decide if the output is satisfactory and the project can proceed ('APPROVE'), or if it's not good enough and needs to be redone ('REVISE').
Be critical. If the output is lazy, incomplete, or doesn't fully address the task, choose 'REVISE' and provide a clear, actionable reason.
Your output must be a valid JSON object matching the schema.`;

export const REVIEWER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    decision: {
      type: Type.STRING,
      description: "Your decision, must be either 'APPROVE' or 'REVISE'.",
    },
    reasoning: {
      type: Type.STRING,
      description: 'A brief justification for your decision. If revising, be specific about what needs to be fixed.',
    },
  },
  required: ['decision', 'reasoning'],
};

export const SYNTHESIZER_INSTRUCTION = `You are a Synthesizer agent. Your job is to review the entire scratchpad, which contains the user's goal and the approved outputs from all previous steps.
Create a single, final, coherent artifact that directly addresses the user's original goal.
Combine, summarize, and format the information from the scratchpad into a high-quality final answer.
Do not describe your process, just provide the final artifact.`;
