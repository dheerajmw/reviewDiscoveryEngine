import {
  estimateClassificationTokens,
  estimateReviewsAfterCleanup,
  formatAfterCleanupRange,
  formatReviewVolumeRange,
  getReviewVolumeStatus,
  RECOMMENDED_MAX_AFTER_CLEANUP,
  RECOMMENDED_MIN_REVIEWS_FETCHED,
} from "@/lib/review-volume-guidance";
import { PIPELINE_FILTER_SUMMARY } from "@/lib/filter-stages";
import Icon from "@/components/ui/Icon";

interface ReviewVolumeGuidanceProps {
  /** Total reviews fetched or uploaded (before cleanup). */
  totalReviews?: number;
  variant?: "hero" | "inline";
}

export default function ReviewVolumeGuidance({
  totalReviews,
  variant = "hero",
}: ReviewVolumeGuidanceProps) {
  const status =
    totalReviews !== undefined ? getReviewVolumeStatus(totalReviews) : null;
  const estimatedKept =
    totalReviews !== undefined
      ? estimateReviewsAfterCleanup(totalReviews)
      : null;
  const estimatedTokens =
    estimatedKept !== null ? estimateClassificationTokens(estimatedKept) : null;

  if (variant === "hero") {
    return (
      <div
        role="note"
        className="animate-fade-in-up rounded-xl border border-outline-variant bg-surface-container-low px-4 py-3 text-left stagger-5"
      >
        <div className="flex items-start gap-2.5">
          <Icon name="tune" className="mt-0.5 shrink-0 text-base text-primary" />
          <div className="text-sm leading-relaxed text-on-surface-variant">
            <p className="font-medium text-on-surface">Recommended review volume</p>
            <p className="mt-1">
              Fetch or upload{" "}
              <span className="font-medium text-on-surface">
                {formatReviewVolumeRange()} reviews total
              </span>
              . Cleanup usually keeps{" "}
              <span className="font-medium text-on-surface">
                {formatAfterCleanupRange()} discovery-related
              </span>{" "}
              reviews — {PIPELINE_FILTER_SUMMARY} Too few may leave nothing to
              analyze; too many can use a large LLM token budget after cleanup
              (~400 tokens per kept review).
            </p>
          </div>
        </div>
      </div>
    );
  }

  const tone =
    status === "low"
      ? "border-warning-container bg-warning-container text-on-warning-container"
      : status === "high"
        ? "border-warning-container bg-warning-container text-on-warning-container"
        : "border-outline-variant bg-surface-container-low text-on-surface-variant";

  return (
    <div role="note" className={`rounded-lg border px-3 py-2.5 text-xs ${tone}`}>
      <p className="font-medium text-on-surface">
        Recommended: {formatReviewVolumeRange()} reviews total
      </p>
      <p className="mt-1 leading-relaxed">
        Aim for {formatAfterCleanupRange()} discovery-related reviews after
        cleanup. Include Reddit or use multiple sources if a single store pull
        is small.
      </p>
      {totalReviews !== undefined && estimatedKept !== null && estimatedTokens !== null && (
        <p className="mt-1.5 leading-relaxed">
          Your selection:{" "}
          <span className="font-medium text-on-surface">
            {totalReviews.toLocaleString()} fetched
          </span>
          {" → "}
          ~{estimatedKept.toLocaleString()} after cleanup · ~
          {estimatedTokens.toLocaleString()} LLM tokens to classify
          {status === "low" && (
            <>
              {" "}
              — below {RECOMMENDED_MIN_REVIEWS_FETCHED.toLocaleString()}; increase
              the limit or add sources
            </>
          )}
          {status === "high" && (
            <>
              {" "}
              — above recommended max; consider mock mode or splitting the run
            </>
          )}
          {status === "ok" && estimatedKept > RECOMMENDED_MAX_AFTER_CLEANUP && (
            <> — kept count may exceed free-tier comfort (~{RECOMMENDED_MAX_AFTER_CLEANUP})</>
          )}
        </p>
      )}
    </div>
  );
}
