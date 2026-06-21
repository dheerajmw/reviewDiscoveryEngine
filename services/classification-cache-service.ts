import { GEMINI_MODEL } from "@/lib/gemini-config";
import { hashReviewContent } from "@/lib/review-content-hash";
import {
  boolFromDb,
  boolToDb,
  ensureTursoSchema,
  parseJsonColumn,
  toJson,
} from "@/lib/turso";
import type { ClassifiedReview, RawReview } from "@/lib/types";

export interface CacheLookupResult {
  hits: Map<number, ClassifiedReview>;
  missIndices: number[];
  missReviews: RawReview[];
}

function rowToClassified(
  row: Record<string, unknown>,
  review: RawReview,
): ClassifiedReview {
  return {
    source: review.source,
    text: review.text,
    discovery_relevant: boolFromDb(row.discovery_relevant),
    discovery_reason: row.discovery_reason
      ? String(row.discovery_reason)
      : undefined,
    discovery_confidence:
      row.discovery_confidence != null
        ? Number(row.discovery_confidence)
        : undefined,
    theme: String(row.theme ?? "Other Discovery Frustration"),
    behavior: String(row.behavior ?? "Evaluate Recommendations"),
    emotion: String(row.emotion ?? "Neutral"),
    segment: String(row.segment ?? "Unspecified Segment"),
    barrier: String(row.barrier ?? "Unclear Discovery Struggle"),
    root_cause: String(row.root_cause ?? "Unclear Repetition Cause"),
    unmet_need: String(row.unmet_need ?? "General Discovery Improvement"),
    confidence: Number(row.confidence ?? 0.7),
    evidence: row.evidence
      ? parseJsonColumn<NonNullable<ClassifiedReview["evidence"]>>(
          row.evidence,
          {},
        )
      : undefined,
  };
}

export async function lookupClassificationCache(
  reviews: RawReview[],
  model = GEMINI_MODEL,
): Promise<CacheLookupResult> {
  const db = await ensureTursoSchema();
  const hits = new Map<number, ClassifiedReview>();
  const missIndices: number[] = [];
  const missReviews: RawReview[] = [];

  for (let i = 0; i < reviews.length; i++) {
    const review = reviews[i];
    const contentHash = hashReviewContent(review);

    const result = await db.execute({
      sql: `SELECT * FROM classification_cache WHERE content_hash = ? AND model = ? LIMIT 1`,
      args: [contentHash, model],
    });

    const row = result.rows[0];
    if (row) {
      hits.set(i, rowToClassified(row as Record<string, unknown>, review));
    } else {
      missIndices.push(i);
      missReviews.push(review);
    }
  }

  return { hits, missIndices, missReviews };
}

export async function saveClassificationCache(
  classified: ClassifiedReview[],
  model = GEMINI_MODEL,
): Promise<void> {
  if (classified.length === 0) return;

  const db = await ensureTursoSchema();
  const statements = classified.map((review) => {
    const contentHash = hashReviewContent(review);

    return {
      sql: `INSERT INTO classification_cache (
              content_hash, model, source, review_text,
              discovery_relevant, discovery_reason, discovery_confidence,
              theme, barrier, behavior, emotion, segment, root_cause, unmet_need,
              confidence, evidence, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(content_hash) DO UPDATE SET
              model = excluded.model,
              source = excluded.source,
              review_text = excluded.review_text,
              discovery_relevant = excluded.discovery_relevant,
              discovery_reason = excluded.discovery_reason,
              discovery_confidence = excluded.discovery_confidence,
              theme = excluded.theme,
              barrier = excluded.barrier,
              behavior = excluded.behavior,
              emotion = excluded.emotion,
              segment = excluded.segment,
              root_cause = excluded.root_cause,
              unmet_need = excluded.unmet_need,
              confidence = excluded.confidence,
              evidence = excluded.evidence,
              updated_at = datetime('now')`,
      args: [
        contentHash,
        model,
        review.source,
        review.text,
        boolToDb(review.discovery_relevant),
        review.discovery_reason ?? null,
        review.discovery_confidence ?? null,
        review.theme,
        review.barrier,
        review.behavior,
        review.emotion,
        review.segment,
        review.root_cause,
        review.unmet_need,
        review.confidence,
        review.evidence ? toJson(review.evidence) : null,
      ],
    };
  });

  await db.batch(statements, "write");
}

export function mergeCachedClassifications(
  reviews: RawReview[],
  cacheHits: Map<number, ClassifiedReview>,
  missIndices: number[],
  freshlyClassified: ClassifiedReview[],
): ClassifiedReview[] {
  const freshByMissIndex = new Map(
    missIndices.map((originalIndex, i) => [originalIndex, freshlyClassified[i]]),
  );

  return reviews.map((review, index) => {
    const cached = cacheHits.get(index);
    if (cached) return cached;
    const fresh = freshByMissIndex.get(index);
    if (!fresh) {
      throw new Error(`Missing classification for review index ${index}.`);
    }
    return fresh;
  });
}
