// src/ai/genkit.ts
// Multi-key Genkit pool with automatic rotation on failure
import { genkit, type Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

const MODEL = 'googleai/gemini-3-flash-preview';

// Collect all API keys from environment variables
function getApiKeys(): string[] {
  const keys: string[] = [];
  // Primary key
  const primary = process.env.GEMINI_API_KEY;
  if (primary) keys.push(primary);

  // Additional keys: GEMINI_API_KEY_2, GEMINI_API_KEY_3, etc.
  for (let i = 2; i <= 10; i++) {
    const key = process.env[`GEMINI_API_KEY_${i}`];
    if (key) keys.push(key);
  }

  if (keys.length === 0) {
    throw new Error('No GEMINI_API_KEY found in environment variables.');
  }
  return keys;
}

// Create a Genkit instance for a specific API key
function createAiInstance(apiKey: string): Genkit {
  return genkit({
    plugins: [googleAI({ apiKey })],
    model: MODEL,
  });
}

// Pool of AI instances
const apiKeys = getApiKeys();
const aiInstances: Genkit[] = apiKeys.map(createAiInstance);

// Round-robin index
let currentIndex = 0;

// Get the current "default" AI instance
export const ai: Genkit = aiInstances[0];

/**
 * Execute an AI operation with automatic key rotation on failure.
 * Tries each key once before giving up.
 * 
 * @param operation - A function that receives a Genkit instance and performs the AI call
 * @returns The result of the operation
 */
export async function withKeyRotation<T>(
  operation: (aiInstance: Genkit) => Promise<T>
): Promise<T> {
  const totalKeys = aiInstances.length;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < totalKeys; attempt++) {
    const index = (currentIndex + attempt) % totalKeys;
    const instance = aiInstances[index];

    try {
      const result = await operation(instance);
      // On success, move the pointer to the next key for load distribution
      currentIndex = (index + 1) % totalKeys;
      return result;
    } catch (error: any) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const errorMsg = lastError.message.toLowerCase();

      // Only retry on quota/rate/availability errors
      const isRetryable =
        errorMsg.includes('503') ||
        errorMsg.includes('429') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('rate') ||
        errorMsg.includes('high demand') ||
        errorMsg.includes('resource exhausted') ||
        errorMsg.includes('unavailable');

      if (!isRetryable) {
        throw lastError; // Non-retryable error, fail immediately
      }

      console.warn(
        `[Key Rotation] Key #${index + 1} failed (${isRetryable ? 'retryable' : 'fatal'}). ` +
        `${attempt + 1}/${totalKeys} keys tried. Error: ${lastError.message.substring(0, 100)}`
      );
    }
  }

  // All keys exhausted
  throw new Error(
    `Todas las ${totalKeys} claves de API se han agotado. ` +
    `Último error: ${lastError?.message || 'Unknown'}. ` +
    `Intenta de nuevo en unos minutos.`
  );
}

export function getKeyCount(): number {
  return apiKeys.length;
}