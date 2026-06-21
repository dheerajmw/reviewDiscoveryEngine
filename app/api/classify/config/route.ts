import { NextResponse } from "next/server";
import { isMockClassifierEnabled } from "@/lib/classify-mock";
import {
  estimateGroqClassification,
  getClassifyBatchDelayMs,
  getClassifyBatchSize,
  GROQ_RATE_LIMITS,
} from "@/lib/groq-limits";

export async function GET() {
  const mockEnabled = isMockClassifierEnabled();
  const batchSize = getClassifyBatchSize();

  return NextResponse.json({
    mockEnabled,
    model: GROQ_RATE_LIMITS.model,
    limits: GROQ_RATE_LIMITS,
    batchSize,
    batchDelayMs: getClassifyBatchDelayMs(batchSize),
    sampleEstimate: estimateGroqClassification(100, batchSize),
  });
}
