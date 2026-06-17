import type { ClassifiedReview } from "@/lib/types";

const PREVIEW_LIMIT = 5;
const TEXT_TRUNCATE = 100;
const LOW_CONFIDENCE = 0.5;

function truncateText(text: string): string {
  if (text.length <= TEXT_TRUNCATE) return text;
  return `${text.slice(0, TEXT_TRUNCATE)}…`;
}

interface ClassifiedPreviewProps {
  reviews: ClassifiedReview[];
}

export default function ClassifiedPreview({ reviews }: ClassifiedPreviewProps) {
  const preview = reviews.slice(0, PREVIEW_LIMIT);
  const lowConfidenceCount = reviews.filter(
    (r) => r.confidence < LOW_CONFIDENCE,
  ).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-zinc-900">
          Classification complete
        </p>
        {lowConfidenceCount > 0 && (
          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
            {lowConfidenceCount} low-confidence
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Theme</th>
              <th className="px-4 py-3">Segment</th>
              <th className="px-4 py-3">Barrier</th>
              <th className="px-4 py-3">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {preview.map((review, index) => (
              <tr key={`${review.source}-${index}`} className="bg-white">
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-zinc-900">
                      {review.theme}
                    </span>
                    {review.confidence < LOW_CONFIDENCE && (
                      <span className="w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        Low confidence
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 align-top text-zinc-700">
                  {review.segment}
                </td>
                <td className="px-4 py-3 align-top text-zinc-700">
                  {review.barrier}
                </td>
                <td className="px-4 py-3 text-zinc-600">
                  {truncateText(review.text)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {reviews.length > PREVIEW_LIMIT && (
          <p className="border-t border-zinc-100 bg-zinc-50 px-4 py-2 text-xs text-zinc-500">
            Showing {PREVIEW_LIMIT} of {reviews.length} classified reviews
          </p>
        )}
      </div>
    </div>
  );
}
