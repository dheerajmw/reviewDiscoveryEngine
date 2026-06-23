import type { ProductInsight } from "../types";

export interface ExecutiveComponentCheck {
  passes: boolean;
  reasons: string[];
  components: {
    user_problem: boolean;
    mechanism: boolean;
    business_implication: boolean;
    product_opportunity: boolean;
  };
}

const GENERIC_PHRASES =
  /\b(users experience|recommendation fatigue|discovery is hard|users struggle)\b/i;

const MIN_COMPONENT_LENGTH = 24;

function isSubstantive(text: string | undefined): boolean {
  if (!text?.trim()) return false;
  if (text.trim().length < MIN_COMPONENT_LENGTH) return false;
  if (GENERIC_PHRASES.test(text) && text.length < 60) return false;
  return true;
}

export function checkExecutiveComponents(
  insight: ProductInsight,
): ExecutiveComponentCheck {
  const user_problem = isSubstantive(insight.symptom ?? insight.insight);
  const mechanism = isSubstantive(insight.mechanism);
  const business_implication = isSubstantive(insight.product_implication);
  const product_opportunity = isSubstantive(insight.opportunity);

  const reasons: string[] = [];
  if (!user_problem) reasons.push("Missing user problem (symptom)");
  if (!mechanism) reasons.push("Missing mechanism / why it happens");
  if (!business_implication) reasons.push("Missing business implication");
  if (!product_opportunity) reasons.push("Missing product opportunity");

  return {
    passes: reasons.length === 0,
    reasons,
    components: {
      user_problem,
      mechanism,
      business_implication,
      product_opportunity,
    },
  };
}

export function executiveCompletenessRate(insights: ProductInsight[]): number {
  if (insights.length === 0) return 0;
  const passing = insights.filter((i) => checkExecutiveComponents(i).passes).length;
  return Math.round((passing / insights.length) * 1000) / 10;
}
