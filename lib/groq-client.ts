import OpenAI from "openai";
import { GROQ_BASE_URL, GROQ_MODEL } from "./groq-config";

export function createGroqClient(apiKey: string): OpenAI {
  return new OpenAI({
    baseURL: GROQ_BASE_URL,
    apiKey,
  });
}

export async function generateJsonCompletion(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
): Promise<string> {
  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from model.");
  }

  return content;
}

export async function generateChatJsonCompletion(
  client: OpenAI,
  systemPrompt: string,
  contextBlock: string,
  messages: { role: "user" | "assistant"; content: string }[],
  temperature: number,
): Promise<string> {
  const response = await client.chat.completions.create({
    model: GROQ_MODEL,
    temperature,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `${systemPrompt}\n\n--- ANALYSIS CONTEXT ---\n${contextBlock}`,
      },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Empty response from model.");
  }

  return content;
}
