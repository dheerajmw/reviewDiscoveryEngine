import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { preprocessReview } from "./preprocess-review";

describe("review preprocessing pipeline", () => {
  it("classifies a technical review as non-discovery", () => {
    const result = preprocessReview(
      "playstore",
      "The app crashes every time I open it and keeps stopping. Cannot login either.",
      "review-1",
    );

    assert.equal(result.primary_category, "technical");
    assert.equal(result.discovery_relevant, false);
    assert.equal(result.discovery_outcome, "unknown");
    assert.equal(result.user_goal, null);
    assert.match(result.cleaned_text, /crashes/);
    assert.equal(result.original_text.includes("crashes"), true);
  });

  it("classifies a billing review as non-discovery", () => {
    const result = preprocessReview(
      "playstore",
      "Premium subscription is too expensive and I was charged twice this month.",
      "review-2",
    );

    assert.equal(result.primary_category, "billing");
    assert.equal(result.discovery_relevant, false);
    assert.equal(result.discovery_outcome, "unknown");
  });

  it("classifies an ads review as non-discovery", () => {
    const result = preprocessReview(
      "playstore",
      "Too many ads — I get ad interruptions before every song on the free plan.",
      "review-3",
    );

    assert.equal(result.primary_category, "ads");
    assert.equal(result.discovery_relevant, false);
  });

  it("classifies generic praise without discovery context as non-discovery", () => {
    const result = preprocessReview(
      "playstore",
      "Amazing app! Love Spotify — best music app ever, five stars!",
      "review-4",
    );

    assert.equal(result.primary_category, "praise");
    assert.equal(result.discovery_relevant, false);
    assert.equal(result.discovery_outcome, "unknown");
  });

  it("excludes playlist promotion threads", () => {
    const result = preprocessReview(
      "reddit",
      "Drop a playlist, I'll share one of mine! Follow my account and I'll follow back!",
      "review-promo",
    );

    assert.equal(result.discovery_relevant, false);
    assert.match(result.discovery_reason, /playlist promotion/i);
  });

  it("keeps positive discovery praise with substance", () => {
    const result = preprocessReview(
      "appstore",
      "Discover Weekly introduced me to dozens of artists I now listen to every day. Recommendations work great.",
      "review-positive",
    );

    assert.equal(result.discovery_relevant, true);
    assert.ok(
      result.discovery_outcome === "successful" ||
        result.discovery_outcome === "neutral",
    );
  });

  it("keeps explicit discovery reviews with failed outcome", () => {
    const result = preprocessReview(
      "reddit",
      "Discover Weekly keeps repeating the same artists and my recommendations are terrible.",
      "review-5",
    );

    assert.equal(result.discovery_relevant, true);
    assert.ok(result.explicit_signal_count >= 1);
    assert.equal(result.primary_category, "discovery");
    assert.equal(result.discovery_outcome, "failed");
    assert.ok(result.user_goal !== null);
  });

  it("keeps implicit discovery reviews with repetition signals", () => {
    const result = preprocessReview(
      "reddit",
      "Same songs every day — shuffle always sounds identical and nothing new in my playlists.",
      "review-6",
    );

    assert.equal(result.discovery_relevant, true);
    assert.equal(result.implicit_signal_count >= 1, true);
    assert.ok(
      result.primary_category === "discovery" ||
        result.primary_category === "mixed",
    );
    assert.ok(
      result.discovery_outcome === "failed" ||
        result.discovery_outcome === "neutral",
    );
    assert.ok(result.user_goal !== null);
  });

  it("marks mixed ads + discovery reviews as discovery relevant", () => {
    const result = preprocessReview(
      "playstore",
      "Too many ads, but also my recommendations are repetitive and I never find new artists.",
      "review-7",
    );

    assert.equal(result.primary_category, "mixed");
    assert.equal(result.discovery_relevant, true);
    assert.equal(result.user_goal, "find new artists");
  });

  it("normalizes urls and preserves original text", () => {
    const result = preprocessReview(
      "reddit",
      "Check https://open.spotify.com/track/123 — recommendations are repetitive!!!",
      "review-8",
    );

    assert.match(result.original_text, /https:\/\/open.spotify.com/);
    assert.doesNotMatch(result.cleaned_text, /https?:/);
    assert.equal(result.discovery_relevant, true);
  });

  it("decodes html entities in original text", () => {
    const result = preprocessReview(
      "social-media",
      "Spotify&#x27;s recommendations and client&#x2F;ads are bad.",
      "review-html",
    );

    assert.equal(result.original_text, "Spotify's recommendations and client/ads are bad.");
    assert.match(result.cleaned_text, /spotify's recommendations/);
  });

  it("detects successful discovery outcome", () => {
    const result = preprocessReview(
      "reddit",
      "I found amazing new artists through Discover Weekly — great recommendations!",
      "review-9",
    );

    assert.equal(result.discovery_relevant, true);
    assert.equal(result.discovery_outcome, "successful");
    assert.equal(result.user_goal, "find new artists");
  });
});
