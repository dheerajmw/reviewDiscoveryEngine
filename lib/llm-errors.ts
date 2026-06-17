import OpenAI from "openai";

interface ApiErrorLike {
  status?: number;
  message?: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function getErrorStatus(error: unknown): number | undefined {
  if (error instanceof OpenAI.APIError) return error.status;
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as ApiErrorLike).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

function isRateLimited(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  const status = getErrorStatus(error);
  return (
    status === 429 ||
    message.includes("resource exhausted") ||
    message.includes("too many requests") ||
    message.includes("rate limit")
  );
}

export function formatLlmError(error: unknown): string {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();
  const status = getErrorStatus(error);

  if (isRateLimited(error)) {
    return "OpenRouter rate limit hit. Wait a moment and retry, or test with a smaller CSV. Set USE_MOCK_CLASSIFIER=true to skip the API.";
  }

  if (
    lower.includes("billing") ||
    lower.includes("insufficient") ||
    lower.includes("credits") ||
    (lower.includes("quota") && lower.includes("exceeded"))
  ) {
    return "OpenRouter credits exhausted. Add credits at openrouter.ai/settings/credits, or set USE_MOCK_CLASSIFIER=true for demo mode.";
  }

  if (
    status === 401 ||
    status === 403 ||
    lower.includes("api key") ||
    lower.includes("unauthorized") ||
    lower.includes("permission denied")
  ) {
    return "Invalid OPENROUTER_API_KEY. Create one at openrouter.ai/keys.";
  }

  return message;
}

export function isQuotaError(error: unknown): boolean {
  const lower = getErrorMessage(error).toLowerCase();
  return (
    lower.includes("billing") ||
    lower.includes("insufficient") ||
    lower.includes("credits") ||
    (lower.includes("quota") && lower.includes("exceeded"))
  );
}

export function isRetryableRateLimit(error: unknown): boolean {
  return isRateLimited(error) && !isQuotaError(error);
}
