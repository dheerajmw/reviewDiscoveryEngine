import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveRootCauseNarrative } from "./root-cause-narratives";

describe("root cause narratives", () => {
  it("returns mechanism and product implication for known root causes", () => {
    const narrative = resolveRootCauseNarrative(
      "Similarity-Based Reinforcement",
    );

    assert.match(
      narrative.mechanism,
      /collaborative filtering model uses past listening/i,
    );
    assert.match(
      narrative.product_implication,
      /exploration-weighted ranking modes/i,
    );
  });

  it("falls back for unknown labels", () => {
    const narrative = resolveRootCauseNarrative("Unknown Cause");
    assert.ok(narrative.mechanism.length > 0);
    assert.ok(narrative.product_implication.length > 0);
  });
});
