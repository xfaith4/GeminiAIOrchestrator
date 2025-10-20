import { GoogleGenAI } from "@google/genai";
import { PlanStep, ReviewResult, StepExecutionResult, Agent } from '../types';
import { 
    SUPERVISOR_INSTRUCTION, 
    SUPERVISOR_SCHEMA, 
    REVIEWER_INSTRUCTION, 
    REVIEWER_SCHEMA,
    getAgentInstruction,
    SYNTHESIZER_INSTRUCTION
} from '../constants';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function getJsonResponse<T>(model: string, instruction: string, prompt: string, schema: object): Promise<T> {
    const fullPrompt = `${instruction}\n\n---\n\nUser Goal/Context:\n"${prompt}"`;
    const response = await ai.models.generateContent({
        model: model,
        contents: fullPrompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: schema,
        }
    });

    try {
        let jsonStr = response.text.trim();
        // Handle potential markdown wrapping
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
    return getJsonResponse<PlanStep[]>('gemini-2.5-pro', SUPERVISOR_INSTRUCTION, goal, SUPERVISOR_SCHEMA);
}

export async function executeStep(step: PlanStep, context: string, retryReasoning?: string): Promise<StepExecutionResult> {
    const instruction = getAgentInstruction(step.agent, step.task, context, retryReasoning);
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: instruction,
        config: {
            // Note: Using a single prompt in `contents` is often more effective than systemInstruction for this model
        }
    });

    return { output: response.text };
}

export async function reviewStep(step: PlanStep, output: string, context: string): Promise<ReviewResult> {
    const prompt = `
        Original Task: "${step.task}"
        Agent Output: "${output}"
        ---
        Full Context:
        ${context}
    `;
    return getJsonResponse<ReviewResult>('gemini-2.5-pro', REVIEWER_INSTRUCTION, prompt, REVIEWER_SCHEMA);
}

export async function synthesizeFinalArtifact(context: string): Promise<string> {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: context,
        config: {
            systemInstruction: SYNTHESIZER_INSTRUCTION,
        },
    });

    return response.text;
}