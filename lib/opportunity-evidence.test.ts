import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  businessImpactScore,
  resolveAffectedSegments,
  resolveRetentionSignal,
} from "./opportunity-evidence";
import type { ClassifiedReview } from "./types";

function review(
  overrides: Partial<ClassifiedReview> &
    Pick<ClassifiedReview, "segment" | "emotion">,
): ClassifiedReview {
  return {
    review_id: crypto.randomUUID(),
    text: "sample",
    source: "reddit",
    discovery_relevant: true,
    theme: "Repetition Fatigue",
    behavior: "Skip Recommendations",
    emotion: overrides.emotion,
    segment: overrides.segment,
    barrier: "None",
    root_cause: "Listening History Loop",
    unmet_need: "More Novelty",
    confidence: 0.9,
    ...overrides,
  };
}

describe("opportunity evidence enrichment", () => {
  it("resolves a single dominant affected segment", () => {
    const reviews = [
      review({ segment: "Music Explorer", emotion: "Frustration" }),
      review({ segment: "Music Explorer", emotion: "Frustration" }),
      review({ segment: "Music Explorer", emotion: "Frustration" }),
      review({ segment: "Music Explorer", emotion: "Frustration" }),
      review({ segment: "Casual Listener", emotion: "Curiosity" }),
    ];

    assert.deepEqual(resolveAffectedSegments(reviews), ["Music Explorer"]);
  });

  it("resolves multiple affected segments when two segments are significant", () => {
    const reviews = [
      review({ segment: "Music Explorer", emotion: "Frustration" }),
      review({ segment: "Music Explorer", emotion: "Frustration" }),
      review({ segment: "Casual Listener", emotion: "Curiosity" }),
      review({ segment: "Casual Listener", emotion: "Curiosity" }),
      review({ segment: "Discovery-Focused Listener", emotion: "Neutral" }),
    ];

    assert.deepEqual(resolveAffectedSegments(reviews), [
      "Music Explorer",
      "Casual Listener",
    ]);
  });

  it("flags cross-segment retention impact when multiple segments are affected", () => {
    const reviews = [
      review({ segment: "Music Explorer", emotion: "Frustration" }),
      review({ segment: "Music Explorer", emotion: "Frustration" }),
      review({ segment: "Casual Listener", emotion: "Curiosity" }),
      review({ segment: "Casual Listener", emotion: "Curiosity" }),
      review({ segment: "Discovery-Focused Listener", emotion: "Neutral" }),
    ];
    const segmentStats = [
      { segment: "Music Explorer", count: 2, pct: 40 },
      { segment: "Casual Listener", count: 2, pct: 40 },
      { segment: "Discovery-Focused Listener", count: 1, pct: 20 },
    ];

    assert.equal(
      resolveRetentionSignal(reviews, segmentStats),
      "Cross-segment retention impact",
    );
  });

  it("flags churn risk when the primary segment shows high frustration", () => {
    const reviews = [
      ...Array.from({ length: 9 }, () =>
        review({ segment: "Music Explorer", emotion: "Frustration" }),
      ),
      review({ segment: "Casual Listener", emotion: "Curiosity" }),
    ];
    const segmentStats = [
      { segment: "Music Explorer", count: 9, pct: 90 },
      { segment: "Casual Listener", count: 1, pct: 10 },
    ];

    assert.equal(
      resolveRetentionSignal(reviews, segmentStats),
      "High churn risk if unaddressed",
    );
  });

  it("flags engagement growth when the primary segment shows curiosity", () => {
    const reviews = [
      review({ segment: "Discovery-Focused Listener", emotion: "Curiosity" }),
      review({ segment: "Discovery-Focused Listener", emotion: "Curiosity" }),
      review({ segment: "Discovery-Focused Listener", emotion: "Neutral" }),
      review({ segment: "Discovery-Focused Listener", emotion: "Neutral" }),
    ];
    const segmentStats = [
      { segment: "Discovery-Focused Listener", count: 4, pct: 100 },
    ];

    assert.equal(
      resolveRetentionSignal(reviews, segmentStats),
      "Engagement growth opportunity",
    );
  });

  it("ranks churn risk above engagement growth in business impact score", () => {
    const churn = businessImpactScore("High churn risk if unaddressed", 20);
    const growth = businessImpactScore("Engagement growth opportunity", 20);
    const cross = businessImpactScore("Cross-segment retention impact", 20);

    assert.ok(churn > cross);
    assert.ok(cross > growth);
  });
});
