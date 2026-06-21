import { NextResponse } from "next/server";
import { completeQueuedRun } from "@/services/analysis-service";
import type { AnalysisBundle, ClassifiedReview } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await context.params;

  let body: {
    classified?: ClassifiedReview[];
    analysis?: AnalysisBundle;
    usedMockClassifier?: boolean;
    curation?: AnalysisBundle["curation"];
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { classified, analysis } = body;
  if (!classified?.length || !analysis) {
    return NextResponse.json(
      { error: "classified and analysis are required." },
      { status: 400 },
    );
  }

  try {
    await completeQueuedRun({
      runId,
      classified,
      analysis,
      usedMockClassifier: Boolean(body.usedMockClassifier),
      curation: body.curation,
    });
    return NextResponse.json({ runId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to complete queued run.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
