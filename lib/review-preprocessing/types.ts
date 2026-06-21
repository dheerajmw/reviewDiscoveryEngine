export type PrimaryCategory =
  | "technical"
  | "billing"
  | "ads"
  | "praise"
  | "discovery"
  | "mixed";

export type DiscoveryOutcome = "successful" | "failed" | "neutral" | "unknown";

export type UserGoal =
  | "find new artists"
  | "explore genres"
  | "refresh playlists"
  | "discover music for mood"
  | "get personalized recommendations"
  | "find hidden gems"
  | "discover trending music"
  | null;

/** Full PM-research preprocessing output for one review. */
export interface PreprocessedReview {
  review_id: string;
  source: string;
  original_text: string;
  cleaned_text: string;
  primary_category: PrimaryCategory;
  discovery_relevant: boolean;
  discovery_outcome: DiscoveryOutcome;
  user_goal: UserGoal;
  /** Human-readable rationale for discovery_relevant decision. */
  discovery_reason: string;
  /** Confidence in discovery_relevant (0–1). */
  confidence: number;
  explicit_signal_count: number;
  implicit_signal_count: number;
}

/** Payload sent to classification (backwards compatible + enrichment). */
export interface PreprocessedReviewForClassification extends PreprocessedReview {
  /** Alias for classify endpoints expecting RawReview.text */
  text: string;
}

export interface PreprocessingStats {
  by_primary_category: Record<PrimaryCategory, number>;
  by_discovery_outcome: Record<DiscoveryOutcome, number>;
  with_user_goal: number;
}
