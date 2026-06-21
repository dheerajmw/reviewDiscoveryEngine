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

function isRateLimited(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();
  const status = getErrorStatus(error);
  return (
    status === 429 ||
    message.includes("resource exhausted") ||
    message.includes("too many requests") ||
    message.includes("rate limit") ||
    message.includes("quota exceeded")
  );
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
    (message.includes("permission denied") && message.includes("api key")) ||
    (message.includes("unauthorized") && status === 401)
  );
}

/** Use rule-based mock when live Gemini cannot be reached. */
export function shouldFallbackToMockOnLlmError(error: unknown): boolean {
  return isLlmNetworkBlockedError(error) || isLlmAuthError(error);
}

export function llmFallbackWarning(error: unknown): string {
  if (isLlmNetworkBlockedError(error)) {
    return (
      "Gemini could not be reached from this network (VPN, region, or firewall). " +
      "Using demo classification for this run. Try another network or set USE_MOCK_CLASSIFIER=true."
    );
  }
  if (isLlmAuthError(error)) {
    return (
      "Gemini rejected the API key. Using demo classification for this run. " +
      "Update GEMINI_API_KEY in .env.local or set USE_MOCK_CLASSIFIER=true."
    );
  }
  return "Gemini unavailable. Using demo classification for this run.";
}

export function formatLlmError(error: unknown): string {
  const message = getErrorMessage(error);
  const lower = message.toLowerCase();
  const status = getErrorStatus(error);

  if (isRateLimited(error) && !isQuotaError(error)) {
    return (
      "Gemini rate limit hit. Wait and retry, reduce the review count, " +
      "split into repository batches, or set USE_MOCK_CLASSIFIER=true."
    );
  }

  if (isQuotaError(error)) {
    return (
      "Gemini quota exhausted. Check usage at aistudio.google.com, " +
      "reduce the review count, split into repository batches, or set USE_MOCK_CLASSIFIER=true."
    );
  }

  if (isLlmNetworkBlockedError(error)) {
    return (
      "Gemini could not be reached from this network. " +
      "Try a different network, disable VPN, or set USE_MOCK_CLASSIFIER=true for demo mode."
    );
  }

  if (isLlmAuthError(error)) {
    return "Invalid GEMINI_API_KEY. Create one at aistudio.google.com/apikey.";
  }

  if (status === 403) {
    return (
      "Gemini denied this request (403). Check API access at aistudio.google.com, " +
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
    lower.includes("quota exceeded") ||
    (lower.includes("quota") && lower.includes("exceeded"))
  );
}

export function isRetryableRateLimit(error: unknown): boolean {
  return isRateLimited(error) && !isQuotaError(error);
}
