export const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

export const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

export function getOpenRouterApiKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY;
}

export function getOpenRouterHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Title": process.env.OPENROUTER_APP_NAME ?? "Review Discovery Engine",
  };

  const siteUrl = process.env.OPENROUTER_SITE_URL;
  if (siteUrl) {
    headers["HTTP-Referer"] = siteUrl;
  }

  return headers;
}
