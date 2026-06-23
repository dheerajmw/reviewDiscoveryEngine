import { isPositiveTheme, OTHER_UNKNOWN_LABELS } from "../taxonomy";
import type { ClassifiedReview } from "../types";
import {
  POSITIVE_DISCOVERY_CORPUS,
  POSITIVE_DISCOVERY_DETECTION_TARGET_PCT,
} from "./positive-discovery-corpus";

export interface PositiveDiscoveryValidationResult {
  total: number;
  correct: number;
  detectionRatePct: number;
  misclassificationRatePct: number;
  targetPct: number;
  passesTarget: boolean;
  failures: {
    id: string;
    text: string;
    assignedTheme: string;
    reason: string;
  }[];
}

export function isPositiveDiscoveryTheme(theme: string): boolean {
  return isPositiveTheme(theme);
}

export function validatePositiveDiscoveryClassification(
  classified: ClassifiedReview[],
): PositiveDiscoveryValidationResult {
  const byText = new Map(
    classified.map((review) => [review.text.trim(), review]),
  );

  const failures: PositiveDiscoveryValidationResult["failures"] = [];
  let correct = 0;

  for (const fixture of POSITIVE_DISCOVERY_CORPUS) {
    const match =
      byText.get(fixture.text.trim()) ??
      classified.find(
        (r) =>
          r.text.includes(fixture.text.slice(0, 40)) ||
          fixture.text.includes(r.text.slice(0, 40)),
      );

    if (!match) {
      failures.push({
        id: fixture.id,
        text: fixture.text,
        assignedTheme: "(not classified)",
        reason: "Review missing from classification output",
      });
      continue;
    }

    if (isPositiveDiscoveryTheme(match.theme)) {
      correct++;
      continue;
    }

    const reason = OTHER_UNKNOWN_LABELS.has(match.theme)
      ? `Collapsed into fallback bucket "${match.theme}"`
      : `Assigned non-positive theme "${match.theme}"`;

    failures.push({
      id: fixture.id,
      text: fixture.text,
      assignedTheme: match.theme,
      reason,
    });
  }

  const total = POSITIVE_DISCOVERY_CORPUS.length;
  const detectionRatePct =
    total === 0 ? 0 : Math.round((correct / total) * 1000) / 10;
  const misclassificationRatePct =
    Math.round((100 - detectionRatePct) * 10) / 10;

  return {
    total,
    correct,
    detectionRatePct,
    misclassificationRatePct,
    targetPct: POSITIVE_DISCOVERY_DETECTION_TARGET_PCT,
    passesTarget: detectionRatePct >= POSITIVE_DISCOVERY_DETECTION_TARGET_PCT,
    failures,
  };
}

export async function classifyPositiveDiscoveryCorpus(
  classifyFn: (reviews: { source: string; text: string }[]) => Promise<{
    classified: ClassifiedReview[];
  }>,
): Promise<PositiveDiscoveryValidationResult> {
  const { classified } = await classifyFn(POSITIVE_DISCOVERY_CORPUS);
  return validatePositiveDiscoveryClassification(classified);
}
