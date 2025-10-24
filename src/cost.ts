// Cost estimation utilities for Gemini API calls
// Based on current Gemini API pricing (as of 2025)

// Gemini API pricing per 1,000 tokens (as of 2025)
// Note: Prices are subject to change, check https://ai.google.dev/pricing for latest rates
const PRICING: Record<string, { inputPer1k: number; outputPer1k: number }> = {
  'gemini-2.5-flash': { inputPer1k: 0.000075, outputPer1k: 0.0003 },
  'gemini-2.5-pro': { inputPer1k: 0.00125, outputPer1k: 0.005 },
  'gemini-2.0-flash': { inputPer1k: 0.0001, outputPer1k: 0.0004 },
  'gemini-2.0-flash-lite': { inputPer1k: 0.000075, outputPer1k: 0.0003 },
  'gemini-1.5-flash': { inputPer1k: 0.000075, outputPer1k: 0.0003 },
  'gemini-1.5-pro': { inputPer1k: 0.00125, outputPer1k: 0.005 },
  'gemini-1.0-pro': { inputPer1k: 0.0005, outputPer1k: 0.0015 },
  'gemini-pro': { inputPer1k: 0.0005, outputPer1k: 0.0015 },
  'gemini-pro-vision': { inputPer1k: 0.0005, outputPer1k: 0.0015 },
};

/**
 * Estimate the cost in USD for a Gemini API call
 * @param model - The model name (e.g., 'gemini-2.5-flash')
 * @param promptTokens - Number of input/prompt tokens
 * @param outputTokens - Number of output tokens
 * @param modality - The type of content ('text', 'image', 'audio', 'video')
 * @returns Object with inputUSD, outputUSD, and totalUSD
 */
export function estimateUSD(
  model: string,
  promptTokens: number,
  outputTokens: number,
  modality: "text" | "image" | "audio" | "video" = "text"
): { inputUSD: number; outputUSD: number; totalUSD: number } {
  // Get pricing for the model, fallback to flash pricing if not found
  const pricing = PRICING[model] || PRICING['gemini-2.5-flash'];

  // Calculate costs (pricing is per 1,000 tokens, so divide by 1000)
  const inputUSD = (promptTokens / 1000) * pricing.inputPer1k;
  const outputUSD = (outputTokens / 1000) * pricing.outputPer1k;
  const totalUSD = inputUSD + outputUSD;

  return {
    inputUSD: Math.round(inputUSD * 1e6) / 1e6, // Round to 6 decimal places
    outputUSD: Math.round(outputUSD * 1e6) / 1e6,
    totalUSD: Math.round(totalUSD * 1e6) / 1e6,
  };
}

/**
 * Determine the modality from content parts
 * @param parts - Array of content parts from Gemini API
 * @returns The detected modality ('text', 'image', 'audio', 'video')
 */
export function pickModalityFromParts(
  parts: Array<{ text?: string; image?: any; audio?: any; video?: any }> | undefined
): "text" | "image" | "audio" | "video" {
  if (!parts || parts.length === 0) {
    return "text";
  }

  // Check each part for non-text content
  for (const part of parts) {
    if (part.image) return "image";
    if (part.video) return "video";
    if (part.audio) return "audio";
  }

  // Default to text if only text content found
  return "text";
}
