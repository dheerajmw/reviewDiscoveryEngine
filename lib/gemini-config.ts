export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

export function getGeminiApiKey(): string | undefined {
  const key =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  return key || undefined;
}
