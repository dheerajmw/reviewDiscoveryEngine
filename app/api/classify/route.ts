import { NextResponse } from "next/server";
import { classifyReviewsMock, isMockClassifierEnabled } from "@/lib/classify-mock";
import { classifyReviews } from "@/lib/classify";
import { getOpenRouterApiKey } from "@/lib/openrouter-config";
import type { RawReview } from "@/lib/types";

const MAX_BATCH_SIZE = 20;

export async function POST(request: Request) {
  let body: { reviews?: RawReview[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { reviews } = body;
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return NextResponse.json(
      { error: "Request must include a non-empty reviews array." },
      { status: 400 },
    );
  }

  if (reviews.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Maximum ${MAX_BATCH_SIZE} reviews per request.` },
      { status: 400 },
    );
  }

  for (const review of reviews) {
    if (typeof review?.text !== "string" || !review.text.trim()) {
      return NextResponse.json(
        { error: "Each review must include non-empty text." },
        { status: 400 },
      );
    }
  }

  if (isMockClassifierEnabled()) {
    const classified = classifyReviewsMock(reviews);
    return NextResponse.json({ classified, mock: true });
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
    const classified = await classifyReviews(reviews, apiKey);
    return NextResponse.json({ classified, mock: false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Classification failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
