import {
  boolFromDb,
  boolToDb,
  ensureTursoSchema,
  newId,
  parseJsonColumn,
  toJson,
  type TursoClient,
} from "@/lib/turso";
import type {
  ClassifiedReview,
  QuoteRecord,
  QuoteSearchFilters,
  RawReview,
} from "@/lib/types";
import type { AggregationResult } from "@/lib/types";

const REVIEW_BATCH_SIZE = 50;
const TURSO_STATEMENT_CHUNK = 200;

async function getDb(): Promise<TursoClient> {
  return ensureTursoSchema();
}

export async function saveRawReviewsForRun(
  runId: string,
  reviews: RawReview[],
): Promise<void> {
  const db = await getDb();

  for (let i = 0; i < reviews.length; i += REVIEW_BATCH_SIZE) {
    const batch = reviews.slice(i, i + REVIEW_BATCH_SIZE);
    await db.batch(
      batch.map((review) => ({
        sql: `INSERT INTO reviews (id, run_id, source, review_text, discovery_relevant, discovery_reason, confidence)
              VALUES (?, ?, ?, ?, 1, ?, NULL)`,
        args: [
          newId(),
          runId,
          review.source,
          review.text,
          "queued_for_classification",
        ],
      })),
      "write",
    );
  }
}

export async function getRawReviewsForRun(runId: string): Promise<RawReview[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT source, review_text
          FROM reviews
          WHERE run_id = ?
          ORDER BY created_at ASC`,
    args: [runId],
  });

  return result.rows.map((row) => ({
    source: String(row.source),
    text: String(row.review_text),
  }));
}

export async function deleteReviewsForRun(runId: string): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `DELETE FROM reviews WHERE run_id = ?`,
    args: [runId],
  });
}

export async function saveReviewsWithClassifications(
  runId: string,
  classified: ClassifiedReview[],
): Promise<void> {
  const db = await getDb();

  for (let i = 0; i < classified.length; i += REVIEW_BATCH_SIZE) {
    const batch = classified.slice(i, i + REVIEW_BATCH_SIZE);
    const statements = batch.flatMap((r) => {
      const reviewId = newId();
      const classId = newId();
      return [
        {
          sql: `INSERT INTO reviews (id, run_id, source, review_text, discovery_relevant, discovery_reason, confidence)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [
            reviewId,
            runId,
            r.source,
            r.text,
            boolToDb(r.discovery_relevant),
            r.discovery_reason ?? null,
            r.confidence,
          ],
        },
        {
          sql: `INSERT INTO classifications (id, review_id, theme, barrier, behavior, emotion, segment, root_cause, unmet_need, classification_confidence, evidence)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            classId,
            reviewId,
            r.theme,
            r.barrier,
            r.behavior,
            r.emotion,
            r.segment,
            r.root_cause,
            r.unmet_need,
            r.confidence,
            r.evidence ? toJson(r.evidence) : null,
          ],
        },
      ];
    });

    for (let offset = 0; offset < statements.length; offset += TURSO_STATEMENT_CHUNK) {
      await db.batch(
        statements.slice(offset, offset + TURSO_STATEMENT_CHUNK),
        "write",
      );
    }
  }
}

export async function getClassifiedReviewsForRun(
  runId: string,
): Promise<ClassifiedReview[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT r.id, r.source, r.review_text, r.discovery_relevant, r.discovery_reason, r.confidence,
                 c.theme, c.barrier, c.behavior, c.emotion, c.segment, c.root_cause, c.unmet_need,
                 c.classification_confidence, c.evidence
          FROM reviews r
          LEFT JOIN classifications c ON c.review_id = r.id
          WHERE r.run_id = ?
          ORDER BY r.created_at ASC`,
    args: [runId],
  });

  return result.rows.map((row) => ({
    review_id: String(row.id),
    source: String(row.source),
    text: String(row.review_text),
    discovery_relevant: boolFromDb(row.discovery_relevant),
    discovery_reason: row.discovery_reason
      ? String(row.discovery_reason)
      : undefined,
    confidence: Number(
      row.confidence ?? row.classification_confidence ?? 0.7,
    ),
    theme: String(row.theme ?? "Other Discovery Frustration"),
    barrier: String(row.barrier ?? "Unclear Discovery Struggle"),
    behavior: String(row.behavior ?? "Evaluate Recommendations"),
    emotion: String(row.emotion ?? "Neutral"),
    segment: String(row.segment ?? "Unspecified Segment"),
    root_cause: String(row.root_cause ?? "Unclear Repetition Cause"),
    unmet_need: String(row.unmet_need ?? "General Discovery Improvement"),
    evidence: row.evidence
      ? parseJsonColumn<NonNullable<ClassifiedReview["evidence"]>>(
          row.evidence,
          {},
        )
      : undefined,
    classification_reasons: row.evidence
      ? parseJsonColumn<NonNullable<ClassifiedReview["evidence"]>>(
          row.evidence,
          {},
        ).classification_reasons
      : undefined,
  }));
}

