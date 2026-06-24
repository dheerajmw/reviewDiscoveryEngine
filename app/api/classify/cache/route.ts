import { NextResponse } from "next/server";
import { LLM_MODEL } from "@/lib/llm-config";
import { loadCachedClassificationsOnly } from "@/services/classification-cache-service";
import type { RawReview } from "@/lib/types";

export async function POST(request: Request) {
  let body: { reviews?: RawReview[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const reviews = body.reviews;
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return NextResponse.json(
      { error: "Request must include a non-empty reviews array." },
      { status: 400 },
    );
  }

  try {
    const result = await loadCachedClassificationsOnly(reviews, LLM_MODEL);
    return NextResponse.json({
      total: result.total,
      cachedCount: result.cachedCount,
      classified: result.classified,
      model: LLM_MODEL,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load classification cache.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
