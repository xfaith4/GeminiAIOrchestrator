import * as geminiService from './geminiService';
import * as openaiService from './openaiService';
import type { Provider } from './types';

// Unified service interface that works with both Gemini and OpenAI
export const createPlan = async (context: string, provider: Provider) => {
  if (provider === 'Gemini') {
    return await geminiService.createPlan(context);
  } else {
    // OpenAI service has the same interface
    return await (openaiService as any).createPlan(context);
  }
};

export const createPlanWithMeta = async (context: string, provider: Provider) => {
  if (provider === 'Gemini') {
    return await geminiService.createPlanWithMeta(context);
  } else {
    return await (openaiService as any).createPlanWithMeta(context);
  }
};

export const executeStep = async (step: any, scratchpad: string, retryReasoning = "", provider: Provider) => {
  if (provider === 'Gemini') {
    return await geminiService.executeStep(step, scratchpad, retryReasoning);
  } else {
    return await (openaiService as any).executeStep(step, scratchpad, retryReasoning);
  }
};

export const reviewStep = async (step: any, stepOutput: string, scratchpad: string, provider: Provider) => {
  if (provider === 'Gemini') {
    return await geminiService.reviewStep(step, stepOutput, scratchpad);
  } else {
    return await (openaiService as any).reviewStep(step, stepOutput, scratchpad);
  }
};

export const synthesizeFinalArtifactWithMeta = async (scratchpad: string, provider: Provider) => {
  if (provider === 'Gemini') {
    return await geminiService.synthesizeFinalArtifactWithMeta(scratchpad);
  } else {
    return await (openaiService as any).synthesizeFinalArtifactWithMeta(scratchpad);
  }
};

export const synthesizeFinalArtifact = async (scratchpad: string, provider: Provider) => {
  if (provider === 'Gemini') {
    return await geminiService.synthesizeFinalArtifact(scratchpad);
  } else {
    return await (openaiService as any).synthesizeFinalArtifact(scratchpad);
  }
};
