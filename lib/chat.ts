import {
  buildChatContextBlock,
  CHAT_SYSTEM_PROMPT,
} from "./chat-prompt";
import {
  isQuestionAnswerableFromContext,
  NO_RELEVANT_DATA_REPLY,
  noRelevantDataResponse,
} from "./chat-guard";
import { formatLlmError, isRetryableRateLimit } from "./llm-errors";
import {
  createGroqClient,
  generateChatJsonCompletion,
} from "./groq-client";
import type {
  AnalysisContext,
  ChatCitation,
  ChatMessage,
  ChatResponse,
} from "./types";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 4000;

interface RawChatResponse {
  insufficient_data?: boolean;
  reply?: string;
  citations?: ChatCitation[];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableRateLimit(error) || attempt === MAX_RETRIES) {
        throw error;
      }
      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw lastError;
}

function extractJson(content: string): RawChatResponse {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenced ? fenced[1].trim() : trimmed;
  return JSON.parse(jsonText) as RawChatResponse;
}

function normalizeChatResponse(raw: RawChatResponse): ChatResponse {
  if (raw.insufficient_data) {
    return { reply: NO_RELEVANT_DATA_REPLY };
  }

  const reply = raw.reply?.trim();
  if (!reply) {
    throw new Error("Model response missing reply field.");
  }

  if (
    reply.toLowerCase().includes("no relevant data found") ||
    reply.toLowerCase().includes("cannot be answered from")
  ) {
    return { reply: NO_RELEVANT_DATA_REPLY };
  }

  const citations = (raw.citations ?? [])
    .map((c) => ({
      label: c.label?.trim() ?? "",
      count: c.count,
      sources: c.sources?.filter(Boolean),
      quote: c.quote?.trim(),
    }))
    .filter((c) => c.label);

  return {
    reply,
    citations: citations.length > 0 ? citations : undefined,
  };
}

export async function generateChatReply(
  messages: ChatMessage[],
  context: AnalysisContext,
  apiKey: string,
): Promise<ChatResponse> {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (
    lastUser &&
    !isQuestionAnswerableFromContext(lastUser.content, context)
  ) {
    return noRelevantDataResponse();
  }

  const contextBlock = buildChatContextBlock(context);

  try {
    const content = await withRetry(async () => {
      const client = createGroqClient(apiKey);
      return generateChatJsonCompletion(
        client,
        CHAT_SYSTEM_PROMPT,
        contextBlock,
        messages,
        0.2,
      );
    });

    return normalizeChatResponse(extractJson(content));
  } catch (error) {
    if (error instanceof SyntaxError) {
      const client = createGroqClient(apiKey);
      const content = await generateChatJsonCompletion(
        client,
        CHAT_SYSTEM_PROMPT,
        contextBlock,
        messages,
        0.2,
      );
      return normalizeChatResponse(extractJson(content));
    }
    throw new Error(formatLlmError(error));
  }
}
