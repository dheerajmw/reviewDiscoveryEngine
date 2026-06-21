import { NextResponse } from "next/server";
import { buildResearchFindings } from "@/lib/findings";
import type { AggregationResult } from "@/lib/types";

export async function POST(request: Request) {
  let body: { evidence?: AggregationResult; aggregation?: AggregationResult };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const evidence = body.evidence ?? body.aggregation;
  if (!evidence || typeof evidence.totalReviews !== "number") {
    return NextResponse.json(
      { error: "Request must include evidence (aggregation) results." },
      { status: 400 },
    );
  }

  const findings = buildResearchFindings(evidence);
  return NextResponse.json({ findings });
}
