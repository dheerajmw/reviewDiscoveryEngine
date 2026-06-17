import type { RawReview } from "@/lib/types";
import SourceBadge from "@/components/ui/SourceBadge";

const PREVIEW_LIMIT = 5;
const TEXT_TRUNCATE = 120;

function truncateText(text: string): string {
  if (text.length <= TEXT_TRUNCATE) return text;
  return `${text.slice(0, TEXT_TRUNCATE)}…`;
}

interface UploadPreviewProps {
  reviews: RawReview[];
}

export default function UploadPreview({ reviews }: UploadPreviewProps) {
  const preview = reviews.slice(0, PREVIEW_LIMIT);

  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-outline-variant bg-surface-container-low text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
          <tr>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Review</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/50">
          {preview.map((review, index) => (
            <tr
              key={`${review.source}-${index}`}
              className="bg-surface-container-lowest transition-colors hover:bg-surface-container-low"
            >
              <td className="px-4 py-3 align-top">
                <SourceBadge source={review.source} />
              </td>
              <td className="px-4 py-3 text-on-surface-variant">
                {truncateText(review.text)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {reviews.length > PREVIEW_LIMIT && (
        <p className="border-t border-outline-variant bg-surface-container-low px-4 py-2 text-xs text-on-surface-variant">
          Showing {PREVIEW_LIMIT} of {reviews.length} reviews
        </p>
      )}
    </div>
  );
}
