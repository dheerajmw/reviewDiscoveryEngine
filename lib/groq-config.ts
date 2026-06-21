export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

export const GROQ_MODEL =
  process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

export function getGroqApiKey(): string | undefined {
  const key = process.env.GROQ_API_KEY?.trim();
  return key || undefined;
}
