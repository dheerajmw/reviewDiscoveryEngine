import type {
  ClassificationUserGoal,
  ResearchQuestionId,
} from "./classify-research";

export type { ClassificationUserGoal, ResearchQuestionId };

export interface RawReview extends PreprocessedReviewFields {
  source: "reddit" | "playstore" | "appstore" | string;
  text: string;
}

export type TaxonomyDimension =
  | "theme"
  | "behavior"
  | "emotion"
  | "segment"
  | "barrier"
  | "root_cause"
  | "unmet_need";

export interface FieldClassification {
  label: string;
  evidence: string;
}

export interface DiscoveryRelevanceAssessment {
  discovery_relevant: boolean;
  reason: string;
  confidence: number;
}

export type PrimaryCategory =
  | "technical"
  | "billing"
  | "ads"
  | "praise"
  | "discovery"
  | "mixed";

export type DiscoveryOutcome = "successful" | "failed" | "neutral" | "unknown";

export type PreprocessUserGoal =
  | "find new artists"
  | "explore genres"
  | "refresh playlists"
  | "discover music for mood"
  | "get personalized recommendations"
  | "find hidden gems"
  | "discover trending music"
  | null;

/** Enriched review after PM preprocessing (optional on RawReview payloads). */
export interface PreprocessedReviewFields {
  review_id?: string;
  original_text?: string;
  cleaned_text?: string;
  primary_category?: PrimaryCategory;
  discovery_outcome?: DiscoveryOutcome;
  user_goal?: PreprocessUserGoal;
  discovery_reason?: string;
  explicit_signal_count?: number;
  implicit_signal_count?: number;
}

export interface CurationStats {
  total_loaded: number;
  duplicates_removed: number;
  included: number;
  excluded: number;
  borderline_reviewed: number;
  by_reason: Record<string, number>;
}

export interface ClassificationEvidence {
  theme?: string;
  behavior?: string;
  emotion?: string;
  segment?: string;
  barrier?: string;
  root_cause?: string;
  unmet_need?: string;
  discovery?: string;
  /** PM observation sentence from classification pipeline. */
  observation?: string;
  /** Verbatim evidence quote (max ~15 words). */
  research_quote?: string;
  supports_questions?: ResearchQuestionId[];
  classification_user_goal?: ClassificationUserGoal;
  /** Per-field PM justification for assigned taxonomy labels. */
  classification_reasons?: Partial<Record<TaxonomyDimension, string>>;
}

export interface ClassifiedReview extends RawReview {
  /** Stable id for quote traceability (DB id or review-N). */
  review_id?: string;
  discovery_relevant: boolean;
  discovery_reason?: string;
  discovery_confidence?: number;
  /** Whether review has PM research value for Q1–Q6. */
  research_relevant?: boolean;
  supports_questions?: ResearchQuestionId[];
  observation?: string;
  /** Short verbatim evidence quote from classification. */
  research_evidence?: string;
  classification_user_goal?: ClassificationUserGoal;
  theme: string;
  behavior: string;
  emotion: string;
  segment: string;
  barrier: string;
  root_cause: string;
  unmet_need: string;
  confidence: number;
  evidence?: ClassificationEvidence;
  /** Per-field PM justification (mirrors evidence.classification_reasons). */
  classification_reasons?: Partial<Record<TaxonomyDimension, string>>;
}

export interface ClassificationAuditRecord {
  review_text: string;
  discovery_relevant: boolean;
  discovery_reason?: string;
  discovery_confidence?: number;
  theme: string;
  barrier: string;
  behavior: string;
  emotion: string;
  segment: string;
  root_cause: string;
  unmet_need: string;
  evidence: ClassificationEvidence;
  confidence: number;
  classification_reasons?: Partial<Record<TaxonomyDimension, string>>;
}

export interface TaxonomyViolation {
  field:
    | "theme"
    | "behavior"
    | "emotion"
    | "segment"
    | "barrier"
    | "root_cause"
    | "unmet_need";
  rawValue: string;
  mappedTo: string;
  reason: "empty" | "invalid" | "alias";
  reviewIndex?: number;
}

export interface TaxonomyReport {
  totalClassified: number;
  distribution: {
    theme: Record<string, number>;
    behavior: Record<string, number>;
    emotion: Record<string, number>;
    segment: Record<string, number>;
    barrier: Record<string, number>;
    root_cause: Record<string, number>;
    unmet_need: Record<string, number>;
  };
  distributionPct: {
    theme: Record<string, number>;
    behavior: Record<string, number>;
    emotion: Record<string, number>;
    segment: Record<string, number>;
    barrier: Record<string, number>;
    root_cause: Record<string, number>;
    unmet_need: Record<string, number>;
  };
  fallbackCount: number;
  fallbackRate: number;
  fallbacksByField: Record<TaxonomyViolation["field"], number>;
  otherUnknownRate: number;
  violations: TaxonomyViolation[];
}

export interface FrequencyEntry {
  count: number;
  pct: number;
}

