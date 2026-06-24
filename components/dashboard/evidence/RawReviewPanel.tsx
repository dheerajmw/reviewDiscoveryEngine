import type { ClassifiedReview } from "@/lib/types";
import { formatReviewQuoteText } from "@/lib/spotify-community-text";
import SourceBadge from "@/components/ui/SourceBadge";

interface RawReviewPanelProps {
  review: ClassifiedReview;
}

export default function RawReviewPanel({ review }: RawReviewPanelProps) {
  return (
    <article className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SourceBadge source={review.source} />
        <span className="text-xs text-on-surface-variant">{review.segment}</span>
        {review.review_id && (
          <span className="font-mono text-[10px] text-outline">
            {review.review_id}
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-on-surface">
        {formatReviewQuoteText(review.source, review.text)}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        <div>
          <dt className="text-outline">Theme</dt>
          <dd className="text-on-surface-variant">{review.theme}</dd>
        </div>
        <div>
          <dt className="text-outline">Barrier</dt>
          <dd className="text-on-surface-variant">{review.barrier}</dd>
        </div>
        <div>
          <dt className="text-outline">Root cause</dt>
          <dd className="text-on-surface-variant">{review.root_cause}</dd>
        </div>
        <div>
          <dt className="text-outline">Unmet need</dt>
          <dd className="text-on-surface-variant">{review.unmet_need}</dd>
        </div>
      </dl>
    </article>
  );
}
