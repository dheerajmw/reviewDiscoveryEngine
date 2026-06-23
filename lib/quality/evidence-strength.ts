export type EvidenceStrength = "Strong" | "Medium" | "Weak";

export interface EvidenceStrengthSummary {
  strength: EvidenceStrength;
  supportingReviewCount: number;
  sourceCount: number;
  sources: string[];
}

export function computeEvidenceStrength(
  reviewCount: number,
  sources: string[],
): EvidenceStrengthSummary {
  const uniqueSources = [...new Set(sources.filter(Boolean))];
  const sourceCount = uniqueSources.length;

  let strength: EvidenceStrength = "Weak";
  if (reviewCount >= 20 && sourceCount >= 3) {
    strength = "Strong";
  } else if (reviewCount >= 10 && sourceCount >= 2) {
    strength = "Medium";
  }

  return {
    strength,
    supportingReviewCount: reviewCount,
    sourceCount,
    sources: uniqueSources,
  };
}

export function evidenceStrengthDistribution(
  summaries: EvidenceStrengthSummary[],
): { strong: number; medium: number; weak: number; strongPct: number } {
  const strong = summaries.filter((s) => s.strength === "Strong").length;
  const medium = summaries.filter((s) => s.strength === "Medium").length;
  const weak = summaries.filter((s) => s.strength === "Weak").length;
  const total = summaries.length;
  return {
    strong,
    medium,
    weak,
    strongPct: total === 0 ? 0 : Math.round((strong / total) * 1000) / 10,
  };
}

export function evidenceStrengthLabel(strength: EvidenceStrength): string {
  return strength;
}
