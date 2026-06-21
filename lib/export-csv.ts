import type { ClassifiedReview } from "@/lib/types";
import { downloadFile } from "@/lib/export-report";

export function buildClassifiedCsv(classified: ClassifiedReview[]): string {
  const headers = [
    "source",
    "text",
    "discovery_relevant",
    "theme",
    "barrier",
    "behavior",
    "emotion",
    "segment",
    "root_cause",
    "unmet_need",
    "confidence",
  ];

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;

  const rows = classified.map((r) =>
    [
      r.source,
      r.text,
      String(r.discovery_relevant),
      r.theme,
      r.barrier,
      r.behavior,
      r.emotion,
      r.segment,
      r.root_cause,
      r.unmet_need,
      String(r.confidence),
    ]
      .map(escape)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

export function downloadClassifiedCsv(
  classified: ClassifiedReview[],
  filename = "classified-reviews.csv",
): void {
  downloadFile(buildClassifiedCsv(classified), filename, "text/csv");
}
