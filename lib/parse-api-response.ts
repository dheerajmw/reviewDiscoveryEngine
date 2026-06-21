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
        "Server returned an unexpected HTML error page. Try fewer sources or a lower fetch count.",
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
