// src/ai/genkit.ts
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [googleAI()],
  // CORRECCIÓN: El ID correcto no es 'gemini-3.0', sino 'gemini-3-flash-preview'
  model: 'googleai/gemini-3-flash-preview',
});