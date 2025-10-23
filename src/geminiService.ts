// ### BEGIN FILE: src/geminiService.ts
// Browser-safe env access via Vite:
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const API_VERSION = (import.meta.env.VITE_GEMINI_API_VERSION as string) ?? 'v1';
const MODEL = (import.meta.env.VITE_GEMINI_MODEL as string) ?? 'gemini-1.5-flash';

function requireKey() {
  if (!API_KEY) throw new Error("Missing VITE_GEMINI_API_KEY in .env.local");
}

// --- Types (match your app's expectations) ---
export type PlanStep = {
  step: number;
  task: string;
  agent: string;                // e.g., "Supervisor"
  tool?: string | undefined;    // e.g., "github:getRepoTree"
  toolInput?: any;
};

// Util: basic POST to Gemini GenerateContent endpoint
async function geminiGenerate(textPrompt: string) {
  requireKey();
  const url = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${encodeURIComponent(MODEL)}:generateContent?key=${API_KEY}`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: textPrompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });

 if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Gemini HTTP ${resp.status}: ${body}`);
  }

  const data = await resp.json();
  const text =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).join('') ??
    data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  return String(text || '').trim();
}

// Parse a numbered plan from a freeform LLM response into PlanStep[] (very tolerant)
function parsePlanTextToSteps(planText: string): PlanStep[] {
  // Expect lines like: "1. Do X (Agent: Supervisor)" but accept loose text
  const lines = planText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const steps: PlanStep[] = [];

  let n = 1;
  for (const line of lines) {
    // Try "1. Task (Agent: Name)" first
    const m = line.match(/^\s*(\d+)[\.\)]\s+(.*?)(?:\s*\(Agent:\s*([^)]+)\))?\s*$/i);
    if (m) {
      const stepNum = Number(m[1]);
      const task = m[2].trim();
      const agent = (m[3]?.trim() || 'Supervisor');
      steps.push({ step: stepNum, task, agent });
      n = Math.max(n, stepNum + 1);
      continue;
    }

    // Fallback: treat any non-empty line as next step
    steps.push({
      step: n++,
      task: line,
      agent: 'Supervisor',
    });
  }

  // Last fallback if model returned nothing useful
  if (steps.length === 0) {
    steps.push({
      step: 1,
      task: 'Draft a short plan overview based on the goal and any provided file.',
      agent: 'Supervisor',
    });
  }
  return steps;
}

// Public API consumed by App.tsx and runOrchestrationLogic:

// 1) Create a multi-step plan from context (goal + optional file content)
export async function createPlan(context: string): Promise<PlanStep[]> {
  const prompt =
    `You are a Supervisor agent. Create a clear, numbered plan (3–6 steps). ` +
    `Each line should be "N. Task (Agent: <one of Supervisor, Web Researcher, Data Analyst, Reviewer, Synthesizer>)".\n\n` +
    `${context}`;

  const raw = await geminiGenerate(prompt);
  return parsePlanTextToSteps(raw);
}

// 2) Execute a step against the current scratchpad.
// Return an object with an `output` string (your app logs it and decides approve/retry via reviewStep).
export async function executeStep(
  step: PlanStep,
  scratchpad: string,
  retryReasoning: string | undefined
): Promise<{ output: string }> {
  const prompt =
    `You are the "${step.agent}" executing Step ${step.step}: "${step.task}".\n` +
    (retryReasoning ? `A prior attempt failed. Fix it. Reason: ${retryReasoning}\n` : '') +
    `Use the SCRATCHPAD for context and produce the best possible result.\n\n` +
    `--- SCRATCHPAD ---\n${scratchpad}\n--- END SCRATCHPAD ---`;

  const output = await geminiGenerate(prompt);
  return { output };
}

// 3) Review a step output and decide APPROVE or REVISE with reasoning
export async function reviewStep(
  step: PlanStep,
  stepOutput: string,
  scratchpad: string
): Promise<{ decision: 'APPROVE' | 'REVISE'; reasoning: string }> {
  const prompt =
    `You are a strict Reviewer. Evaluate the output for Step ${step.step} ("${step.task}"). ` +
    `Return ONLY one of the words APPROVE or REVISE on the first line, then a one-sentence reason on the next line.\n\n` +
    `--- OUTPUT ---\n${stepOutput}\n--- END OUTPUT ---\n\n` +
    `--- SCRATCHPAD ---\n${scratchpad}\n--- END SCRATCHPAD ---`;

  const raw = await geminiGenerate(prompt);
  const [first, ...rest] = raw.split(/\r?\n/);
  const decision = /^approve/i.test(first ?? '') ? 'APPROVE' : 'REVISE';
  const reasoning = (rest.join(' ').trim() || 'No reasoning provided.').slice(0, 500);
  return { decision, reasoning };
}

// 4) Synthesize final artifacts from the scratchpad
export async function synthesizeFinalArtifact(
  scratchpad: string
): Promise<Array<{ filename: string; content: string }>> {
  const prompt =
    `Create final useful artifacts from the SCRATCHPAD. If code is relevant, return a short README and one code file. ` +
    `Return the result as two blocks:\n` +
    `--- FILENAME: <name> ---\n<content>\n--- END FILE ---\n(repeat for any additional files)\n\n` +
    `--- SCRATCHPAD ---\n${scratchpad}\n--- END SCRATCHPAD ---`;

  const raw = await geminiGenerate(prompt);

  // Very lenient block parser
  const files: Array<{ filename: string; content: string }> = [];
  const regex = /---\s*FILENAME:\s*([^\n]+)\s*---\s*([\s\S]*?)---\s*END FILE\s*---/gi;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(raw)) !== null) {
    files.push({ filename: m[1].trim(), content: m[2].trim() });
  }

  if (files.length === 0) {
    files.push({ filename: 'README.txt', content: raw || 'No artifacts produced.' });
  }
  return files;
}
// ### END FILE: src/geminiService.ts
