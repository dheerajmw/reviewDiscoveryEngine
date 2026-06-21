import { NextResponse } from "next/server";
import { isMockClassifierEnabled } from "@/lib/classify-mock";
import {
  estimateLlmClassification,
  getClassifyBatchDelayMs,
  getClassifyBatchSize,
  LLM_RATE_LIMITS,
} from "@/lib/llm-limits";

export async function GET() {
  const mockEnabled = isMockClassifierEnabled();
  const batchSize = getClassifyBatchSize();

  return NextResponse.json({
    mockEnabled,
    model: LLM_RATE_LIMITS.model,
    limits: LLM_RATE_LIMITS,
    batchSize,
    batchDelayMs: getClassifyBatchDelayMs(batchSize),
    sampleEstimate: estimateLlmClassification(100, batchSize),
  });
}
