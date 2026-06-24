import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { aggregateReviews } from "./aggregation";
import { buildResearchFindingsReport } from "./findings";
import {
  RESEARCH_QUESTION_IDS,
  RESEARCH_QUESTION_LABELS,
} from "./classify-research";
import { buildResearchQuestionAnswers } from "./research-questions";
import type { ClassifiedReview } from "./types";

function review(overrides: Partial<ClassifiedReview>): ClassifiedReview {
  return {
    review_id: crypto.randomUUID(),
    text: "Discover Weekly keeps playing the same artists and I cannot find anything new.",
    source: "reddit",
    discovery_relevant: true,
    research_relevant: true,
    supports_questions: [
      "why_discovery_fails",
      "top_frustrations",
      "repetition_causes",
      "unmet_needs",
    ],
    theme: "Repetition Fatigue",
    behavior: "Find New Music or Artists",
    emotion: "Frustration",
    segment: "Music Explorer",
    barrier: "Low Novelty",
    root_cause: "Similarity-Based Reinforcement",
    unmet_need: "Better Artist Discovery",
    confidence: 0.88,
    ...overrides,
  };
}

describe("research question answers", () => {
  it("returns six grounded answers with exact question labels", () => {
    const classified = [
      review({}),
      review({
        text: "I wish I could tell Spotify to explore more genres instead of the same playlists.",
        emotion: "Curiosity",
        behavior: "Explore by Genre or Mood",
        unmet_need: "Discovery Control",
        supports_questions: ["listening_behaviors", "unmet_needs", "segment_challenges"],
        segment: "Discovery-Focused Listener",
        theme: "Lack of Discovery Control",
        barrier: "Lack of Exploration Controls",
      }),
      review({
        text: "Daily Mix sounds identical every week and I keep hearing songs I already saved.",
        theme: "Discovery Fatigue",
        root_cause: "Discovery Surface Design Issues",
        segment: "Casual Listener",
        supports_questions: ["repetition_causes", "top_frustrations"],
      }),
    ];

    const evidence = aggregateReviews(classified);
    const report = buildResearchFindingsReport(evidence, classified);
    const answers = buildResearchQuestionAnswers(report, evidence);

    assert.equal(answers.length, 6);
    for (const id of RESEARCH_QUESTION_IDS) {
      const answer = answers.find((item) => item.id === id);
      assert.ok(answer);
      assert.equal(answer.question, RESEARCH_QUESTION_LABELS[id]);
      assert.ok(answer.answer.length > 40);
      assert.ok(answer.quotes.length > 0);
      assert.ok(answer.confidence > 0);
      assert.ok(Object.keys(answer.source_distribution).length > 0);
    }
  });
});
