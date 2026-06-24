import { LLM_MODEL } from "@/lib/llm-config";
import { hashReviewContent } from "@/lib/review-content-hash";
import { BARRIER_FALLBACK } from "@/lib/taxonomy";
import {
  boolFromDb,
  boolToDb,
  ensureTursoSchema,
  parseJsonColumn,
  toJson,
  type TursoClient,
} from "@/lib/turso";
import type { ClassifiedReview, RawReview } from "@/lib/types";

export interface CacheLookupResult {
  hits: Map<number, ClassifiedReview>;
  missIndices: number[];
  missReviews: RawReview[];
}

const CACHE_HASH_CHUNK = 80;
const CACHE_WRITE_CHUNK = 40;

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
    barrier: String(row.barrier ?? BARRIER_FALLBACK),
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

async function fetchCacheHitsByHash(
  db: TursoClient,
  reviews: RawReview[],
  model: string,
): Promise<Map<number, ClassifiedReview>> {
  const hits = new Map<number, ClassifiedReview>();
  const hashToIndices = new Map<string, number[]>();

  for (let index = 0; index < reviews.length; index++) {
    const hash = hashReviewContent(reviews[index]!);
    const bucket = hashToIndices.get(hash) ?? [];
    bucket.push(index);
    hashToIndices.set(hash, bucket);
  }

  const hashes = [...hashToIndices.keys()];
  for (let offset = 0; offset < hashes.length; offset += CACHE_HASH_CHUNK) {
    const chunk = hashes.slice(offset, offset + CACHE_HASH_CHUNK);
    if (chunk.length === 0) continue;

    const placeholders = chunk.map(() => "?").join(", ");
    const result = await db.execute({
      sql: `SELECT * FROM classification_cache WHERE model = ? AND content_hash IN (${placeholders})`,
      args: [model, ...chunk],
    });

    for (const row of result.rows) {
      const record = row as Record<string, unknown>;
      const hash = String(record.content_hash);
      const indices = hashToIndices.get(hash) ?? [];
      for (const index of indices) {
        hits.set(index, rowToClassified(record, reviews[index]!));
      }
    }
  }

  return hits;
}

export async function lookupClassificationCache(
  reviews: RawReview[],
  model = LLM_MODEL,
): Promise<CacheLookupResult> {
  const db = await ensureTursoSchema();
  const hits = await fetchCacheHitsByHash(db, reviews, model);
  const missIndices: number[] = [];
  const missReviews: RawReview[] = [];

  for (let i = 0; i < reviews.length; i++) {
    if (hits.has(i)) continue;
    missIndices.push(i);
    missReviews.push(reviews[i]!);
  }

  return { hits, missIndices, missReviews };
}

export async function saveClassificationCache(
  classified: ClassifiedReview[],
  model = LLM_MODEL,
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

  for (let i = 0; i < statements.length; i += CACHE_WRITE_CHUNK) {
    await db.batch(statements.slice(i, i + CACHE_WRITE_CHUNK), "write");
  }
}

/** Load full classifications from Turso cache (after live LLM classify). */
export async function loadClassificationsForPersist(
  reviews: RawReview[],
  model = LLM_MODEL,
): Promise<ClassifiedReview[]> {
  const lookup = await lookupClassificationCache(reviews, model);
  if (lookup.missIndices.length > 0) {
    throw new Error(
      `${lookup.missIndices.length} review(s) are not in the classification cache. Re-run Analyze before saving.`,
    );
  }

  return reviews.map((_, index) => lookup.hits.get(index)!);
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

export async function loadCachedClassificationsOnly(
  reviews: RawReview[],
  model = LLM_MODEL,
): Promise<{
  classified: ClassifiedReview[];
  cachedCount: number;
  total: number;
}> {
  const lookup = await lookupClassificationCache(reviews, model);
  const classified: ClassifiedReview[] = [];

  for (let index = 0; index < reviews.length; index++) {
    const hit = lookup.hits.get(index);
    if (hit) classified.push(hit);
  }

  return {
    classified,
    cachedCount: lookup.hits.size,
    total: reviews.length,
  };
}
