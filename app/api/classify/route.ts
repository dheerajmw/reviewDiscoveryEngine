import { NextResponse } from "next/server";
import {
  classifyReviewsMockWithReport,
  isClassificationAuditEnabled,
  isMockClassifierEnabled,
} from "@/lib/classify-mock";
import { classifyReviews } from "@/lib/classify";
import {
  buildClassificationAuditRecords,
  buildConfidenceHistogram,
} from "@/lib/classification-audit";
import { getLlmApiKey, LLM_API_KEY_ENV, LLM_MODEL } from "@/lib/llm-config";
import {
  llmFallbackWarning,
  shouldFallbackToMockOnLlmError,
} from "@/lib/llm-errors";
import { MAX_CLASSIFY_BATCH_SIZE } from "@/lib/llm-limits";
import type { RawReview } from "@/lib/types";
import {
  lookupClassificationCache,
  mergeCachedClassifications,
  saveClassificationCache,
} from "@/services/classification-cache-service";

export async function POST(request: Request) {
  let body: { reviews?: RawReview[]; audit?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { reviews, audit: auditRequested } = body;
  const auditEnabled = auditRequested === true || isClassificationAuditEnabled();
  if (!Array.isArray(reviews) || reviews.length === 0) {
    return NextResponse.json(
      { error: "Request must include a non-empty reviews array." },
      { status: 400 },
    );
  }

  if (reviews.length > MAX_CLASSIFY_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Maximum ${MAX_CLASSIFY_BATCH_SIZE} reviews per request.` },
      { status: 400 },
    );
  }

  for (const review of reviews) {
    if (typeof review?.text !== "string" || !review.text.trim()) {
      return NextResponse.json(
        { error: "Each review must include non-empty text." },
        { status: 400 },
      );
    }
  }

  if (isMockClassifierEnabled()) {
    const { classified, taxonomyReport } = classifyReviewsMockWithReport(reviews);
    const response: Record<string, unknown> = { classified, taxonomyReport, mock: true };
    if (auditEnabled) {
      response.audit = buildClassificationAuditRecords(classified);
      response.confidenceHistogram = buildConfidenceHistogram(classified);
    }
    return NextResponse.json(response);
  }

  const apiKey = getLlmApiKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          `${LLM_API_KEY_ENV} is not configured. Add it to .env.local, or set USE_MOCK_CLASSIFIER=true for demo mode.`,
      },
      { status: 500 },
    );
  }

  try {
    const cacheLookup = await lookupClassificationCache(reviews, LLM_MODEL);
    let taxonomyReport;
    let freshlyClassified: Awaited<ReturnType<typeof classifyReviews>>["classified"] = [];
    let llmFallback = false;
    let warning: string | undefined;

    if (cacheLookup.missReviews.length > 0) {
      try {
        const result = await classifyReviews(cacheLookup.missReviews, apiKey);
        freshlyClassified = result.classified;
        taxonomyReport = result.taxonomyReport;
        await saveClassificationCache(freshlyClassified, LLM_MODEL);
      } catch (error) {
        if (!shouldFallbackToMockOnLlmError(error)) {
          throw error;
        }
        const mockResult = classifyReviewsMockWithReport(cacheLookup.missReviews);
        freshlyClassified = mockResult.classified;
        taxonomyReport = mockResult.taxonomyReport;
        llmFallback = true;
        warning = llmFallbackWarning(error);
      }
    }

    const classified = mergeCachedClassifications(
      reviews,
      cacheLookup.hits,
      cacheLookup.missIndices,
      freshlyClassified,
    );

    const response: Record<string, unknown> = {
      classified,
      taxonomyReport: taxonomyReport ?? null,
      mock: llmFallback,
      cache: {
        hits: cacheLookup.hits.size,
        misses: cacheLookup.missReviews.length,
        total: reviews.length,
      },
    };
    if (llmFallback) {
      response.llmFallback = true;
      response.warning = warning;
    }
    if (auditEnabled) {
      response.audit = buildClassificationAuditRecords(classified);
      response.confidenceHistogram = buildConfidenceHistogram(classified);
    }
    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Classification failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
