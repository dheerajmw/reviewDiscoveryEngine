import { NextResponse } from "next/server";
import {
  listAnalysisRuns,
  persistAnalysisRun,
} from "@/services/analysis-service";
import type { AnalysisBundle, ClassifiedReview } from "@/lib/types";

export async function GET() {
  try {
    const runs = await listAnalysisRuns();
    return NextResponse.json({ runs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to list runs.";
    return NextResponse.json({ error: message, runs: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: {
    datasetName?: string;
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

  const { datasetName, classified, analysis } = body;
  if (!datasetName?.trim() || !classified?.length || !analysis) {
    return NextResponse.json(
      { error: "datasetName, classified, and analysis are required." },
      { status: 400 },
    );
  }

  try {
    const runId = await persistAnalysisRun({
      datasetName: datasetName.trim(),
      classified,
      analysis,
      usedMockClassifier: Boolean(body.usedMockClassifier),
      curation: body.curation,
    });
    return NextResponse.json({ runId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save run.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
