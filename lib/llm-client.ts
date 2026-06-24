import { LLM_BASE_URL, LLM_MODEL, LLM_PROVIDER } from "./llm-config";
import { getLlmMaxOutputTokens } from "./llm-limits";

export interface LlmClient {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export function createLlmClient(apiKey: string): LlmClient {
  return { apiKey, baseUrl: LLM_BASE_URL, model: LLM_MODEL };
}

/** @deprecated Use createLlmClient */
export const createGeminiClient = createLlmClient;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices?: {
    message?: { content?: string };
    finish_reason?: string;
  }[];
  error?: { message?: string; type?: string; code?: string };
}

export class LlmOutputTruncatedError extends Error {
  constructor(message = "Model output truncated before JSON completed.") {
    super(message);
    this.name = "LlmOutputTruncatedError";
  }
}

async function parseApiError(response: Response, bodyText: string): Promise<Error> {
  let message = bodyText || `HTTP ${response.status}`;
  try {
    const parsed = JSON.parse(bodyText) as ChatCompletionResponse;
    if (parsed.error?.message) {
      message = parsed.error.message;
    }
  } catch {
    // use raw body
  }
  const error = new Error(message);
  (error as Error & { status?: number }).status = response.status;
  return error;
}

function outputTokenLimit(capped: number): Record<string, number> {
  if (LLM_PROVIDER === "cerebras" || LLM_BASE_URL.includes("cerebras.ai")) {
    return { max_completion_tokens: capped };
  }
  return { max_tokens: capped };
}

function cerebrasRequestExtras(): Record<string, string> {
  if (LLM_PROVIDER !== "cerebras" && !LLM_BASE_URL.includes("cerebras.ai")) {
    return {};
  }
  // gpt-oss models emit reasoning tokens by default; "low" keeps JSON output reliable.
  if (LLM_MODEL.includes("gpt-oss")) {
    return { reasoning_effort: "low" };
  }
  return {};
}

async function chatCompletion(
  client: LlmClient,
  messages: ChatMessage[],
  temperature: number,
  maxOutputTokens?: number,
  jsonMode = true,
  signal?: AbortSignal,
): Promise<string> {
  const capped =
    maxOutputTokens != null
      ? Math.min(maxOutputTokens, getLlmMaxOutputTokens())
      : undefined;

  const response = await fetch(`${client.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${client.apiKey}`,
    },
    signal,
    body: JSON.stringify({
      model: client.model,
      messages,
      temperature,
      ...(capped ? outputTokenLimit(capped) : {}),
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
      ...cerebrasRequestExtras(),
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw await parseApiError(response, bodyText);
  }

  let data: ChatCompletionResponse;
  try {
    data = JSON.parse(bodyText) as ChatCompletionResponse;
  } catch {
    throw new Error("Invalid JSON response from LLM API.");
  }

  const choice = data.choices?.[0];
  const content = choice?.message?.content;
  if (!content?.trim()) {
    throw new Error("Empty response from model.");
  }
  if (choice?.finish_reason === "length") {
    throw new LlmOutputTruncatedError();
  }
  return content;
}

export async function generateJsonCompletion(
  client: LlmClient,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  maxOutputTokens?: number,
  signal?: AbortSignal,
): Promise<string> {
  return chatCompletion(
    client,
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    maxOutputTokens,
    true,
    signal,
  );
}

export async function generateChatJsonCompletion(
  client: LlmClient,
  systemPrompt: string,
  contextBlock: string,
  messages: { role: "user" | "assistant"; content: string }[],
  temperature: number,
): Promise<string> {
  const chatMessages: ChatMessage[] = [
    {
      role: "system",
      content: `${systemPrompt}\n\n--- ANALYSIS CONTEXT ---\n${contextBlock}`,
    },
    ...messages.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  return chatCompletion(client, chatMessages, temperature);
}
