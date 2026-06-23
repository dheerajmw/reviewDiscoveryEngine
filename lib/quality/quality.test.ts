import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyReviewsMockWithReport } from "../classify-mock";
import { checkExecutiveComponents } from "./executive-component-validation";
import { validatePositiveDiscoveryClassification } from "./positive-discovery-validation";
import { POSITIVE_DISCOVERY_CORPUS } from "./positive-discovery-corpus";
import { scoreQuoteAlignment } from "./quote-alignment";
import { checkOpportunityQuality } from "./opportunity-quality";
import { computeEvidenceStrength } from "./evidence-strength";
import type { ProductInsight, QuoteEvidence, StrategicOpportunity } from "../types";

describe("PM research quality gates", () => {
  it("detects positive discovery themes in mock classification", async () => {
    const { classified } = classifyReviewsMockWithReport(
      POSITIVE_DISCOVERY_CORPUS.map((review) => ({
        source: review.source,
        text: review.text,
      })),
    );
    const result = validatePositiveDiscoveryClassification(classified);
    assert.ok(result.detectionRatePct >= 80, `expected ≥80%, got ${result.detectionRatePct}%`);
  });

  it("rejects weak quote alignment for mismatched praise", () => {
    const insight: ProductInsight = {
      id: "i1",
      insight: "Users are trapped in recommendation loops with repeated artists.",
      supporting_reviews: 8,
      supporting_segments: ["Power Listener"],
      supporting_sources: ["reddit", "appstore"],
      themes: ["Repetition Fatigue"],
      barriers: ["Low Novelty"],
      root_causes: ["Listening History Loop"],
      unmet_needs: ["Adjustable Novelty"],
      representative_quotes: [],
      confidence: 0.7,
      severity: 4,
      opportunity_size: "Large",
      symptom: "Users hear the same artists every week on Discover Weekly.",
      mechanism:
        "The ranking model over-weights recent listening history and suppresses novelty.",
      product_implication: "Users seeking novelty disengage from flagship discovery surfaces.",
      opportunity: "Add a novelty slider and artist repetition cap to Discover Weekly.",
    };
    const quote: QuoteEvidence = {
      review_id: "q1",
      source: "reddit",
      text: "Spotify introduced me to amazing artists I now love.",
      segment: "Casual Listener",
      theme: "Positive Discovery Experience",
      confidence: 0.8,
    };
    assert.equal(scoreQuoteAlignment(quote, insight), "Weak");
  });

  it("requires four executive components", () => {
    const incomplete: ProductInsight = {
      id: "i2",
      insight: "Users experience recommendation fatigue.",
      supporting_reviews: 10,
      supporting_segments: ["Power Listener"],
      supporting_sources: ["reddit", "appstore"],
      themes: ["Repetition Fatigue"],
      barriers: ["Low Novelty"],
      root_causes: ["Listening History Loop"],
      unmet_needs: ["Adjustable Novelty"],
      representative_quotes: [],
      confidence: 0.7,
      severity: 4,
      opportunity_size: "Medium",
    };
    const check = checkExecutiveComponents(incomplete);
    assert.equal(check.passes, false);
    assert.ok(check.reasons.length >= 3);
  });

  it("rejects generic buildability-free opportunities", () => {
    const insight: ProductInsight = {
      id: "i3",
      insight: "Discovery feels repetitive.",
      supporting_reviews: 12,
      supporting_segments: ["Power Listener"],
      supporting_sources: ["reddit", "appstore"],
      themes: ["Repetition Fatigue"],
      barriers: ["Low Novelty"],
      root_causes: ["Listening History Loop"],
      unmet_needs: ["Adjustable Novelty"],
      representative_quotes: [],
      confidence: 0.7,
      severity: 4,
      opportunity_size: "Large",
      symptom: "Users hear repeated artists in flagship playlists.",
      mechanism: "History-heavy ranking reduces novelty in weekly mixes.",
      product_implication: "Novelty-seeking users churn from algorithmic surfaces.",
      opportunity: "Ship novelty controls for Discover Weekly.",
    };
    const opportunity: StrategicOpportunity = {
      id: "opp-i3",
      problem: "Users hear repeated artists in flagship playlists every week.",
      current_user_behavior: "Users skip recommendations and return to saved music.",
      root_cause: "Listening History Loop",
      spotify_opportunity: "Improve recommendations",
      size: "Medium",
      opportunity_score: 20,
      impact_score: 3,
      frequency_score: 3,
      confidence_score: 3,
      supporting_reviews: 12,
      affected_segments: ["Power Listener"],
      representative_quotes: [],
      related_finding_id: "finding-i3",
    };
    const check = checkOpportunityQuality(opportunity, insight);
    assert.equal(check.passes, false);
  });

  it("labels evidence strength from review count and sources", () => {
    assert.equal(
      computeEvidenceStrength(22, ["reddit", "appstore", "playstore"]).strength,
      "Strong",
    );
    assert.equal(
      computeEvidenceStrength(12, ["reddit", "appstore"]).strength,
      "Medium",
    );
    assert.equal(computeEvidenceStrength(4, ["reddit"]).strength, "Weak");
  });
});
