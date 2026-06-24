import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { aggregateReviews } from "../aggregation";
import { classifyReviewsMock } from "../classify-mock";
import { buildExecutiveResearchReport } from "../executive";
import {
  checkInsightQuality,
  MIN_SUPPORTING_REVIEWS,
} from "../executive/executive-quality";
import { synthesizeInsights } from "../executive/insight-synthesis";
import { dedupeSimilarInsights } from "../executive/mechanism-extraction";
import { POSITIVE_DISCOVERY_CORPUS } from "../quality/positive-discovery-corpus";
import type { RawReview } from "../types";

function review(text: string, source: string): RawReview {
  return { source, text };
}

const REPETITION_CORPUS: RawReview[] = [
  ...Array.from({ length: 6 }, (_, i) =>
    review(
      `Discover Weekly keeps playing the same artists every week. I hear ${["Drake", "Taylor", "Ed Sheeran", "The Weeknd", "Adele", "Coldplay"][i]} again and again with zero novelty.`,
      i % 2 === 0 ? "reddit" : "appstore",
    ),
  ),
  ...Array.from({ length: 6 }, (_, i) =>
    review(
      `The algorithm regurgitates my listening history. Same songs on repeat instead of finding new artists in indie rock.`,
      i % 2 === 0 ? "playstore" : "social-media",
    ),
  ),
];

describe("executive insight synthesis", () => {
  it("synthesizes narrative insights instead of label frequencies", () => {
    const classified = classifyReviewsMock(REPETITION_CORPUS);
    const aggregation = aggregateReviews(classified);
    const insights = synthesizeInsights(classified);

    assert.ok(insights.length > 0);
    const top = insights[0]!;
    assert.ok(top.insight.length > 40);
    assert.ok(!top.insight.includes("%"));
    assert.ok(!/^Repetition Fatigue =/.test(top.insight));
  });

  it("rejects findings with fewer than 5 supporting reviews", () => {
    const classified = classifyReviewsMock(REPETITION_CORPUS.slice(0, 3));
    const insights = synthesizeInsights(classified);
    for (const insight of insights) {
      const check = checkInsightQuality(insight);
      if (insight.supporting_reviews < MIN_SUPPORTING_REVIEWS) {
        assert.equal(check.passes, false);
      }
    }
  });

  it("produces executive report with slide-ready outputs", () => {
    const classified = classifyReviewsMock(REPETITION_CORPUS);
    const aggregation = aggregateReviews(classified);
    const report = buildExecutiveResearchReport({
      classified,
      aggregation,
    });

    assert.ok(report.executive_summary.length > 50);
    assert.ok(report.slides.length > 0);
    assert.ok(report.slides[0]!.headline.length > 20);
    assert.ok(report.slides[0]!.recommended_action.length > 10);
    assert.ok(report.strategic_opportunities.length > 0);
    assert.ok(report.strategic_opportunities[0]!.opportunity_score > 0);
    assert.ok(!report.executive_summary.includes("= 12%"));
  });

  it("scores opportunities by impact × frequency × confidence", () => {
    const classified = classifyReviewsMock(REPETITION_CORPUS);
    const aggregation = aggregateReviews(classified);
    const report = buildExecutiveResearchReport({
      classified,
      aggregation,
    });

    const ranked = report.strategic_opportunities;
    for (let i = 1; i < ranked.length; i++) {
      assert.ok(ranked[i - 1]!.opportunity_score >= ranked[i]!.opportunity_score);
    }
  });

  it("does not emit duplicate positive discovery findings", () => {
    const classified = classifyReviewsMock(
      POSITIVE_DISCOVERY_CORPUS.map((r) => ({
        source: r.source,
        text: r.text,
      })),
    );
    const aggregation = aggregateReviews(classified);
    const report = buildExecutiveResearchReport({
      classified,
      aggregation,
    });

    const titles = report.positive_discovery_signals.map((f) => f.title);
    assert.equal(new Set(titles).size, titles.length);

    const insights = synthesizeInsights(classified).filter((i) => i.is_positive);
    const deduped = dedupeSimilarInsights(insights);
    assert.ok(deduped.length <= insights.length);
  });
});