export interface QuoteEvidence {
  review_id: string;
  source: string;
  text: string;
  segment: string;
  theme: string;
  confidence: number;
  barrier?: string;
  root_cause?: string;
  unmet_need?: string;
}

export interface EvidenceBackedFinding {
  id: string;
  title: string;
  summary: string;
  pct?: number;
  evidence_count: number;
  confidence: number;
  quotes: QuoteEvidence[];
  source_distribution: Record<string, number>;
  top_segments: { segment: string; count: number; pct: number }[];
  related_review_ids: string[];
  /** Structural reason this root cause produces repetition (repetition findings only). */
  mechanism?: string;
  /** Product change needed to address this root cause (repetition findings only). */
  product_implication?: string;
}

export interface SegmentChallengeFinding {
  id: string;
  segment: string;
  challenge: string;
  pct: number;
  evidence_count: number;
  confidence: number;
  quotes: QuoteEvidence[];
  source_distribution: Record<string, number>;
  related_review_ids: string[];
}

export interface ResearchFindingsReport {
  why_discovery_fails: EvidenceBackedFinding;
  top_frustrations: EvidenceBackedFinding[];
  listening_behaviors: EvidenceBackedFinding[];
  repetition_causes: EvidenceBackedFinding[];
  segment_challenges: SegmentChallengeFinding[];
  unmet_needs: EvidenceBackedFinding[];
}

export interface ResearchQuestionAnswer {
  id: ResearchQuestionId;
  question: string;
  answer: string;
  quotes: QuoteEvidence[];
  source_distribution: Record<string, number>;
  confidence: number;
  evidence_count: number;
}

export type RetentionSignal =
  | "High churn risk if unaddressed"
  | "Engagement growth opportunity"
  | "Cross-segment retention impact";

export interface OpportunityWithEvidence {
  title: string;
  description: string;
  supporting_unmet_needs: string[];
  evidence_count: number;
  confidence: number;
  quotes: QuoteEvidence[];
  source_distribution: Record<string, number>;
  related_review_ids: string[];
  affected_segments: string[];
  retention_signal: RetentionSignal;
  business_impact_score: number;
}

export interface ClusterEvidence {
  label: string;
  count: number;
  pct: number;
  quotes: QuoteEvidence[];
}

export interface CrossTabCell {
  count: number;
  pct: number;
}

export interface CrossTabResult {
  rowLabel: string;
  segments: string[];
  columns: string[];
  matrix: Record<string, Record<string, CrossTabCell>>;
}

export interface AggregationResult {
  totalReviews: number;
  discoveryRelevantCount: number;
  excludedCount: number;
  themeFrequency: Record<string, FrequencyEntry>;
  behaviorFrequency: Record<string, FrequencyEntry>;
  emotionFrequency: Record<string, FrequencyEntry>;
  segmentBreakdown: Record<string, FrequencyEntry>;
  barrierAnalysis: Record<string, FrequencyEntry>;
  rootCauseFrequency: Record<string, FrequencyEntry>;
  unmetNeedFrequency: Record<string, FrequencyEntry>;
  sourceBreakdown: Record<string, number>;
  segmentThemeCrossTab: CrossTabResult;
  segmentBarrierCrossTab: CrossTabResult;
  segmentUnmetNeedCrossTab: CrossTabResult;
  themeEvidence: ClusterEvidence[];
  behaviorEvidence: ClusterEvidence[];
  rootCauseEvidence: ClusterEvidence[];
  unmetNeedEvidence: ClusterEvidence[];
  repetitionEvidence: ClusterEvidence[];
}

export interface AnalysisBundle {
  aggregation: AggregationResult;
  findings: ResearchFindings;
  curation?: CurationStats;
  /** Executive insight synthesis — narrative findings for leadership. */
  executive?: ExecutiveResearchReport;
}

// ─── Executive product research engine ───────────────────────────────────

export type ConfidenceLevel = "High" | "Medium" | "Low";
export type EvidenceStrength = "Strong" | "Medium" | "Weak";
export type QuoteAlignmentScore = "Strong" | "Medium" | "Weak";
export type BusinessImpactArea =
  | "Retention"
  | "Engagement"
  | "Discovery"
  | "Monetization";
export type OpportunitySize = "Small" | "Medium" | "Large";

export interface ProductInsight {
  id: string;
  insight: string;
  supporting_reviews: number;
  supporting_segments: string[];
  supporting_sources: string[];
  themes: string[];
  barriers: string[];
  root_causes: string[];
  unmet_needs: string[];
  representative_quotes: QuoteEvidence[];
  confidence: number;
  /** 1 (low) – 5 (critical) */
  severity: number;
  opportunity_size: OpportunitySize;
  /** Mechanism extraction layer */
  symptom?: string;
  mechanism?: string;
  product_implication?: string;
  opportunity?: string;
  research_domain?: string;
  is_positive?: boolean;
}

