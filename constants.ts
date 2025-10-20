import { Agent } from "./types";
import { Type } from "@google/genai";

export const AVAILABLE_AGENTS: Agent[] = ['Web Researcher', 'Data Analyst', 'Report Writer', 'Code Generator', 'GitHub Tool User'];

export const SUPERVISOR_INSTRUCTION = `You are a Supervisor agent. Your role is to create a detailed, sequential plan to achieve a user's goal.

Break the goal down into simple steps. Each step must have a clear task, an assigned agent, and, if applicable, a specific tool command.

**Available Agents:**
- **Web Researcher**: For web searches.
- **Data Analyst**: For data analysis and calculations.
- **Report Writer**: For summarizing or formatting text.
- **Code Generator**: For writing or analyzing code.
- **GitHub Tool User**: A specialized agent that uses tools to interact with public GitHub repos.

**Tool Commands:**
Some agents use tools. When a tool is needed, you MUST specify it in the 'tool' and 'toolInput' fields.
- To get a repository's file list:
  - agent: 'GitHub Tool User'
  - tool: 'github:getRepoTree'
  - toolInput: { "repoUrl": "THE_FULL_URL" }
- To select the most important files for a review (max 5):
  - agent: 'Code Generator'
  - tool: 'gemini:selectFiles'
- To get the content of specific files:
  - agent: 'GitHub Tool User'
  - tool: 'github:getFilesContent'
  - toolInput: { "repoUrl": "THE_FULL_URL" } // The previous step's output will provide the file paths.
- For all other steps (e.g., analyzing content, writing reports), do NOT include a 'tool' field.

**GitHub Code Review Workflow Example:**
If the goal is "review the repo at https://github.com/owner/repo", you MUST create a plan like this:
1.  **Task**: "Fetch the file tree for the repository...". **Agent**: 'GitHub Tool User'. **Tool**: 'github:getRepoTree'.
2.  **Task**: "Analyze the file tree and identify the 5 most important files...". **Agent**: 'Code Generator'. **Tool**: 'gemini:selectFiles'.
3.  **Task**: "Fetch the content of the files identified...". **Agent**: 'GitHub Tool User'. **Tool**: 'github:getFilesContent'.
4.  **Task**: "Review the content of those files for bugs...". **Agent**: 'Code Generator'. (No tool)
5.  **Task**: "Summarize the review into a final report.". **Agent**: 'Report Writer'. (No tool)

Your output must be a valid JSON array following the provided schema. Do not create more than 5 steps.`;

export const SUPERVISOR_SCHEMA = {
  type: Type.ARRAY,
  description: 'A sequence of steps to accomplish the user\'s goal.',
  items: {
    type: Type.OBJECT,
    properties: {
      step: { type: Type.NUMBER },
      task: { type: Type.STRING },
      agent: { type: Type.STRING, description: `Must be one of: ${AVAILABLE_AGENTS.join(', ')}.` },
      dependencies: { type: Type.ARRAY, items: { type: Type.NUMBER } },
      tool: { type: Type.STRING, description: "Optional. The specific tool command to execute." },
      toolInput: {
        type: Type.OBJECT,
        description: "Optional. Arguments for the tool. For GitHub tools, this must contain a 'repoUrl'.",
        properties: {
          repoUrl: {
            type: Type.STRING,
            description: "The full URL of the public GitHub repository, e.g., 'https://github.com/owner/repo'."
          }
        }
      },
    },
    required: ['step', 'task', 'agent', 'dependencies'],
  },
};

export const FILE_SELECTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    files: {
      type: Type.ARRAY,
      description: 'An array of the most important file paths for the code review.',
      items: { type: Type.STRING },
    },
  },
  required: ['files'],
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
**Your output MUST be in well-structured Markdown format.** Use headings, bullet points, bold text, and code blocks where appropriate to create a professional and readable document.
Do not describe your process, just provide the final Markdown artifact.`;