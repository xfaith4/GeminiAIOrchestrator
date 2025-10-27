/* eslint-disable @typescript-eslint/no-explicit-any */
import OpenAI from 'openai';

const API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const DEFAULT_MODEL = import.meta.env.VITE_OPENAI_MODEL || "gpt-4o";

import { estimateUSD } from "./cost";
import type { CostBreakdown, PlanStep } from "./types";

type Usage = { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };

export type OpenAICallResult = {
  text: string;
  usage?: { promptTokens:number; outputTokens:number; totalTokens:number };
  cost?: CostBreakdown;
};

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!API_KEY) {
    throw new Error("OpenAI API key not configured. Please set VITE_OPENAI_API_KEY environment variable.");
  }
  if (!openai) {
    openai = new OpenAI({
      apiKey: API_KEY,
      dangerouslyAllowBrowser: true // Note: In production, API calls should be made from backend
    });
  }
  return openai;
}

function errWrap(error: any) {
  throw new Error(`OpenAI API Error: ${error.message || error}`);
}

async function callModel(
  model: string,
  messages: Array<{role: string, content: string}>
): Promise<{ data:any; effectiveModel:string }> {
  const client = getOpenAIClient();
  try {
    const completion = await client.chat.completions.create({
      model,
      messages: messages as any,
    });

    return {
      data: completion,
      effectiveModel: model
    };
  } catch (error: any) {
    if (error.status === 404 || error.code === 'model_not_found') {
      console.warn(`[OpenAI] ${model} not available. Falling back to ${DEFAULT_MODEL}...`);
      try {
        const completion = await client.chat.completions.create({
          model: DEFAULT_MODEL,
          messages: messages as any,
        });
        return {
          data: completion,
          effectiveModel: DEFAULT_MODEL
        };
      } catch (fallbackError: any) {
        errWrap(fallbackError);
        // This line will never be reached due to throw, but TypeScript needs it
        return { data: null, effectiveModel: DEFAULT_MODEL };
      }
    }
    errWrap(error);
    // This line will never be reached due to throw, but TypeScript needs it
    return { data: null, effectiveModel: model };
  }
}

function extractText(data: any): string {
  return data?.choices?.[0]?.message?.content || "";
}

function toCost(model: string, usage: Usage, modality: "text" | "image" | "audio" | "video" = "text"): {usageOut: OpenAICallResult["usage"], cost: CostBreakdown} {
  const promptTokens = usage?.prompt_tokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? 0;
  const totalTokens = usage?.total_tokens ?? (promptTokens + outputTokens);
  const { inputUSD, outputUSD, totalUSD } = estimateUSD(model, promptTokens, outputTokens, modality);
  return {
    usageOut: { promptTokens, outputTokens, totalTokens },
    cost: {
      model, promptTokens, outputTokens, totalTokens,
      inputUSD, outputUSD, totalUSD, modality,
      at: new Date().toISOString(),
    }
  };
}

/* ============================
 * Public API (back-compatible)
 * ============================ */

export async function createPlan(context: string): Promise<{ plan: PlanStep[]; cost?: CostBreakdown }> {
  const { plan, cost } = await createPlanWithMeta(context);
  return { plan, cost };
}

