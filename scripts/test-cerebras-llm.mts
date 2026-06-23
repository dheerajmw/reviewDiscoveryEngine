/**
 * Quick Cerebras Cloud LLM smoke test.
 * Usage: npx tsx scripts/test-cerebras-llm.mts
 */
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { loadEnvLocal } from "../lib/env-loader";
import { classifyReviews } from "../lib/classify";
import { createLlmClient, generateJsonCompletion } from "../lib/llm-client";
import { getLlmApiKey, LLM_MODEL } from "../lib/llm-config";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnvLocal(join(__dirname, ".."));

async function main() {
  const apiKey = getLlmApiKey();
  console.log("API key configured:", Boolean(apiKey));
  console.log("Model:", LLM_MODEL);
  console.log("Mock mode:", process.env.USE_MOCK_CLASSIFIER ?? "(unset)");

  if (!apiKey) {
    console.error("FAIL: CEREBRAS_API_KEY missing in .env.local");
    process.exit(1);
  }

  if (process.env.USE_MOCK_CLASSIFIER === "true") {
    console.error("FAIL: USE_MOCK_CLASSIFIER=true would bypass Cerebras");
    process.exit(1);
  }

  const client = createLlmClient(apiKey);
  const raw = await generateJsonCompletion(
    client,
    'Respond with JSON only: {"status":"ok"}',
    "ping",
    0,
    64,
  );
  const parsed = JSON.parse(raw.trim().match(/\{[\s\S]*\}/)?.[0] ?? raw);
  if (parsed.status !== "ok") {
    throw new Error(`JSON ping unexpected: ${raw}`);
  }
  console.log("JSON ping: PASS");

  const sample = {
    source: "reddit",
    text: "Discover Weekly keeps recommending the same artists every week instead of new music.",
  };
  const result = await classifyReviews([sample], apiKey);
  const r = result.classified[0];
  console.log("Classify pipeline: PASS");
  console.log("  discovery_relevant:", r.discovery_relevant);
  console.log("  theme:", r.theme);
  console.log("  root_cause:", r.root_cause);
  console.log("  confidence:", r.confidence);
}

main().catch((error) => {
  console.error("FAIL:", error instanceof Error ? error.message : error);
  process.exit(1);
});
