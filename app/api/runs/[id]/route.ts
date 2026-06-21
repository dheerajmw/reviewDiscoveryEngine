import { NextResponse } from "next/server";
import { getAnalysisRunById } from "@/services/analysis-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  try {
    const stored = await getAnalysisRunById(id);
    return NextResponse.json(stored);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Run not found.";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
