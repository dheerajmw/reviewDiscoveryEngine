/** Cerebras Cloud LLM configuration (OpenAI-compatible API). */

export const LLM_PROVIDER = "cerebras" as const;

export const LLM_PROVIDER_LABEL = "Cerebras Cloud";

export const LLM_CONSOLE_URL = "https://cloud.cerebras.ai";

/** Production default — 65,536 context (see cloud.cerebras.ai → Limits). */
export const LLM_MODEL =
  process.env.CEREBRAS_MODEL?.trim() ||
  process.env.LLM_MODEL?.trim() ||
  process.env.GROQ_MODEL?.trim() ||
  "gpt-oss-120b";

export const LLM_BASE_URL = (
  process.env.CEREBRAS_BASE_URL?.trim() ||
  process.env.LLM_BASE_URL?.trim() ||
  process.env.GROQ_BASE_URL?.trim() ||
  "https://api.cerebras.ai/v1"
).replace(/\/$/, "");

export function getLlmApiKey(): string | undefined {
  const key =
    process.env.CEREBRAS_API_KEY?.trim() ||
    process.env.LLM_API_KEY?.trim() ||
    process.env.GROQ_API_KEY?.trim();
  return key || undefined;
}

/** @deprecated Use LLM_MODEL */
export const GEMINI_MODEL = LLM_MODEL;

/** @deprecated Use getLlmApiKey */
export function getGeminiApiKey(): string | undefined {
  return getLlmApiKey();
}
