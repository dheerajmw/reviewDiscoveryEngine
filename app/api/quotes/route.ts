import { NextResponse } from "next/server";
import {
  getQuoteFilterOptions,
  searchQuotes,
} from "@/services/review-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runId = searchParams.get("runId");

  if (!runId) {
    return NextResponse.json({ error: "runId is required." }, { status: 400 });
  }

  try {
    const filters = {
      theme: searchParams.get("theme") ?? undefined,
      segment: searchParams.get("segment") ?? undefined,
      root_cause: searchParams.get("root_cause") ?? undefined,
      unmet_need: searchParams.get("unmet_need") ?? undefined,
      barrier: searchParams.get("barrier") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    };

    const [quotes, filterOptions] = await Promise.all([
      searchQuotes(runId, filters),
      getQuoteFilterOptions(runId),
    ]);

    return NextResponse.json({ quotes, filterOptions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Quote search failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
