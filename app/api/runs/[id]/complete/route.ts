import { NextResponse } from "next/server";
import { completeQueuedRun } from "@/services/analysis-service";
import type { AnalysisBundle, ClassifiedReview, RawReview } from "@/lib/types";

export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: runId } = await context.params;

  let body: {
    reviews?: RawReview[];
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

  const { reviews, classified, analysis } = body;
  if (!analysis) {
    return NextResponse.json({ error: "analysis is required." }, { status: 400 });
  }

  if (!reviews?.length && !classified?.length) {
    return NextResponse.json(
      { error: "reviews or classified are required." },
      { status: 400 },
    );
  }

  try {
    await completeQueuedRun({
      runId,
      reviews,
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
