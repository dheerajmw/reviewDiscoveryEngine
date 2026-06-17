import { NextResponse } from "next/server";
import { isMockClassifierEnabled } from "@/lib/classify-mock";
import { getOpenRouterApiKey } from "@/lib/openrouter-config";
import { generateInsightsMock } from "@/lib/insights-mock";
import { selectSampleReviews } from "@/lib/insights-samples";
import { generateInsights } from "@/lib/insights";
import type { AggregationResult, ClassifiedReview } from "@/lib/types";

export async function POST(request: Request) {
  let body: {
    aggregation?: AggregationResult;
    classified?: ClassifiedReview[];
    sampleReviews?: ClassifiedReview[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { aggregation, classified, sampleReviews } = body;

  if (!aggregation || typeof aggregation.totalReviews !== "number") {
    return NextResponse.json(
      { error: "Request must include aggregation results." },
      { status: 400 },
    );
  }

  if (!Array.isArray(classified) || classified.length === 0) {
    return NextResponse.json(
      { error: "Request must include classified reviews." },
      { status: 400 },
    );
  }

  const samples =
    sampleReviews && sampleReviews.length > 0
      ? sampleReviews
      : selectSampleReviews(classified, aggregation);

  if (isMockClassifierEnabled()) {
    const insights = generateInsightsMock(aggregation);
    return NextResponse.json({ insights, mock: true });
  }

  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENROUTER_API_KEY is not configured. Add it to .env.local, or set USE_MOCK_CLASSIFIER=true for demo mode.",
      },
      { status: 500 },
    );
  }

  try {
    const insights = await generateInsights(aggregation, samples, apiKey);
    return NextResponse.json({ insights, mock: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Insight generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
