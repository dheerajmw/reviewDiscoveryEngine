import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanSpotifyCommunityReviewText } from "./spotify-community-text";

describe("cleanSpotifyCommunityReviewText", () => {
  it("strips superuser title and form metadata before the member post", () => {
    const raw =
      "Superuser Contribution_ Release Radar Songs Disappear. PlanPremiumCountryNZDeviceDesktop or phoneOperating SystemAll Windows versions, Android or IssueI've noticed this a few times lately that songs disappear from Release Radar.";
    const cleaned = cleanSpotifyCommunityReviewText(raw);
    assert.match(cleaned, /^I've noticed this a few times lately/i);
    assert.doesNotMatch(cleaned, /Superuser Contribution/i);
    assert.doesNotMatch(cleaned, /PlanPremium/i);
  });

  it("keeps body after My Question or Issue", () => {
    const raw =
      "Solved!!_ How to listen to audiobooks in a different language. PlanPremiumCountryUSADeviceManyOperating SystemMany My Question or IssueMy Spotify account is based in the USA though I am learning Swedish.";
    const cleaned = cleanSpotifyCommunityReviewText(raw);
    assert.match(cleaned, /^My Spotify account is based in the USA/i);
  });

  it("returns original text when cleaning would be too short", () => {
    const raw = "Hi";
    assert.equal(cleanSpotifyCommunityReviewText(raw), "Hi");
  });
});
