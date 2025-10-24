/* eslint-disable @typescript-eslint/no-explicit-any */
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const API_VERSION = import.meta.env.VITE_GEMINI_API_VERSION || "v1";
const DEFAULT_MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";

import { estimateUSD, pickModalityFromParts } from "./cost";
import type { CostBreakdown, PlanStep } from "./types";

type Candidate = { content?: { parts?: Array<{ text?: string }>} };
type Usage = { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };

export type GeminiCallResult = {
  text: string;
  usage?: { promptTokens:number; outputTokens:number; totalTokens:number };
  cost?: CostBreakdown;
};

function errWrap(resp: Response, body: any) {
  const status = resp.status;
  const msg = typeof body === "string" ? body : JSON.stringify(body);
  throw new Error(`Gemini HTTP ${status}: ${msg}`);
}

async function listModels(): Promise<string[]> {
  const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models?key=${API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) errWrap(r, await r.text());
  const j = await r.json();
  return (j?.models ?? [])
    .map((m: any) => String(m?.name ?? "").replace(/^models\//, ""))
    .filter(Boolean);
}

async function callModel(
  model: string,
  contents: any
): Promise<{ data:any; effectiveModel:string }> {
  const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${model}:generateContent?key=${API_KEY}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type":"application/json" },
    body: JSON.stringify({ contents }),
  });
  if (r.status === 404) {
    console.warn(`[Gemini] ${model} 404. Listing models and retrying with a supported one...`);
    const names = await listModels();
    const prefer = ["gemini-2.5-flash","gemini-2.5-pro","gemini-2.0-flash","gemini-2.0-flash-lite"];
    const fallback = prefer.find(p => names.includes(p)) ?? names[0];
    if (!fallback) errWrap(r, await r.text());

    const r2 = await fetch(
      `https://generativelanguage.googleapis.com/${API_VERSION}/models/${fallback}:generateContent?key=${API_KEY}`,
      { method: "POST", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ contents }) }
    );
    if (!r2.ok) errWrap(r2, await r2.text());
    return { data: await r2.json(), effectiveModel: fallback };
  }
  if (!r.ok) errWrap(r, await r.text());
  return { data: await r.json(), effectiveModel: model };
}

function extractText(data:any): string {
  const cands: Candidate[] = data?.candidates ?? [];
  const parts = cands[0]?.content?.parts ?? [];
  return parts.map(p => p?.text ?? "").join("").trim();
}

function toCost(model:string, usage:Usage, modality:"text"|"image"|"audio"|"video"="text"): {usageOut: GeminiCallResult["usage"], cost: CostBreakdown} {
  const promptTokens = usage?.promptTokenCount ?? 0;
  const outputTokens = usage?.candidatesTokenCount ?? 0;
  const totalTokens = usage?.totalTokenCount ?? (promptTokens + outputTokens);
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

export async function createPlanWithMeta(context: string): Promise<{ plan: any[]; usage?: GeminiCallResult["usage"]; cost?: CostBreakdown }> {
  const prompt = [
    { role: "user", parts: [{ text: `Create a concise 3–6 step plan for:\n${context}\n` }] }
  ];
  const { data, effectiveModel } = await callModel(DEFAULT_MODEL, prompt);
  const text = extractText(data);

  // Parse tolerant JSON list; allow bullet/numbered fallback
  let plan: any[] = [];
  try {
    plan = JSON.parse(text);
    if (!Array.isArray(plan)) throw new Error("not array");
  } catch {
    plan = String(text).split(/\n+/).map((line, i) => ({ step: i + 1, task: line, agent: "Supervisor", dependencies: [] }));
  }

  const usage: Usage = data?.usageMetadata ?? {};
  const { usageOut, cost } = toCost(effectiveModel, usage, "text");
  return { plan, usage: usageOut, cost };
}

export async function executeStep(step: any, scratchpad: string, retryReasoning = ""): Promise<{ output:string; usage?: GeminiCallResult["usage"]; cost?: CostBreakdown }> {
  const parts = [
    { text: `You are ${step.agent}. Execute the task:\n${step.task}\n\nContext:\n${scratchpad}\n${retryReasoning ? `\nReviewer feedback:\n${retryReasoning}\n` : ""}` }
  ].map(t => ({ text: (t as any).text }));

  const contents = [{ role:"user", parts }];
  const { data, effectiveModel } = await callModel(DEFAULT_MODEL, contents);
  const text = extractText(data);

  const usage: Usage = data?.usageMetadata ?? {};
  const { usageOut, cost } = toCost(effectiveModel, usage, pickModalityFromParts(parts));
  return { output: text, usage: usageOut, cost };
}

export async function reviewStep(step:any, stepOutput:string, scratchpad:string): Promise<{ decision:"APPROVE"|"REVISE"; reasoning:string; usage?: GeminiCallResult["usage"]; cost?: CostBreakdown }> {
  const prompt = [
    { role:"user", parts:[{ text:
`You are a strict reviewer. Consider the step and its output.

Step: ${step.step} - ${step.task} (Agent: ${step.agent})
Output:
${stepOutput}

Context:
${scratchpad}

Respond ONLY as JSON:
{"decision":"APPROVE"|"REVISE","reasoning":"<short>"}`
    }]}
  ];
  const { data, effectiveModel } = await callModel(DEFAULT_MODEL, prompt);
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

  const usage: Usage = data?.usageMetadata ?? {};
  const { usageOut, cost } = toCost(effectiveModel, usage, "text");
  return { decision, reasoning, usage: usageOut, cost };
}

export async function synthesizeFinalArtifactWithMeta(scratchpad: string): Promise<{ artifacts: Array<{name:string; content:string}>; usage?: GeminiCallResult["usage"]; cost?: CostBreakdown }> {
  const prompt = [
    { role:"user", parts:[{ text:
`Synthesize a final workspace from this scratchpad.
Return JSON array of files: [{"name":"README.md","content":"..."}]

Scratchpad:
${scratchpad}`
    }]}
  ];
  const { data, effectiveModel } = await callModel(DEFAULT_MODEL, prompt);
  const text = extractText(data);

  let files: Array<{name:string; content:string}> = [];
  try {
    const arr = JSON.parse(text);
    if (Array.isArray(arr)) {
      files = arr.map((x:any) => ({ name: String(x?.name ?? "artifact.txt"), content: String(x?.content ?? "") }));
    } else {
      files = [{ name:"artifact.txt", content:text }];
    }
  } catch {
    files = [{ name:"artifact.txt", content:text }];
  }

  const usage: Usage = data?.usageMetadata ?? {};
  const { usageOut, cost } = toCost(effectiveModel, usage, "text");
  return { artifacts: files, usage: usageOut, cost };
}

// Back-compat wrapper (old signature)
export async function synthesizeFinalArtifact(scratchpad: string) {
  const { artifacts } = await synthesizeFinalArtifactWithMeta(scratchpad);
  return artifacts;
}
