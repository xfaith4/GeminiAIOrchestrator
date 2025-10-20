import { GoogleGenAI } from "@google/genai";
import { PlanStep, ReviewResult, StepExecutionResult, Agent, Artifact } from '../types';
import { 
    SUPERVISOR_INSTRUCTION, 
    SUPERVISOR_SCHEMA, 
    REVIEWER_INSTRUCTION, 
    REVIEWER_SCHEMA,
    getAgentInstruction,
    SYNTHESIZER_INSTRUCTION,
    SYNTHESIZER_SCHEMA,
    FILE_SELECTION_SCHEMA
} from '../constants';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function getJsonResponse<T>(model: string, prompt: string, schema: object): Promise<T> {
    const response = await ai.models.generateContent({
        model: model,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
        }
    });

    try {
        let jsonStr = response.text.trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        }
        return JSON.parse(jsonStr) as T;
    } catch (error) {
        console.error("Failed to parse JSON response:", response.text, error);
        throw new Error("The AI model returned an invalid JSON format.");
    }
}

export async function createPlan(goal: string): Promise<PlanStep[]> {
    const fullPrompt = `${SUPERVISOR_INSTRUCTION}\n\n---\n\nUser Goal/Context:\n"${goal}"`;
    return getJsonResponse<PlanStep[]>('gemini-2.5-pro', fullPrompt, SUPERVISOR_SCHEMA);
}

export async function executeStep(step: PlanStep, context: string, retryReasoning?: string): Promise<StepExecutionResult> {
    const instruction = getAgentInstruction(step.agent, step.task, context, retryReasoning);
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: instruction,
    });

    return { output: response.text };
}

export async function executeStepAsJson<T>(step: PlanStep, context: string, retryReasoning?: string): Promise<T> {
    const instruction = getAgentInstruction(step.agent, step.task, context, retryReasoning);
    return getJsonResponse<T>('gemini-2.5-pro', instruction, FILE_SELECTION_SCHEMA);
}


export async function reviewStep(step: PlanStep, output: string, context: string): Promise<ReviewResult> {
    const promptContent = `
        Original Task: "${step.task}"
        Agent Output: "${output}"
        ---
        Full Context:
        ${context}
    `;
    const fullPrompt = `${REVIEWER_INSTRUCTION}\n\n---\n\nContext:\n"${promptContent}"`;
    return getJsonResponse<ReviewResult>('gemini-2.5-pro', fullPrompt, REVIEWER_SCHEMA);
}

export async function synthesizeFinalArtifact(context: string): Promise<Artifact[]> {
    const result = await getJsonResponse<{ artifacts: Artifact[] }>(
        'gemini-2.5-pro',
        context,
        SYNTHESIZER_SCHEMA
    );
    return result.artifacts;
}
