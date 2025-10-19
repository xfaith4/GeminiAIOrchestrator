
import { GoogleGenAI, Type } from "@google/genai";
import { WORKER_AGENTS } from '../constants';
import { ScorerResult } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function runWorkerAgent(prompt: string, systemInstruction: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      systemInstruction: systemInstruction,
    },
  });
  return response.text;
}

export async function getWorkerResponses(prompt: string): Promise<string[]> {
  const promises = WORKER_AGENTS.map(agent => runWorkerAgent(prompt, agent.systemInstruction));
  return Promise.all(promises);
}

export async function getScorerResponse(prompt: string, responses: string[]): Promise<ScorerResult[]> {
  const scorerPrompt = `
    Original User Prompt: "${prompt}"

    ---

    Provided Responses:
    ${responses.map((res, i) => `Response ${i + 1}:\n"${res}"`).join('\n\n')}

    ---

    Your task is to act as an impartial evaluator. Based on the original user prompt, score each of the provided responses on a scale of 1 to 10, where 1 is "not helpful at all" and 10 is "perfectly addresses the prompt". Provide a brief reasoning for each score. Return your evaluation in a JSON array format that matches the required schema.
  `;

  const scorerModel = "gemini-2.5-pro";

  const response = await ai.models.generateContent({
    model: scorerModel,
    contents: scorerPrompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        description: 'An array of scores and reasonings for each response.',
        items: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.NUMBER,
              description: 'A score from 1 to 10 for the response.',
            },
            reasoning: {
              type: Type.STRING,
              description: 'A brief justification for the assigned score.',
            },
          },
          required: ['score', 'reasoning'],
        },
      },
    }
  });

  try {
    let jsonStr = response.text.trim();
    // It seems the API sometimes returns the JSON wrapped in markdown backticks
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
    }
    const result = JSON.parse(jsonStr);
    return result as ScorerResult[];
  } catch (error) {
    console.error("Failed to parse scorer response JSON:", response.text);
    throw new Error("Could not parse the scorer agent's response. Please try again.");
  }
}
