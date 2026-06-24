function timeoutMessage(status: number): string | null {
  if (status === 408 || status === 504) {
    return "The request timed out. Try fewer sources, a lower fetch count, or load a saved corpus.";
  }
  return null;
}

/** Parse JSON API responses without surfacing Safari/WebKit's opaque parse errors. */
export async function parseApiJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const trimmed = text.trim();

  if (!trimmed) {
    throw new Error(
      timeoutMessage(response.status) ??
        `Server returned an empty response (HTTP ${response.status}).`,
    );
  }

  if (trimmed.startsWith("<")) {
    throw new Error(
      timeoutMessage(response.status) ??
        "Server returned an unexpected HTML error page. The fetch likely exceeded the hosting time limit — try fewer sources, a lower fetch count, or fetch Reddit/Community in smaller batches.",
    );
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(
      timeoutMessage(response.status) ??
        `Server returned an invalid response (HTTP ${response.status}). Try again with fewer sources.`,
    );
  }
}

/** Safari/WebKit surfaces failed response.json() as this opaque message. */
export function isRecoverableApiResponseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const lower = error.message.toLowerCase();
  return (
    lower.includes("did not match the expected pattern") ||
    lower.includes("unexpected end of json") ||
    lower.includes("invalid response") ||
    lower.includes("empty response") ||
    lower.includes("html error page") ||
    lower.includes("timed out") ||
    lower.includes("timeout")
  );
}
