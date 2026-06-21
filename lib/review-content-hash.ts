import { createHash } from "crypto";
import type { RawReview } from "./types";

export function hashReviewContent(review: Pick<RawReview, "source" | "text">): string {
  return createHash("sha256")
    .update(`${review.source.trim().toLowerCase()}\0${review.text.trim()}`)
    .digest("hex");
}

export function cacheKeyForReview(
  review: Pick<RawReview, "source" | "text">,
  model: string,
): string {
  return `${model}:${hashReviewContent(review)}`;
}