export async function createPlanWithMeta(context: string): Promise<{ plan: any[]; usage?: OpenAICallResult["usage"]; cost?: CostBreakdown }> {
  const messages = [
    {
      role: "user",
      content: `You are a Supervisor Agent responsible for creating a detailed execution plan.
Your job is to DELEGATE tasks to specialist agents, NOT to do the work yourself.

Available specialist agents and their capabilities:
- Web Researcher: Search the web, gather information from URLs, research topics
- Data Analyst: Analyze data, create visualizations, perform statistical analysis
- Report Writer: Write reports, documentation, summaries, and narratives
- Code Generator: Write code in various languages (Python, JavaScript, SQL, etc.)
- GitHub Tool User: Interact with GitHub repositories (fetch files, analyze code)

Instructions:
1. Create a 3-6 step plan to accomplish the user's goal
2. IMPORTANT: Assign each task to the MOST APPROPRIATE specialist agent from the list above
3. DO NOT assign tasks to "Supervisor" - you should only plan and delegate
4. Each step should be atomic and have clear outputs
5. Use the "dependencies" field to indicate which previous steps must complete first (use step numbers)

Respond ONLY with a JSON array in this exact format:
[
  {
    "step": 1,
    "task": "Clear description of what needs to be done",
    "agent": "Name of specialist agent from the list",
    "dependencies": []
  }
]

User Goal:
${context}

Return ONLY the JSON array, no other text.`
    }
  ];

  const { data, effectiveModel } = await callModel(DEFAULT_MODEL, messages);
  const text = extractText(data);

  // Parse tolerant JSON list; allow bullet/numbered fallback
  let plan: any[] = [];
  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonText = text;
    const jsonMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    plan = JSON.parse(jsonText);
    if (!Array.isArray(plan)) throw new Error("not array");

    // Validate and fix agent assignments - ensure no "Supervisor" agents doing work
    plan = plan.map((step: any) => {
      const agent = String(step?.agent ?? "").trim();
      // If agent is Supervisor or empty, try to infer from task
      if (!agent || agent === "Supervisor") {
        const task = String(step?.task ?? "").toLowerCase();
        if (task.includes("code") || task.includes("script") || task.includes("program")) {
          step.agent = "Code Generator";
        } else if (task.includes("research") || task.includes("search") || task.includes("web")) {
          step.agent = "Web Researcher";
        } else if (task.includes("analyze") || task.includes("data") || task.includes("statistics")) {
          step.agent = "Data Analyst";
        } else if (task.includes("write") || task.includes("report") || task.includes("document")) {
          step.agent = "Report Writer";
        } else if (task.includes("github") || task.includes("repository") || task.includes("repo")) {
          step.agent = "GitHub Tool User";
        } else {
          // Default to Report Writer for general tasks
          step.agent = "Report Writer";
        }
      }
      return step;
    });
  } catch {
    // If parsing completely fails, create a simple plan with proper agent assignment
    const lines = String(text).split(/\n+/).filter(l => l.trim());
    plan = lines.map((line, i) => {
      const task = line.replace(/^\d+[\.)]\s*/, '').replace(/^[-*]\s*/, '').trim();
      if (!task) return null;

      // Infer agent from task content
      const taskLower = task.toLowerCase();
      let agent = "Report Writer"; // default
      if (taskLower.includes("code") || taskLower.includes("script") || taskLower.includes("program")) {
        agent = "Code Generator";
      } else if (taskLower.includes("research") || taskLower.includes("search") || taskLower.includes("web")) {
        agent = "Web Researcher";
      } else if (taskLower.includes("analyze") || taskLower.includes("data") || taskLower.includes("statistics")) {
        agent = "Data Analyst";
      } else if (taskLower.includes("github") || taskLower.includes("repository") || taskLower.includes("repo")) {
        agent = "GitHub Tool User";
      }

      return {
        step: i + 1,
        task,
        agent,
        dependencies: []
      };
    }).filter(Boolean);
  }

  const usage: Usage = data?.usage ?? {};
  const { usageOut, cost } = toCost(effectiveModel, usage, "text");
  return { plan, usage: usageOut, cost };
}

export async function executeStep(step: any, scratchpad: string, retryReasoning = ""): Promise<{ output:string; usage?: OpenAICallResult["usage"]; cost?: CostBreakdown }> {
  const agentGuidance: Record<string, string> = {
    "Web Researcher": "As a Web Researcher, provide detailed findings with sources and citations. Format your output clearly.",
    "Data Analyst": "As a Data Analyst, provide thorough analysis with insights. Include data summaries and findings.",
    "Report Writer": "As a Report Writer, create well-structured, complete documents. Write full content, not summaries.",
    "Code Generator": "As a Code Generator, write complete, working code with proper syntax. Include all necessary imports and functions.",
    "GitHub Tool User": "As a GitHub Tool User, work with repository data effectively. Provide structured output.",
  };

  const guidance = agentGuidance[step.agent] || "Complete the task thoroughly and provide detailed output.";

  const messages = [
    {
      role: "user",
      content: `You are ${step.agent}, a specialist agent. ${guidance}

Task to complete:
${step.task}

Context and previous work:
${scratchpad}
${retryReasoning ? `\nReviewer feedback that must be addressed:\n${retryReasoning}\n` : ""}

Provide complete, detailed output for this task. Do not summarize or provide placeholders - deliver the actual work product.`
    }
  ];

  const { data, effectiveModel } = await callModel(DEFAULT_MODEL, messages);
  const text = extractText(data);

  const usage: Usage = data?.usage ?? {};
  const { usageOut, cost } = toCost(effectiveModel, usage, "text");
  return { output: text, usage: usageOut, cost };
}

