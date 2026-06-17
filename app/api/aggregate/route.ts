import { NextResponse } from "next/server";
import { aggregateReviews } from "@/lib/aggregation";
import type { ClassifiedReview } from "@/lib/types";

export async function POST(request: Request) {
  let body: { classified?: ClassifiedReview[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { classified } = body;
  if (!Array.isArray(classified)) {
    return NextResponse.json(
      { error: "Request must include a classified array." },
      { status: 400 },
    );
  }

  const aggregation = aggregateReviews(classified);
  return NextResponse.json(aggregation);
}
