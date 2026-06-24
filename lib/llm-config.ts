/** OpenAI-compatible LLM configuration (Groq default, Cerebras optional). */

export type LlmProviderId = "groq" | "cerebras";

/** Best Groq balance for ReviewLens taxonomy classification (Developer plan). */
export const GROQ_DEFAULT_MODEL =
  "meta-llama/llama-4-scout-17b-16e-instruct";

const PROVIDER_META: Record<
  LlmProviderId,
  { label: string; consoleUrl: string; defaultBaseUrl: string; apiKeyEnv: string }
> = {
  groq: {
    label: "Groq",
    consoleUrl: "https://console.groq.com",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    apiKeyEnv: "GROQ_API_KEY",
  },
  cerebras: {
    label: "Cerebras Cloud",
    consoleUrl: "https://cloud.cerebras.ai",
    defaultBaseUrl: "https://api.cerebras.ai/v1",
    apiKeyEnv: "CEREBRAS_API_KEY",
  },
};

export function getLlmProvider(): LlmProviderId {
  const explicit = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (explicit === "groq" || explicit === "cerebras") return explicit;
  return "groq";
}

export const LLM_PROVIDER = getLlmProvider();

export const LLM_PROVIDER_LABEL = PROVIDER_META[LLM_PROVIDER].label;

export const LLM_CONSOLE_URL = PROVIDER_META[LLM_PROVIDER].consoleUrl;

export const LLM_API_KEY_ENV = PROVIDER_META[LLM_PROVIDER].apiKeyEnv;

export const LLM_MODEL = (() => {
  const shared = process.env.LLM_MODEL?.trim();
  if (shared) return shared;
  if (LLM_PROVIDER === "groq") {
    return process.env.GROQ_MODEL?.trim() || GROQ_DEFAULT_MODEL;
  }
  return (
    process.env.CEREBRAS_MODEL?.trim() ||
    process.env.GROQ_MODEL?.trim() ||
    "gpt-oss-120b"
  );
})();

export const LLM_BASE_URL = (
  process.env.LLM_BASE_URL?.trim() ||
  (LLM_PROVIDER === "groq"
    ? process.env.GROQ_BASE_URL?.trim()
    : process.env.CEREBRAS_BASE_URL?.trim()) ||
  process.env.GROQ_BASE_URL?.trim() ||
  process.env.CEREBRAS_BASE_URL?.trim() ||
  PROVIDER_META[LLM_PROVIDER].defaultBaseUrl
).replace(/\/$/, "");

export function getLlmApiKey(): string | undefined {
  if (LLM_PROVIDER === "groq") {
    const key =
      process.env.GROQ_API_KEY?.trim() || process.env.LLM_API_KEY?.trim();
    return key || undefined;
  }
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
