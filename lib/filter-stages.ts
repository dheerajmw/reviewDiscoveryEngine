/** User-facing copy for the two-stage review filter pipeline. */

export const FETCH_DISCOVERY_FILTER_TITLE = "Discovery keyword filter";

export const FETCH_DISCOVERY_FILTER_DESCRIPTION =
  "Live fetch keeps reviews that mention discovery topics — recommendations, Discover Weekly, Release Radar, DJ, shuffle, repetition, exploration, or algorithm. Generic store praise and billing-only posts are dropped after scraping.";

export const FETCH_DISCOVERY_FILTER_EXAMPLES =
  "discover weekly, recommendations, algorithm, same songs, find new artists, genre bubble";

export const CURATION_FILTER_TITLE = "PM cleanup filter";

export const CURATION_FILTER_DESCRIPTION =
  "First analysis stage: removes duplicates and reviews without PM discovery evidence — billing, ads, crashes, login, generic praise, playlist promos, and social spam. Only discovery-relevant rows proceed to LLM classification.";

export const PIPELINE_FILTER_SUMMARY =
  "Two filters: discovery keywords at fetch, then PM relevance cleanup before classification.";
