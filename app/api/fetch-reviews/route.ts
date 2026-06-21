import { NextResponse } from "next/server";
import { getFetchConfig } from "@/lib/fetch/config";
import { fetchLiveReviews, parseFetchReviewsRequest } from "@/lib/fetch";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json(getFetchConfig());
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  try {
    const options = parseFetchReviewsRequest(body);
    const result = await fetchLiveReviews(options);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch reviews.";
    console.error("[fetch-reviews]", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
