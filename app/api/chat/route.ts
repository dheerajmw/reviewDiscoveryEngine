import { NextResponse } from "next/server";
import { isMockClassifierEnabled } from "@/lib/classify-mock";
import { generateChatMock } from "@/lib/chat-mock";
import { generateChatReply } from "@/lib/chat";
import {
  isQuestionAnswerableFromContext,
  noRelevantDataResponse,
} from "@/lib/chat-guard";
import { getLlmApiKey } from "@/lib/llm-config";
import {
  llmFallbackWarning,
  shouldFallbackToMockOnLlmError,
} from "@/lib/llm-errors";
import type { AnalysisContext, ChatMessage } from "@/lib/types";

function isValidContext(context: unknown): context is AnalysisContext {
  if (!context || typeof context !== "object") return false;
  const c = context as AnalysisContext;
  return (
    typeof c.totalReviews === "number" &&
    typeof c.discoveryRelevantCount === "number" &&
    c.evidence !== undefined &&
    c.findings !== undefined &&
    typeof c.findings.why_discovery_fails === "string"
  );
}

function isValidMessages(messages: unknown): messages is ChatMessage[] {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every(
      (m) =>
        m &&
        typeof m === "object" &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
  );
}

export async function POST(request: Request) {
  let body: { messages?: ChatMessage[]; context?: AnalysisContext };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { messages, context } = body;

  if (!isValidMessages(messages)) {
    return NextResponse.json(
      { error: "Request must include a non-empty messages array." },
      { status: 400 },
    );
  }

  if (!isValidContext(context)) {
    return NextResponse.json(
      { error: "Request must include a valid analysis context." },
      { status: 400 },
    );
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user") {
    return NextResponse.json(
      { error: "Last message must be from the user." },
      { status: 400 },
    );
  }

  if (!isQuestionAnswerableFromContext(lastMessage.content, context)) {
    return NextResponse.json({ ...noRelevantDataResponse(), mock: false });
  }

  if (isMockClassifierEnabled()) {
    const response = generateChatMock(lastMessage.content, context);
    return NextResponse.json({ ...response, mock: true });
  }

  const apiKey = getLlmApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "CEREBRAS_API_KEY is not configured. Add it to .env.local, or set USE_MOCK_CLASSIFIER=true for demo mode.",
      },
      { status: 500 },
    );
  }

  try {
    const response = await generateChatReply(messages, context, apiKey);
    return NextResponse.json({ ...response, mock: false });
  } catch (error) {
    if (shouldFallbackToMockOnLlmError(error)) {
      const response = generateChatMock(lastMessage.content, context);
      return NextResponse.json({
        ...response,
        mock: true,
        llmFallback: true,
        warning: llmFallbackWarning(error),
      });
    }

    const message =
      error instanceof Error ? error.message : "Chat request failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
