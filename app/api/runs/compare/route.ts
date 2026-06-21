import { NextResponse } from "next/server";
import { compareAnalysisRuns } from "@/services/analysis-service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const runA = searchParams.get("a");
  const runB = searchParams.get("b");

  if (!runA || !runB) {
    return NextResponse.json(
      { error: "Query params a and b (run IDs) are required." },
      { status: 400 },
    );
  }

  try {
    const comparison = await compareAnalysisRuns(runA, runB);
    return NextResponse.json(comparison);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Comparison failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
