import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSplitDatasetName,
  getSplitChunkSizes,
  getSplitOptions,
  splitReviews,
} from "./review-split.ts";

describe("review-split", () => {
  const reviews = Array.from({ length: 363 }, (_, index) => ({
    source: "reddit",
    text: `Review number ${index} about spotify discovery and recommendations`,
  }));

  it("splits reviews into near-equal parts", () => {
    const parts = splitReviews(reviews, 4);
    assert.equal(parts.length, 4);
    assert.equal(parts.flat().length, 363);
    assert.deepEqual(
      parts.map((chunk) => chunk.length),
      [91, 91, 91, 90],
    );
  });

  it("marks smaller split options as within quota for large sets", () => {
    const options = getSplitOptions(363);
    assert.equal(options.length, 4);
    assert.equal(options[0]?.parts, 2);
    assert.equal(options.at(-1)?.parts, 5);
    assert.equal(getSplitChunkSizes(363, 5).reduce((sum, n) => sum + n, 0), 363);
  });

  it("builds part labels from the base dataset name", () => {
    assert.equal(
      buildSplitDatasetName("live-fetch-250each", 2, 5),
      "live-fetch-250each · part 2 of 5",
    );
  });
});
