import { NextResponse } from "next/server";
import { getPlatformFetchDeadlineMs } from "@/lib/fetch/budget";
import { getFetchConfig } from "@/lib/fetch/config";
import { fetchLiveReviews, parseFetchReviewsRequest } from "@/lib/fetch";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

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

  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const options = parseFetchReviewsRequest(body);
    const deadlineMs = getPlatformFetchDeadlineMs();

    const result = await Promise.race([
      fetchLiveReviews(options),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error("__FETCH_PLATFORM_TIMEOUT__")),
          deadlineMs,
        );
      }),
    ]);

    clearTimeout(timeoutId);
    return NextResponse.json(result);
  } catch (error) {
    if (timeoutId) clearTimeout(timeoutId);

    if (
      error instanceof Error &&
      error.message === "__FETCH_PLATFORM_TIMEOUT__"
    ) {
      return NextResponse.json(
        {
          error:
            "Fetch timed out on the server. Use a lower count (20 or fewer per request) or fetch one source at a time.",
        },
        { status: 503 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to fetch reviews.";
    console.error("[fetch-reviews]", message, error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
