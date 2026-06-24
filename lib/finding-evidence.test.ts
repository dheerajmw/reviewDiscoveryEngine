import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  averageQuoteConfidence,
  clusterToFinding,
  resolveFindingConfidence,
} from "./finding-evidence";
import type { ClassifiedReview, ClusterEvidence } from "./types";

function review(theme: string, confidence: number): ClassifiedReview {
  return {
    review_id: `r-${theme}-${confidence}`,
    source: "reddit",
    text: `Review about ${theme}`,
    theme,
    behavior: "Find New Music or Artists",
    emotion: "Frustrated",
    segment: "Music Explorer",
    barrier: "Low Novelty",
    root_cause: "Listening History Loop",
    unmet_need: "Better Artist Discovery",
    confidence,
    discovery_relevant: true,
  };
}

describe("finding confidence aggregation", () => {
  it("averages confidence across all reviews tagged to a finding", () => {
    const tagged = [review("Repetition Fatigue", 0.9), review("Repetition Fatigue", 0.8)];
    const cluster: ClusterEvidence = {
      label: "Repetition Fatigue",
      count: 2,
      pct: 100,
      quotes: tagged.map((r) => ({
        review_id: r.review_id!,
        source: r.source,
        text: r.text,
        segment: r.segment,
        theme: r.theme,
        confidence: r.confidence,
      })),
    };

    const finding = clusterToFinding(cluster, tagged, "theme");
    assert.equal(finding.confidence, 0.85);
  });

  it("falls back to quote confidence when tagged review list is empty", () => {
    const quotes = [
      {
        review_id: "q1",
        source: "appstore",
        text: "Great discovery",
        segment: "Music Explorer",
        theme: "Positive Discovery Experience",
        confidence: 0.92,
      },
      {
        review_id: "q2",
        source: "reddit",
        text: "Found new artists",
        segment: "Music Explorer",
        theme: "Positive Discovery Experience",
        confidence: 0.86,
      },
    ];

    assert.equal(resolveFindingConfidence([], quotes), 0.89);
    assert.equal(averageQuoteConfidence(quotes), 0.89);
  });
});
