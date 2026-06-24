"use client";

import type { LlmClassificationEstimate } from "@/lib/llm-limits";
import Icon from "@/components/ui/Icon";

export interface LlmProviderLimits {
  requestsPerMinute: number;
  requestsPerDay: number;
  tokensPerMinute: number;
  tokensPerDay: number;
}

interface LlmEstimatePanelProps {
  estimate: LlmClassificationEstimate;
  model: string;
  limits: LlmProviderLimits;
  provider?: string;
}

function formatTokens(n: number): string {
  return n.toLocaleString();
}

export default function LlmEstimatePanel({
  estimate,
  model,
  limits,
  provider = "Cerebras",
}: LlmEstimatePanelProps) {
  const exceeds =
    estimate.exceedsDailyTokenQuota || estimate.exceedsDailyRequestQuota;
  const shortModel = model.includes("/") ? model.split("/").pop()! : model;

  return (
    <div
      role="note"
      className={`rounded-lg border px-4 py-3 text-sm ${
        exceeds
          ? "border-warning-container bg-warning-container text-on-warning-container"
          : "border-outline-variant bg-surface-container-low text-on-surface-variant"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <Icon
          name={exceeds ? "warning" : "bolt"}
          className={`mt-0.5 shrink-0 text-base ${exceeds ? "" : "text-primary"}`}
        />
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="font-medium text-on-surface">
              {exceeds ? `${provider} limit warning` : `${provider} classification estimate`}
            </p>
            <p className="mt-0.5 text-xs">
              Model:{" "}
              <code className="font-mono text-[11px] text-on-surface">
                {shortModel}
              </code>
            </p>
          </div>

          <div className="grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-md bg-surface-container-lowest/80 px-2.5 py-2">
              <p className="font-medium text-on-surface">This run</p>
              <p className="mt-1 leading-relaxed">
                {estimate.reviewCount.toLocaleString()} reviews ·{" "}
                ~{estimate.batches} requests · batch {estimate.batchSize}
              </p>
              <p className="mt-1 leading-relaxed">
                ~{formatTokens(estimate.estimatedTokens)} tokens total
                {" "}
                <span className="text-on-surface">
                  (~{formatTokens(estimate.tokensPerReview)}/review)
                </span>
              </p>
              <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                Input ~{formatTokens(estimate.estimatedInputTokens)} · output
                ~{formatTokens(estimate.estimatedOutputTokens)}
              </p>
            </div>

            <div className="rounded-md bg-surface-container-lowest/80 px-2.5 py-2">
              <p className="font-medium text-on-surface">{provider} limits</p>
              <p className="mt-1 leading-relaxed">
                {limits.requestsPerMinute} RPM ·{" "}
                {formatTokens(limits.requestsPerDay)} RPD
              </p>
              <p className="mt-1 leading-relaxed">
                {formatTokens(limits.tokensPerMinute)} TPM ·{" "}
                {formatTokens(limits.tokensPerDay)} TPD
              </p>
              <p className="mt-1 text-[11px] leading-relaxed opacity-90">
                This run ≈ {estimate.dailyTokenBudgetPct}% of daily token budget
                {estimate.exceedsDailyRequestQuota
                  ? " · exceeds daily request budget"
                  : ""}
              </p>
            </div>
          </div>

          <p className="text-xs leading-relaxed">
            {exceeds ? (
              <>
                {estimate.reviewCount.toLocaleString()} reviews needs ~
                {formatTokens(estimate.estimatedTokens)} tokens (limit{" "}
                {formatTokens(limits.tokensPerDay)} TPD). Split into repository
                batches below, reduce review count, or use mock mode.
              </>
            ) : (
              <>
                Live LLM run: ~{estimate.batches} {provider} requests, ~
                {estimate.estimatedMinutes} min (~
                {formatTokens(estimate.tokensPerReview)} tokens/review, throttled
                for {formatTokens(limits.tokensPerMinute)} TPM).
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
