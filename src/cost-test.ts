// Test file to verify cost module imports and functionality
import { estimateUSD, pickModalityFromParts } from './cost';

// Test the functions
const testCost = estimateUSD('gemini-2.5-flash', 1000, 500, 'text');
console.log('Cost calculation result:', testCost);

const testModality = pickModalityFromParts([{ text: 'Hello world' }]);
console.log('Modality detection result:', testModality);

export { testCost, testModality };
