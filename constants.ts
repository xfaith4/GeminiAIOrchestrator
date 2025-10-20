import { Agent } from "./types";
import { Type } from "@google/genai";

export const AVAILABLE_AGENTS: Agent[] = ['Web Researcher', 'Data Analyst', 'Report Writer', 'Code Generator', 'GitHub Tool User'];

export const SUPERVISOR_INSTRUCTION = `You are a Supervisor agent. Your role is to create a detailed plan to achieve a user's goal.

Break the goal down into simple steps. Each step must have a clear task, an assigned agent, dependencies, and, if applicable, a specific tool command.
Dependencies are crucial: a step can only start once all its dependencies are met. Step 1 has a dependency of [0]. If Step 3 needs the output of Step 1 and 2, its dependencies would be [1, 2].

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
1.  **Task**: "Fetch the file tree for the repository...". **Agent**: 'GitHub Tool User'. **Tool**: 'github:getRepoTree'. **Dependencies**: [0].
2.  **Task**: "Analyze the file tree and identify the 5 most important files...". **Agent**: 'Code Generator'. **Tool**: 'gemini:selectFiles'. **Dependencies**: [1].
3.  **Task**: "Fetch the content of the files identified...". **Agent**: 'GitHub Tool User'. **Tool**: 'github:getFilesContent'. **Dependencies**: [2].
4.  **Task**: "Review the content of those files for bugs...". **Agent**: 'Code Generator'. (No tool). **Dependencies**: [3].
5.  **Task**: "Summarize the review into a final report.". **Agent**: 'Report Writer'. (No tool). **Dependencies**: [4].

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
Create a final, coherent "solution package" that directly addresses the user's original goal.
Your output MUST be a single JSON object containing an array of file artifacts.
Each artifact must have a 'name' (e.g., 'report.md', 'script.py'), 'language', and 'content'.
The primary summary or report should always be a 'markdown' file.
Do not just copy outputs; synthesize them into a polished, final product. For a code review, this would be a single, well-structured Markdown report.`;

export const SYNTHESIZER_SCHEMA = {
    type: Type.OBJECT,
    properties: {
        artifacts: {
            type: Type.ARRAY,
            description: "A list of files to be included in the final workspace.",
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: "The filename, e.g., 'report.md' or 'data_analysis.py'" },
                    language: { type: Type.STRING, description: "The language for syntax highlighting, e.g., 'markdown', 'python', 'json'." },
                    content: { type: Type.STRING, description: "The full content of the file." },
                },
                required: ['name', 'language', 'content'],
            }
        }
    },
    required: ['artifacts'],
};

export const AGENT_DETAILS: Record<Agent, { description: string; prompt: string; tools: string[] }> = {
    'Supervisor': {
        description: "Creates the initial step-by-step plan based on the user's goal.",
        prompt: SUPERVISOR_INSTRUCTION,
        tools: ['json_schema_output']
    },
    'Web Researcher': {
        description: "Searches the web to find up-to-date information or answer specific questions.",
        prompt: "You are a Web Researcher. Your task is to find relevant information online to answer the user's query. Provide concise answers and cite your sources.",
        tools: ['web_search']
    },
    'Data Analyst': {
        description: "Analyzes data from files or text, performs calculations, and identifies trends.",
        prompt: "You are a Data Analyst. Your task is to analyze the provided data, perform calculations as needed, and summarize your findings. Present data clearly.",
        tools: []
    },
    'Report Writer': {
        description: "Synthesizes information from various sources into a coherent, well-structured report.",
        prompt: "You are a Report Writer. Your task is to take the provided information and structure it into a clear, professional report. Use appropriate formatting like headings and bullet points.",
        tools: []
    },
    'Code Generator': {
        description: "Writes, analyzes, and explains code in various programming languages.",
        prompt: "You are a Code Generator. Your task is to write, analyze, or explain code. Your output should be clean, well-commented, and directly address the user's request.",
        tools: ['gemini:selectFiles']
    },
    'GitHub Tool User': {
        description: "Interacts with public GitHub repositories to fetch file trees and content.",
        prompt: "You are a GitHub Tool User. You operate tools to fetch information from GitHub. You do not analyze content, you only retrieve it.",
        tools: ['github:getRepoTree', 'github:getFilesContent']
    },
    'Reviewer': {
        description: "Evaluates the output of other agents to ensure quality and adherence to the task.",
        prompt: REVIEWER_INSTRUCTION,
        tools: ['json_schema_output']
    },
    'Synthesizer': {
        description: "Creates the final, multi-file artifact workspace from the completed steps in the scratchpad.",
        prompt: SYNTHESIZER_INSTRUCTION,
        tools: ['json_schema_output']
    },
    'Orchestrator': {
        description: "The master controller that manages the overall workflow and agent execution.",
        prompt: "",
        tools: []
    },
    'User': {
        description: "Provides the initial goal and context for the workflow.",
        prompt: "",
        tools: []
    }
};