export async function reviewStep(step:any, stepOutput:string, scratchpad:string): Promise<{ decision:"APPROVE"|"REVISE"; reasoning:string; usage?: OpenAICallResult["usage"]; cost?: CostBreakdown }> {
  const messages = [
    {
      role: "user",
      content: `You are a strict reviewer. Consider the step and its output.

Step: ${step.step} - ${step.task} (Agent: ${step.agent})
Output:
${stepOutput}

Context:
${scratchpad}

Respond ONLY as JSON:
{"decision":"APPROVE"|"REVISE","reasoning":"<short>"}`
    }
  ];

  const { data, effectiveModel } = await callModel(DEFAULT_MODEL, messages);
  const text = extractText(data);

  let decision:"APPROVE"|"REVISE" = "APPROVE";
  let reasoning = "Looks good.";
  try {
    const j = JSON.parse(text);
    decision = (j.decision === "REVISE") ? "REVISE" : "APPROVE";
    reasoning = String(j.reasoning ?? reasoning);
  } catch {
    // fall through with defaults
  }

  const usage: Usage = data?.usage ?? {};
  const { usageOut, cost } = toCost(effectiveModel, usage, "text");
  return { decision, reasoning, usage: usageOut, cost };
}

export async function synthesizeFinalArtifactWithMeta(scratchpad: string): Promise<{ artifacts: Array<{name:string; content:string}>; usage?: OpenAICallResult["usage"]; cost?: CostBreakdown }> {
  const messages = [
    {
      role: "user",
      content: `You are a Synthesizer Agent. Your job is to create the FINAL DELIVERABLE artifacts based on the work completed by the specialist agents.

IMPORTANT INSTRUCTIONS:
1. Examine the scratchpad to understand what work was performed
2. Create the ACTUAL artifacts that fulfill the user's original goal
3. DO NOT just create a README.md summary - create the actual deliverables
4. If code was written, include it as separate .py, .js, .sql files etc.
5. If HTML was created, include the actual .html file with complete content
6. If data analysis was done, include the results as .json or .md files
7. If reports were written, include them as .md files
8. You MAY include a README.md as ONE of multiple files to document the workspace

Examples:
- If goal was "Create an HTML page", output: [{"name":"index.html","content":"<!DOCTYPE html>...complete HTML..."}, {"name":"README.md","content":"Documentation..."}]
- If goal was "Analyze data", output: [{"name":"analysis.json","content":"...data..."}, {"name":"summary.md","content":"...findings..."}]
- If goal was "Write Python script", output: [{"name":"script.py","content":"...complete code..."}, {"name":"README.md","content":"...usage docs..."}]

Respond ONLY with a JSON array in this format:
[
  {"name": "filename.ext", "content": "complete file content here"},
  {"name": "another.ext", "content": "complete file content here"}
]

Review the scratchpad below and create the actual deliverable artifacts:

Scratchpad:
${scratchpad}

Return ONLY the JSON array of artifacts. DO NOT return just a summary or status report - return the actual work products.`
    }
  ];

  const { data, effectiveModel } = await callModel(DEFAULT_MODEL, messages);
  const text = extractText(data);

  let files: Array<{name:string; content:string}> = [];
  try {
    // Try to extract JSON from markdown code blocks if present
    let jsonText = text;
    const jsonMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const arr = JSON.parse(jsonText);
    if (Array.isArray(arr)) {
      files = arr.map((x:any) => ({
        name: String(x?.name ?? "artifact.txt"),
        content: String(x?.content ?? "")
      }));

      // Validate we have actual artifacts, not just a README
      const hasOnlyReadme = files.length === 1 && files[0].name.toLowerCase().includes("readme");
      if (hasOnlyReadme) {
        console.warn("Synthesizer returned only a README. This may indicate the artifacts were not properly extracted from the scratchpad.");
      }
    } else {
      files = [{ name:"artifact.txt", content:text }];
    }
  } catch {
    // If JSON parsing fails, create a plain text artifact
    files = [{ name:"output.txt", content:text }];
  }

  const usage: Usage = data?.usage ?? {};
  const { usageOut, cost } = toCost(effectiveModel, usage, "text");
  return { artifacts: files, usage: usageOut, cost };
}

// Back-compat wrapper (old signature)
export async function synthesizeFinalArtifact(scratchpad: string) {
  const { artifacts } = await synthesizeFinalArtifactWithMeta(scratchpad);
  return artifacts;
}
