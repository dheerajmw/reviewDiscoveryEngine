import {
  LLM_API_KEY_ENV,
  LLM_CONSOLE_URL,
  LLM_PROVIDER_LABEL,
} from "./llm-config";
import { LLM_RATE_LIMITS } from "./llm-limits";

interface ApiErrorLike {
  status?: number;
  message?: string;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function getErrorStatus(error: unknown): number | undefined {
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as ApiErrorLike).status;
    return typeof status === "number" ? status : undefined;
  }
  return undefined;
}

function isDailyQuotaMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("per day") ||
    lower.includes("daily") ||
    lower.includes("tpd") ||
    lower.includes("tokens per day") ||
    lower.includes("requests per day") ||
    lower.includes("rpd")
  );
}

function isTransientQuotaMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("per minute") ||
    lower.includes("per hour") ||
    lower.includes("tpm") ||
    lower.includes("rpm") ||
    lower.includes("tph") ||
    lower.includes("rph")
  );
}

function isRateLimited(error: unknown): boolean {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();
  const status = getErrorStatus(error);
  if (status === 429) return true;
  return (
    lower.includes("resource exhausted") ||
    lower.includes("too many requests") ||
    lower.includes("rate limit") ||
    isTransientQuotaMessage(message) ||
    (lower.includes("quota") &&
      lower.includes("exceeded") &&
      !isDailyQuotaMessage(message))
  );
}

export function isRetryableServerError(error: unknown): boolean {
  const status = getErrorStatus(error);
  return status === 502 || status === 503 || status === 504;
}

/** Network / region / firewall blocked the LLM request. */
export function isLlmNetworkBlockedError(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes("network settings") ||
    message.includes("blocked your network") ||
    message.includes("connection error") ||
    message.includes("econnrefused") ||
    message.includes("fetch failed")
  );
}

export function isLlmAuthError(error: unknown): boolean {
  if (isLlmNetworkBlockedError(error)) return false;

  const message = getErrorMessage(error).toLowerCase();
  const status = getErrorStatus(error);

  return (
    status === 401 ||
    (status === 403 && message.includes("api key")) ||
    message.includes("api key not valid") ||
    message.includes("invalid api key") ||
    message.includes("authentication") ||
    message.includes("invalid authentication") ||
    (message.includes("permission denied") && message.includes("api key")) ||
    (message.includes("unauthorized") && status === 401)
  );
}

/** Use rule-based mock when live LLM cannot be reached. */
export function shouldFallbackToMockOnLlmError(error: unknown): boolean {
  return isLlmNetworkBlockedError(error) || isLlmAuthError(error);
}

export function llmFallbackWarning(error: unknown): string {
  if (isLlmNetworkBlockedError(error)) {
    return (
      `${LLM_PROVIDER_LABEL} could not be reached from this network (VPN, region, or firewall). ` +
      "Using demo classification for this run. Try another network or set USE_MOCK_CLASSIFIER=true."
    );
  }
  if (isLlmAuthError(error)) {
    return (
      `${LLM_PROVIDER_LABEL} rejected the API key. Using demo classification for this run. ` +
      `Update ${LLM_API_KEY_ENV} in .env.local or set USE_MOCK_CLASSIFIER=true.`
    );
  }
  return "LLM unavailable. Using demo classification for this run.";
}

export function formatLlmError(error: unknown): string {
  const message = getErrorMessage(error);
  const status = getErrorStatus(error);

  if (isRateLimited(error) && !isQuotaError(error)) {
    return (
      `${LLM_PROVIDER_LABEL} rate limit hit (${LLM_RATE_LIMITS.requestsPerMinute} RPM / ` +
      `${LLM_RATE_LIMITS.tokensPerMinute.toLocaleString()} TPM). Wait ~15s and click Analyze again — ` +
      "cached reviews will be skipped. Lower LLM_CLASSIFY_BATCH_SIZE if truncation persists."
    );
  }

  if (isQuotaError(error)) {
    return (
      `${LLM_PROVIDER_LABEL} daily quota exhausted. Check usage at ${LLM_CONSOLE_URL}, ` +
      "split into repository batches, or set USE_MOCK_CLASSIFIER=true."
    );
  }

  if (isRetryableServerError(error)) {
    return (
      `${LLM_PROVIDER_LABEL} is temporarily overloaded. Wait a minute and retry, or try a different model.`
    );
  }

  if (isLlmNetworkBlockedError(error)) {
    return (
      `${LLM_PROVIDER_LABEL} could not be reached from this network. ` +
      "Try a different network, disable VPN, or set USE_MOCK_CLASSIFIER=true for demo mode."
    );
  }

  if (isLlmAuthError(error)) {
    return `Invalid ${LLM_API_KEY_ENV}. Create one at ${LLM_CONSOLE_URL} → API keys.`;
  }

  if (status === 403) {
    return (
      `${LLM_PROVIDER_LABEL} denied this request (403). Check API access at ${LLM_CONSOLE_URL}, ` +
      "or set USE_MOCK_CLASSIFIER=true for demo mode."
    );
  }

  return message;
}

export function isQuotaError(error: unknown): boolean {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();
  const status = getErrorStatus(error);

  // Cerebras returns 429 + "quota exceeded" for per-minute limits — not daily TPD.
  if (status === 429 && !isDailyQuotaMessage(message)) {
    return false;
  }
  if (isTransientQuotaMessage(message)) {
    return false;
  }

  return (
    lower.includes("billing") ||
    lower.includes("insufficient") ||
    lower.includes("credits") ||
    isDailyQuotaMessage(message) ||
    (lower.includes("quota") && lower.includes("exceeded") && isDailyQuotaMessage(message))
  );
}

export function isTransientRateLimit(error: unknown): boolean {
  return isRateLimited(error) && !isQuotaError(error);
}

export function isRetryableRateLimit(error: unknown): boolean {
  return isTransientRateLimit(error) || isRetryableServerError(error);
}
