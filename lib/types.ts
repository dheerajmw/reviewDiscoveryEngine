export interface RawReview {
  source: "reddit" | "playstore" | "appstore" | string;
  text: string;
}

export interface ClassifiedReview extends RawReview {
  theme: string;
  behavior: string;
  emotion: string;
  segment: string;
  barrier: string;
  root_cause: string;
  unmet_need: string;
  confidence: number;
}

export interface AggregationResult {
  themeFrequency: Record<string, { count: number; pct: number }>;
  segmentBreakdown: Record<string, { count: number; pct: number }>;
  barrierAnalysis: Record<string, { count: number; pct: number }>;
  totalReviews: number;
}

export interface InsightResult {
  summary: string;
  rootCauses: string[];
  discoveryProblems: string[];
  opportunities: { title: string; description: string }[];
}
