import { NextResponse } from "next/server";
import { buildExecutiveResearchReport } from "@/lib/executive";
import { buildResearchFindingsReport } from "@/lib/findings";
import type { AggregationResult, ClassifiedReview } from "@/lib/types";

export async function POST(request: Request) {
  let body: {
    evidence?: AggregationResult;
    aggregation?: AggregationResult;
    classified?: ClassifiedReview[];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const aggregation = body.evidence ?? body.aggregation;
  if (!aggregation || typeof aggregation.totalReviews !== "number") {
    return NextResponse.json(
      { error: "Request must include evidence (aggregation) results." },
      { status: 400 },
    );
  }

  const classified = body.classified ?? [];
  const findingsReport = buildResearchFindingsReport(aggregation, classified);
  const executive = buildExecutiveResearchReport({
    classified,
    aggregation,
    findingsReport,
  });

  return NextResponse.json({ executive, findingsReport });
}
