import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai";
import { GEMINI_MODEL } from "./gemini-config";

export function createGeminiClient(apiKey: string): GoogleGenerativeAI {
  return new GoogleGenerativeAI(apiKey);
}

function jsonModel(
  client: GoogleGenerativeAI,
  systemPrompt: string,
  temperature: number,
): GenerativeModel {
  return client.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature,
      responseMimeType: "application/json",
    },
  });
}

export async function generateJsonCompletion(
  client: GoogleGenerativeAI,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
): Promise<string> {
  const model = jsonModel(client, systemPrompt, temperature);
  const result = await model.generateContent(userPrompt);
  const content = result.response.text();
  if (!content?.trim()) {
    throw new Error("Empty response from model.");
  }
  return content;
}

export async function generateChatJsonCompletion(
  client: GoogleGenerativeAI,
  systemPrompt: string,
  contextBlock: string,
  messages: { role: "user" | "assistant"; content: string }[],
  temperature: number,
): Promise<string> {
  const model = jsonModel(
    client,
    `${systemPrompt}\n\n--- ANALYSIS CONTEXT ---\n${contextBlock}`,
    temperature,
  );

  if (messages.length === 1) {
    const result = await model.generateContent(messages[0].content);
    const content = result.response.text();
    if (!content?.trim()) {
      throw new Error("Empty response from model.");
    }
    return content;
  }

  const history = messages.slice(0, -1).map((message) => ({
    role: message.role === "assistant" ? ("model" as const) : ("user" as const),
    parts: [{ text: message.content }],
  }));

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(messages[messages.length - 1].content);
  const content = result.response.text();
  if (!content?.trim()) {
    throw new Error("Empty response from model.");
  }
  return content;
}
