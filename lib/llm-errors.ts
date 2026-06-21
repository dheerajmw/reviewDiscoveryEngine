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

/** Groq / Cloudflare blocked the request (VPN, region, datacenter IP, firewall). */
export function isGroqNetworkBlockedError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("network settings") ||
    message.includes("blocked your network") ||
    message.includes("groq blocked access from this network")
  );
}

export function isGroqAuthError(error: unknown): boolean {
  if (isGroqNetworkBlockedError(error)) return false;

  const message = getErrorMessage(error).toLowerCase();
  const status = getErrorStatus(error);

  return (
    status === 401 ||
    message.includes("incorrect api key") ||
    message.includes("invalid api key provided") ||
    (message.includes("invalid groq_api_key") &&
      !message.includes("network")) ||
    (message.includes("unauthorized") && status === 401)
  );
}

/** Use rule-based mock when live Groq cannot be reached. */
export function shouldFallbackToMockOnGroqError(error: unknown): boolean {
  return isGroqNetworkBlockedError(error) || isGroqAuthError(error);
}

export function groqFallbackWarning(error: unknown): string {
  if (isGroqNetworkBlockedError(error)) {
    return (
      "Groq blocked access from this network (VPN, region, or firewall). " +
      "Using demo classification for this run. Try another network or set USE_MOCK_CLASSIFIER=true."
    );
  }
  if (isGroqAuthError(error)) {
    return (
      "Groq rejected the API key. Using demo classification for this run. " +
      "Update GROQ_API_KEY in .env.local or set USE_MOCK_CLASSIFIER=true."
    );
  }
  return "Groq unavailable. Using demo classification for this run.";
}

export function formatLlmError(error: unknown): string {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();
  const status = getErrorStatus(error);

  if (isRateLimited(error)) {
    return (
      "Groq rate limit hit (llama-3.3-70b-versatile: 30 req/min, 12K tok/min). " +
      "Wait and retry, reduce the review count (~100/day on free tier), or set USE_MOCK_CLASSIFIER=true."
    );
  }

  if (
    lower.includes("billing") ||
    lower.includes("insufficient") ||
    lower.includes("credits") ||
    (lower.includes("quota") && lower.includes("exceeded"))
  ) {
    return (
      "Groq daily quota exhausted (free tier: 1K req/day, 100K tok/day). " +
      "Resume tomorrow, reduce the review count, split into repository batches, or set USE_MOCK_CLASSIFIER=true."
    );
  }

  if (isGroqNetworkBlockedError(error)) {
    return (
      "Groq blocked access from this network (VPN, region, or firewall). " +
      "Try a different network, disable VPN, or set USE_MOCK_CLASSIFIER=true for demo mode."
    );
  }

  if (isGroqAuthError(error)) {
    return "Invalid GROQ_API_KEY. Create one at console.groq.com/keys.";
  }

  if (status === 403) {
    return (
      "Groq denied this request (403). Check credits at console.groq.com, " +
      "or set USE_MOCK_CLASSIFIER=true for demo mode."
    );
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