export async function saveRepresentativeQuotes(
  runId: string,
  classified: ClassifiedReview[],
  aggregation: AggregationResult,
): Promise<void> {
  const db = await getDb();
  const classifiedByText = new Map<string, ClassifiedReview>();
  const classifiedByPrefix = new Map<string, ClassifiedReview>();
  for (const review of classified) {
    const key = review.text.trim().toLowerCase();
    if (!classifiedByText.has(key)) classifiedByText.set(key, review);
    const prefix = key.slice(0, 40);
    if (!classifiedByPrefix.has(prefix)) classifiedByPrefix.set(prefix, review);
  }

  const rows = aggregation.themeEvidence.flatMap((cluster) =>
    cluster.quotes.map((quote) => {
      const quoteKey = quote.text.trim().toLowerCase();
      const match =
        classifiedByText.get(quoteKey) ??
        classifiedByPrefix.get(quoteKey.slice(0, 40));

      return {
        id: newId(),
        run_id: runId,
        theme: cluster.label,
        quote_text: quote.text,
        source: quote.source,
        segment: quote.segment,
        confidence: quote.confidence,
        barrier: match?.barrier ?? null,
        root_cause: match?.root_cause ?? null,
        unmet_need: match?.unmet_need ?? null,
        classification_reasons:
          match?.classification_reasons ?? match?.evidence?.classification_reasons ?? null,
      };
    }),
  );

  if (rows.length === 0) return;

  const statements = rows.map((row) => ({
    sql: `INSERT INTO representative_quotes (id, run_id, theme, quote_text, source, segment, confidence, barrier, root_cause, unmet_need, classification_reasons)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      row.id,
      row.run_id,
      row.theme,
      row.quote_text,
      row.source,
      row.segment,
      row.confidence,
      row.barrier,
      row.root_cause,
      row.unmet_need,
      row.classification_reasons ? toJson(row.classification_reasons) : null,
    ],
  }));

  for (let offset = 0; offset < statements.length; offset += TURSO_STATEMENT_CHUNK) {
    await db.batch(
      statements.slice(offset, offset + TURSO_STATEMENT_CHUNK),
      "write",
    );
  }
}

export async function searchQuotes(
  runId: string,
  filters: QuoteSearchFilters,
  limit = 50,
): Promise<QuoteRecord[]> {
  const db = await getDb();
  const conditions = ["run_id = ?"];
  const args: (string | number)[] = [runId];

  if (filters.theme) {
    conditions.push("theme = ?");
    args.push(filters.theme);
  }
  if (filters.segment) {
    conditions.push("segment = ?");
    args.push(filters.segment);
  }
  if (filters.root_cause) {
    conditions.push("root_cause = ?");
    args.push(filters.root_cause);
  }
  if (filters.unmet_need) {
    conditions.push("unmet_need = ?");
    args.push(filters.unmet_need);
  }
  if (filters.barrier) {
    conditions.push("barrier = ?");
    args.push(filters.barrier);
  }
  if (filters.search) {
    conditions.push("quote_text LIKE ?");
    args.push(`%${filters.search}%`);
  }

  args.push(limit);

  const result = await db.execute({
    sql: `SELECT * FROM representative_quotes
          WHERE ${conditions.join(" AND ")}
          ORDER BY confidence DESC
          LIMIT ?`,
    args,
  });

  return result.rows.map((row) => ({
    id: String(row.id),
    run_id: String(row.run_id),
    theme: row.theme ? String(row.theme) : null,
    quote_text: String(row.quote_text),
    source: row.source ? String(row.source) : null,
    segment: row.segment ? String(row.segment) : null,
    confidence: row.confidence != null ? Number(row.confidence) : null,
    barrier: row.barrier ? String(row.barrier) : null,
    root_cause: row.root_cause ? String(row.root_cause) : null,
    unmet_need: row.unmet_need ? String(row.unmet_need) : null,
    classification_reasons: row.classification_reasons
      ? parseJsonColumn<NonNullable<QuoteRecord["classification_reasons"]>>(
          row.classification_reasons,
          {},
        )
      : undefined,
  }));
}

export async function getQuoteFilterOptions(runId: string): Promise<{
  themes: string[];
  segments: string[];
  rootCauses: string[];
  unmetNeeds: string[];
  barriers: string[];
}> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT theme, segment, root_cause, unmet_need, barrier
          FROM representative_quotes WHERE run_id = ?`,
    args: [runId],
  });

  const unique = (values: unknown[]) =>
    [...new Set(values.filter(Boolean).map(String))].sort();

  return {
    themes: unique(result.rows.map((r) => r.theme)),
    segments: unique(result.rows.map((r) => r.segment)),
    rootCauses: unique(result.rows.map((r) => r.root_cause)),
    unmetNeeds: unique(result.rows.map((r) => r.unmet_need)),
    barriers: unique(result.rows.map((r) => r.barrier)),
  };
}
