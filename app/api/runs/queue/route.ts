import { NextResponse } from "next/server";
import { queueReviewBatch } from "@/services/analysis-service";
import type { CurationStats, RawReview } from "@/lib/types";

export async function POST(request: Request) {
  let body: {
    batches?: Array<{
      datasetName?: string;
      reviews?: RawReview[];
    }>;
    curation?: CurationStats;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const batches = body.batches;
  if (!Array.isArray(batches) || batches.length === 0) {
    return NextResponse.json(
      { error: "At least one batch is required." },
      { status: 400 },
    );
  }

  try {
    const runIds: string[] = [];

    for (const batch of batches) {
      if (!batch.datasetName?.trim() || !batch.reviews?.length) {
        return NextResponse.json(
          { error: "Each batch needs a datasetName and non-empty reviews array." },
          { status: 400 },
        );
      }

      const runId = await queueReviewBatch({
        datasetName: batch.datasetName.trim(),
        reviews: batch.reviews,
        totalLoaded: body.curation?.total_loaded,
        excluded: body.curation?.excluded,
      });
      runIds.push(runId);
    }

    return NextResponse.json({ runIds, count: runIds.length });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to queue review batches.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
