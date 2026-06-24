/** Per-source wall-clock budget for one /api/fetch-reviews call. */
export function getSourceFetchBudgetMs(): number {
  const raw = process.env.FETCH_SOURCE_BUDGET_MS;
  if (raw) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed >= 3_000) {
      return Math.floor(parsed);
    }
  }
  // Vercel Hobby hard-caps at 10s; leave headroom for cold start + JSON serialization.
  return process.env.VERCEL ? 6_500 : 50_000;
}

/** Hard ceiling before the platform returns an HTML 504 page. */
export function getPlatformFetchDeadlineMs(): number {
  return process.env.VERCEL ? 9_000 : 120_000;
}

export function getPullpushRequestTimeoutMs(): number {
  return getSourceFetchBudgetMs() <= 12_000 ? 4_000 : 12_000;
}

export function getAppStoreRequestTimeoutMs(): number {
  return getSourceFetchBudgetMs() <= 12_000 ? 3_500 : 8_000;
}

export function isTightFetchBudget(budgetMs = getSourceFetchBudgetMs()): boolean {
  return budgetMs <= 12_000;
}

/** Client-side chunk size — each /api/fetch-reviews call must finish within ~10s on Vercel Hobby. */
export const SERVERLESS_CHUNKED_SOURCE_LIMIT = 20;
