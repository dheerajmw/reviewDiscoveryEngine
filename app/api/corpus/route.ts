import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";
import { parseReviewsCsv } from "@/lib/csv-parser";
import { CORPUS_FILES, getCorpusFile } from "@/lib/corpus-manifest";

const CORPUS_DIR = join(process.cwd(), "docs/review-corpus");

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("file");

  if (!fileId) {
    return NextResponse.json({ files: CORPUS_FILES });
  }

  const meta = getCorpusFile(fileId);
  if (!meta) {
    return NextResponse.json({ error: "Unknown corpus file." }, { status: 400 });
  }

  try {
    const csvText = await readFile(join(CORPUS_DIR, fileId), "utf8");
    const result = parseReviewsCsv(csvText, fileId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      file: fileId,
      label: meta.label,
      reviews: result.reviews,
      count: result.reviews.length,
    });
  } catch {
    return NextResponse.json(
      { error: "Review corpus file not found on server." },
      { status: 404 },
    );
  }
}
