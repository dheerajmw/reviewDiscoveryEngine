"use client";

import { useState } from "react";
import { fetchAggregation } from "@/lib/aggregate-client";
import { classifyAllReviews } from "@/lib/classify-client";
import { fetchInsights } from "@/lib/insights-client";
import type { PipelineStep } from "@/lib/pipeline";
import type {
  AggregationResult,
  ClassifiedReview,
  InsightResult,
  RawReview,
} from "@/lib/types";
import Dashboard from "@/components/dashboard/Dashboard";
import AppFooter from "@/components/layout/AppFooter";
import AppHeader from "@/components/layout/AppHeader";
import StepIndicator from "@/components/layout/StepIndicator";
import Icon from "@/components/ui/Icon";
import LoadingState from "@/components/ui/LoadingState";
import FileUpload from "./FileUpload";
import UploadPreview from "./UploadPreview";

export default function UploadSection() {
  const [reviews, setReviews] = useState<RawReview[] | null>(null);
  const [classified, setClassified] = useState<ClassifiedReview[] | null>(
    null,
  );
  const [aggregation, setAggregation] = useState<AggregationResult | null>(
    null,
  );
  const [insights, setInsights] = useState<InsightResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>("idle");
  const [classifyProgress, setClassifyProgress] = useState({
    completed: 0,
    total: 0,
  });
  const [usedMockClassifier, setUsedMockClassifier] = useState(false);
  const [usedMockInsights, setUsedMockInsights] = useState(false);

  const isAnalyzing = [
    "parsing",
    "classifying",
    "aggregating",
    "insights",
  ].includes(pipelineStep);
  const isDone =
    pipelineStep === "done" &&
    classified !== null &&
    aggregation !== null &&
    insights !== null;

  const resetAll = () => {
    setReviews(null);
    setClassified(null);
    setAggregation(null);
    setInsights(null);
    setError(null);
    setPipelineStep("idle");
    setClassifyProgress({ completed: 0, total: 0 });
    setUsedMockClassifier(false);
    setUsedMockInsights(false);
  };

  const handleParsed = (parsed: RawReview[]) => {
    setReviews(parsed);
    setClassified(null);
    setAggregation(null);
    setInsights(null);
    setError(null);
    setPipelineStep("uploaded");
    setClassifyProgress({ completed: 0, total: 0 });
    setUsedMockClassifier(false);
    setUsedMockInsights(false);
  };

  const handleError = (message: string) => {
    setReviews(null);
    setClassified(null);
    setAggregation(null);
    setInsights(null);
    setError(message);
    setPipelineStep("idle");
  };

  const handleAnalyze = async () => {
    if (!reviews || isAnalyzing) return;

    setPipelineStep("classifying");
    setError(null);
    setClassified(null);
    setAggregation(null);
    setInsights(null);
    setClassifyProgress({ completed: 0, total: reviews.length });

    try {
      const { classified: results, mock } = await classifyAllReviews(
        reviews,
        (completed, total) => {
          setClassifyProgress({ completed, total });
        },
      );
      setClassified(results);
      setUsedMockClassifier(mock);

      setPipelineStep("aggregating");
      const aggregated = await fetchAggregation(results);
      setAggregation(aggregated);

      setPipelineStep("insights");
      const { insights: generated, mock: insightsMock } = await fetchInsights(
        aggregated,
        results,
      );
      setInsights(generated);
      setUsedMockInsights(insightsMock);
      setPipelineStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setPipelineStep(reviews ? "uploaded" : "idle");
    }
  };

  if (isDone) {
    return (
      <Dashboard
        classified={classified}
        aggregation={aggregation}
        insights={insights}
        usedMockClassifier={usedMockClassifier}
        usedMockInsights={usedMockInsights}
        onReupload={resetAll}
      />
    );
  }

  const currentStep = isAnalyzing
    ? "process"
    : reviews && pipelineStep !== "parsing"
      ? "preview"
      : "upload";

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-gutter py-8">
        {!isAnalyzing && (
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-on-surface sm:text-3xl">
              Upload reviews
            </h1>
            <p className="mx-auto mt-2 max-w-lg text-sm text-on-surface-variant">
              Upload a CSV of Spotify, App Store, Play Store, or Reddit reviews
              to uncover discovery problems and product opportunities.
            </p>
          </div>
        )}

        <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-sm">
          {!isAnalyzing && (
            <FileUpload
              onParseStart={() => {
                setPipelineStep("parsing");
                setError(null);
              }}
              onParsed={handleParsed}
              onError={handleError}
            />
          )}

          {isAnalyzing && (
            <LoadingState
              step={pipelineStep}
              completed={classifyProgress.completed}
              total={classifyProgress.total}
            />
          )}

          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm text-on-error-container"
            >
              {error}
            </div>
          )}

          {reviews && pipelineStep !== "parsing" && !isAnalyzing && (
            <div className="mt-6 flex flex-col gap-4 animate-fade-in-up">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Icon name="check_circle" className="text-primary" />
                  <p className="text-sm font-medium text-on-surface">
                    Loaded {reviews.length} review
                    {reviews.length === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetAll}
                  className="text-xs font-medium text-on-surface-variant transition-colors hover:text-primary"
                >
                  Upload different file
                </button>
              </div>

              <UploadPreview reviews={reviews} />

              <button
                type="button"
                onClick={handleAnalyze}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-on-primary transition-all hover:opacity-90 active:scale-[0.98]"
              >
                <Icon name="analytics" />
                Analyze Reviews
              </button>
            </div>
          )}
        </section>

        {!isAnalyzing && <StepIndicator current={currentStep} />}
      </main>
      <AppFooter />
    </div>
  );
}
