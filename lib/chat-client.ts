import type { AnalysisContext, ChatMessage, ChatResponse } from "./types";

interface ChatApiResponse extends ChatResponse {
  mock?: boolean;
  error?: string;
}

export async function fetchChatReply(
  messages: ChatMessage[],
  context: AnalysisContext,
): Promise<{ response: ChatResponse; mock: boolean }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context }),
  });

  const data = (await res.json()) as ChatApiResponse;

  if (!res.ok) {
    throw new Error(data.error ?? "Chat request failed.");
  }

  return {
    response: { reply: data.reply, citations: data.citations },
    mock: data.mock ?? false,
  };
}