export interface ExecutiveFinding {
  id: string;
  title: string;
  description: string;
  evidence_count: number;
  affected_segments: string[];
  representative_quotes: QuoteEvidence[];
  /** @deprecated Use confidence_score in UI */
  confidence: ConfidenceLevel;
  /** Mean classification confidence (0–1) across reviews in this finding */
  confidence_score: number;
  evidence_strength: EvidenceStrength;
  source_count: number;
  business_impact: BusinessImpactArea[];
  related_insight_id: string;
  symptom?: string;
  mechanism?: string;
  product_implication?: string;
  opportunity?: string;
  research_domain?: string;
  is_positive?: boolean;
}

export interface StrategicOpportunity {
  id: string;
  problem: string;
  current_user_behavior: string;
  root_cause: string;
  spotify_opportunity: string;
  size: OpportunitySize;
  opportunity_score: number;
  impact_score: number;
  frequency_score: number;
  confidence_score: number;
  supporting_reviews: number;
  affected_segments: string[];
  representative_quotes: QuoteEvidence[];
  related_finding_id: string;
}

export interface SegmentIntelligenceProfile {
  segment: string;
  display_name: string;
  primary_challenge: string;
  primary_unmet_need: string;
  discovery_behavior: string;
  representative_quote: QuoteEvidence | null;
  review_count: number;
}

export interface DiscoveryBehaviorNarrative {
  behavior: string;
  narrative: string;
  evidence_count: number;
  quote: string;
}

export interface UnmetNeedNarrative {
  need: string;
  narrative: string;
  evidence_count: number;
}

export interface SlideFinding {
  headline: string;
  evidence_count: number;
  supporting_quote: string;
  business_implication: string;
  recommended_action: string;
}

export interface ExecutiveQualityReport {
  total_candidates: number;
  accepted: number;
  rejected: number;
  rejection_reasons: string[];
}

export interface ExecutiveResearchReport {
  generated_at: string;
  executive_summary: string;
  dashboard_headline: string;
  insights: ProductInsight[];
  positive_discovery_signals: ExecutiveFinding[];
  top_discovery_problems: ExecutiveFinding[];
  top_recommendation_frustrations: ExecutiveFinding[];
  discovery_behaviors: DiscoveryBehaviorNarrative[];
  segment_differences: SegmentIntelligenceProfile[];
  unmet_needs: UnmetNeedNarrative[];
  strategic_opportunities: StrategicOpportunity[];
  key_quotes: QuoteEvidence[];
  confidence_assessment: string;
  slides: SlideFinding[];
  quality: ExecutiveQualityReport;
  director_readiness?: {
    score: number;
    maxScore: number;
    rationale: string;
  };
}

export interface ResearchFindings {
  why_discovery_fails: string;
  top_frustrations: string[];
  listening_behaviors: string[];
  repetition_causes: string[];
  segment_challenges: Record<string, string[]>;
  unmet_needs: string[];
  /** Full evidence-backed findings with quotes and traceability. */
  report?: ResearchFindingsReport;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatCitation {
  label: string;
  count?: number;
  sources?: string[];
  quote?: string;
}

export interface AnalysisContext {
  totalReviews: number;
  discoveryRelevantCount: number;
  evidence: AggregationResult;
  findings: ResearchFindings;
  executive?: ExecutiveResearchReport;
  filterNote?: string;
}

export interface ChatResponse {
  reply: string;
  citations?: ChatCitation[];
}

export type AnalysisRunStatus =
  | "pending"
  | "classifying"
  | "aggregating"
  | "insights"
  | "completed"
  | "failed";

export interface AnalysisRunSummary {
  id: string;
  created_at: string;
  dataset_name: string;
  total_reviews: number;
  discovery_reviews: number;
  excluded_reviews: number;
  analysis_mode: string;
  status: AnalysisRunStatus;
  used_mock_classifier: boolean;
}

export interface StoredAnalysisRun {
  run: AnalysisRunSummary;
  classified: ClassifiedReview[];
  analysis: AnalysisBundle;
  /** Present when status is `pending` — curated reviews awaiting LLM analysis. */
  pendingReviews?: RawReview[];
}

export interface QuoteRecord {
  id: string;
  run_id: string;
  theme: string | null;
  quote_text: string;
  source: string | null;
  segment: string | null;
  confidence: number | null;
  barrier: string | null;
  root_cause: string | null;
  unmet_need: string | null;
  classification_reasons?: Partial<Record<TaxonomyDimension, string>>;
}

export interface QuoteSearchFilters {
  theme?: string;
  segment?: string;
  root_cause?: string;
  unmet_need?: string;
  barrier?: string;
  search?: string;
}

export interface RunComparisonResult {
  runA: AnalysisRunSummary;
  runB: AnalysisRunSummary;
  themes: RunComparisonRow[];
  barriers: RunComparisonRow[];
  segments: RunComparisonRow[];
  rootCauses: RunComparisonRow[];
  unmetNeeds: RunComparisonRow[];
}

export interface RunComparisonRow {
  label: string;
  runAPct: number;
  runBPct: number;
  deltaPct: number;
  runACount: number;
  runBCount: number;
}
