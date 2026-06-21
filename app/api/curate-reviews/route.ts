import { NextResponse } from "next/server";
import { curateReviews } from "@/lib/review-curation";
import type { RawReview } from "@/lib/types";

const MAX_CURATION_REVIEWS = 5_000;

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

  if (reviews.length > MAX_CURATION_REVIEWS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_CURATION_REVIEWS} reviews per curation request.` },
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

  try {
    const result = await curateReviews(reviews);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Review curation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
