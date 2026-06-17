import OpenAI from "openai";
import {
  getOpenRouterHeaders,
  OPENROUTER_BASE_URL,
  OPENROUTER_MODEL,
} from "./openrouter-config";

export function createOpenRouterClient(apiKey: string): OpenAI {
  return new OpenAI({
    baseURL: OPENROUTER_BASE_URL,
    apiKey,
    defaultHeaders: getOpenRouterHeaders(),
  });
}

export async function generateJsonCompletion(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
): Promise<string> {
  const response = await client.chat.completions.create({
    model: OPENROUTER_MODEL,
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
