import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyReviewsMockWithReport } from "./classify-mock";
import { mergeClassificationItem } from "./classify-normalize";
import { buildResearchEvidenceDraft } from "./classify-research-mock";
import type { RawReview } from "./types";

function review(text: string, source = "reddit"): RawReview {
  return { source, text };
}

describe("research evidence classification", () => {
  it("rejects generic praise with no research value", () => {
    const draft = buildResearchEvidenceDraft(
      review("Love Spotify! Great app with good music selection."),
    );

    assert.equal(draft.research_relevant, false);

    const { review: classified } = mergeClassificationItem(
      review("Love Spotify! Great app with good music selection."),
      {
        research_relevant: false,
        discovery_relevant: false,
        confidence: 0.3,
      },
      0,
    );

    assert.equal(classified.research_relevant, false);
    assert.equal(classified.discovery_relevant, false);
    assert.equal(classified.supports_questions?.length ?? 0, 0);
  });

  it("keeps explicit discovery frustration with evidence fields", () => {
    const text =
      "Spotify keeps recommending the same artists every week in Discover Weekly.";
    const draft = buildResearchEvidenceDraft(review(text));

    assert.equal(draft.research_relevant, true);
    assert.ok(draft.supports_questions.includes("top_frustrations"));
    assert.ok(draft.evidence.length > 0);
    assert.ok(draft.observation.length > 0);

    const { classified } = classifyReviewsMockWithReport([review(text)]);
    const item = classified[0];

    assert.equal(item.research_relevant, true);
    assert.equal(item.discovery_relevant, true);
    assert.ok(item.research_evidence);
    assert.ok(item.observation);
    assert.ok(item.supports_questions && item.supports_questions.length > 0);
    assert.notEqual(item.theme, "");
    assert.notEqual(item.root_cause, "");
  });

  it("keeps implicit repetition signals as research relevant", () => {
    const text = "Same songs every day — shuffle always sounds identical.";
    const draft = buildResearchEvidenceDraft(review(text));

    assert.equal(draft.research_relevant, true);
    assert.ok(
      draft.supports_questions.includes("repetition_causes") ||
        draft.supports_questions.includes("top_frustrations"),
    );

    const { classified } = classifyReviewsMockWithReport([review(text)]);
    assert.equal(classified[0].research_relevant, true);
  });

  it("maps user goal and behavior for control-seeking reviews", () => {
    const text =
      "I wish I could adjust how adventurous recommendations are — need more exploration control.";
    const draft = buildResearchEvidenceDraft(review(text));

    assert.equal(draft.research_relevant, true);
    assert.ok(
      draft.user_goal === "receive better recommendations" ||
        draft.user_goal === "cross-genre exploration",
    );

    const { classified } = classifyReviewsMockWithReport([review(text)]);
    assert.equal(classified[0].classification_user_goal, draft.user_goal);
    assert.ok(classified[0].supports_questions?.includes("unmet_needs"));
  });

  it("rejects playlist promotion threads in mock research gate", () => {
    const draft = buildResearchEvidenceDraft(
      review("Drop your playlist! Follow me and I'll share mine."),
    );
    assert.equal(draft.research_relevant, false);
  });

  it("classifies positive discovery with dedicated theme in mock path", () => {
    const text =
      "Discover Weekly introduced me to so many new artists — recommendations are spot on!";
    const { classified } = classifyReviewsMockWithReport([review(text)]);
    assert.equal(classified[0].theme, "Positive Discovery Experience");
  });

  it("does not force theme-derived root cause in mock classification", () => {
    const text =
      "Discover Weekly feels repetitive and I want to find new artists outside my usual taste.";
    const { classified } = classifyReviewsMockWithReport([review(text)]);
    const item = classified[0];

    assert.equal(item.research_relevant, true);
    if (item.theme === "Repetition Fatigue") {
      assert.notEqual(item.root_cause, "Similarity-Based Reinforcement");
    }
  });

  it("merges LLM-shaped payload with research fields", () => {
    const { review: classified } = mergeClassificationItem(
      review("DJ always loops familiar tracks instead of helping me explore."),
      {
        research_relevant: true,
        supports_questions: ["repetition_causes", "top_frustrations"],
        observation: "User reports DJ loops familiar tracks",
        evidence: "loops familiar tracks",
        user_goal: "find new artists",
        discovery_relevant: true,
        theme: "Weak Discovery Surfaces",
        barrier: "Ineffective Discovery Surfaces",
        behavior: "Find New Music or Artists",
        emotion: "Frustration",
        segment: "Discovery-Focused Listener",
        root_cause: "Playlist or Radio Loop",
        unmet_need: "Stronger Discovery Playlists",
        confidence: 0.87,
      },
      0,
    );

    assert.equal(classified.research_relevant, true);
    assert.equal(classified.research_evidence, "loops familiar tracks");
    assert.equal(classified.classification_user_goal, "find new artists");
    assert.deepEqual(classified.supports_questions, [
      "repetition_causes",
      "top_frustrations",
    ]);
    assert.equal(classified.evidence?.research_quote, "loops familiar tracks");
  });
});
