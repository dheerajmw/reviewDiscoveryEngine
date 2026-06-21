"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAggregation } from "@/lib/aggregate-client";
import { curateAllReviews } from "@/lib/curate-client";
import {
  classifyAllReviews,
  estimateGroqClassification,
} from "@/lib/classify-client";
import { fetchFindings } from "@/lib/findings-client";
import { persistAnalysisRun } from "@/lib/runs-client";
import type { PipelineStep } from "@/lib/pipeline";
import type { CurationStats, RawReview } from "@/lib/types";
import AppFooter from "@/components/layout/AppFooter";
import AppHeader from "@/components/layout/AppHeader";
import StepIndicator from "@/components/layout/StepIndicator";
import Icon from "@/components/ui/Icon";
import LoadingState from "@/components/ui/LoadingState";
import FileUpload from "./FileUpload";
import CorpusLoader from "./CorpusLoader";
import FetchHeroIntro from "./FetchHeroIntro";
import ImportDivider from "./ImportDivider";
import LiveFetchPanel from "./LiveFetchPanel";
import UploadPreview from "./UploadPreview";
import CurationEmptyState from "./CurationEmptyState";
import CurationSummary from "./CurationSummary";

const MIN_CURATION_UI_MS = 700;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function UploadSection() {
  const router = useRouter();
  const [reviews, setReviews] = useState<RawReview[] | null>(null);
  const [curatedReviews, setCuratedReviews] = useState<RawReview[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>("idle");
  const [classifyProgress, setClassifyProgress] = useState({
    completed: 0,
    total: 0,
  });
  const [loadedFileName, setLoadedFileName] = useState<string | null>(null);
  const [mockClassifierEnabled, setMockClassifierEnabled] = useState(true);
  const [curationStats, setCurationStats] = useState<CurationStats | null>(null);
  const [curationNote, setCurationNote] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/classify/config")
      .then((res) => res.json())
      .then((data: { mockEnabled?: boolean }) => {
        setMockClassifierEnabled(Boolean(data.mockEnabled));
      })
      .catch(() => {
        setMockClassifierEnabled(true);
      });
  }, []);

  const isCurating = pipelineStep === "curating";
  const isCurationEmpty = pipelineStep === "curation_empty";
  const isInputBusy = pipelineStep === "parsing" || pipelineStep === "fetching";

  const isAnalyzing = ["classifying", "aggregating", "saving"].includes(
    pipelineStep,
  );

  const reviewsReady =
    Boolean(reviews) &&
    pipelineStep !== "parsing" &&
    !isCurating &&
    !isCurationEmpty &&
    !isAnalyzing;

  const groqEstimate =
    curatedReviews && !mockClassifierEnabled
      ? estimateGroqClassification(curatedReviews.length)
      : null;

  const resetAll = useCallback((options?: { message?: string }) => {
    setReviews(null);
    setCuratedReviews(null);
    setError(options?.message ?? null);
    setPipelineStep("idle");
    setClassifyProgress({ completed: 0, total: 0 });
    setLoadedFileName(null);
    setCurationStats(null);
    setCurationNote(null);
  }, []);

  const returnAfterEmptyCuration = useCallback(() => {
    resetAll({
      message:
        "No discovery or recommendation reviews remained after cleanup. Try a different dataset or corpus.",
    });
  }, [resetAll]);

  const runPostLoadCuration = async (
    parsed: RawReview[],
    fileName?: string,
  ) => {
    setReviews(parsed);
    setCuratedReviews(null);
    setLoadedFileName(fileName ?? null);
    setError(null);
    setCurationStats(null);
    setPipelineStep("curating");
    setCurationNote("Removing duplicates and off-topic reviews…");

    const startedAt = Date.now();

    try {
      const curation = await curateAllReviews(parsed);
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_CURATION_UI_MS) {
        await delay(MIN_CURATION_UI_MS - elapsed);
      }

      if (curation.included.length === 0) {
        setCurationStats(curation.stats);
        setCuratedReviews(null);
        setCurationNote(null);
        setPipelineStep("curation_empty");
        return;
      }

      const note = `${curation.stats.included.toLocaleString()} of ${curation.stats.total_loaded.toLocaleString()} reviews kept for analysis`;
      setCurationStats(curation.stats);
      setCuratedReviews(curation.included);
      setCurationNote(note);
      setPipelineStep("uploaded");
      setClassifyProgress({ completed: 0, total: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Review cleanup failed.");
      setPipelineStep("idle");
      setReviews(null);
      setLoadedFileName(null);
      setCurationStats(null);
      setCurationNote(null);
    }
  };

  const handleParsed = (parsed: RawReview[], fileName?: string) => {
    void runPostLoadCuration(parsed, fileName);
  };

  const handleError = (message: string) => {
    setReviews(null);
    setCuratedReviews(null);
    setError(message);
    setPipelineStep("idle");
    setLoadedFileName(null);
    setCurationStats(null);
    setCurationNote(null);
  };

  const handleAnalyze = async () => {
    const toClassify = curatedReviews;
    const stats = curationStats;
    if (!toClassify || !stats || isAnalyzing || isCurating) return;

    setPipelineStep("classifying");
    setError(null);
    setClassifyProgress({ completed: 0, total: toClassify.length });

    try {
      const { classified: results, mock: usedMockClassifier } =
        await classifyAllReviews(toClassify, (completed, total) => {
          setClassifyProgress({ completed, total });
        });

      setPipelineStep("aggregating");
      const aggregation = await fetchAggregation(results);
      const findings = await fetchFindings(aggregation);

      setPipelineStep("saving");
      const runId = await persistAnalysisRun({
        datasetName: loadedFileName ?? `Analysis ${new Date().toLocaleDateString()}`,
        classified: results,
        analysis: { aggregation, findings, curation: stats },
        usedMockClassifier,
        curation: stats,
      });

      router.push(`/runs/${runId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed.");
      setPipelineStep("uploaded");
    }
  };

  const currentStep = isAnalyzing
    ? "process"
    : isCurating || isCurationEmpty || reviewsReady
      ? "cleanup"
      : "upload";

  const showReviewWorkspace =
    Boolean(reviews) || isCurating || isCurationEmpty;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader subtitle="New analysis" activeNav="/" />
      <main
        className={`mx-auto w-full flex-1 px-4 py-10 md:px-8 ${
          !showReviewWorkspace ? "max-w-6xl" : "max-w-3xl"
        }`}
      >
        {!showReviewWorkspace ? (
          <div className="stitch-page-layout min-h-[calc(100dvh-7rem)]">
            <FetchHeroIntro />

            <section className="stitch-form-column flex flex-col gap-0">
              <div className="stitch-form-scroll custom-scrollbar">
                <div className="flex flex-col gap-6 pb-4">
                  <div className="hero-form-card stitch-dash-card rounded-xl p-6">
                    <LiveFetchPanel
                      priority
                      onFetchStart={() => {
                        setPipelineStep("fetching");
                        setError(null);
                      }}
                      onLoaded={(parsed, fileName) =>
                        handleParsed(parsed, fileName)
                      }
                      onError={handleError}
                      disabled={isInputBusy}
                    />
                  </div>

                  <ImportDivider />

                  <FileUpload
                    variant="import"
                    onParseStart={() => {
                      setPipelineStep("parsing");
                      setError(null);
                    }}
                    onParsed={(parsed) => handleParsed(parsed)}
                    onError={handleError}
                    disabled={isInputBusy}
                  />

                  <CorpusLoader
                    variant="banner"
                    onLoadStart={() => {
                      setPipelineStep("parsing");
                      setError(null);
                    }}
                    onLoaded={(parsed, fileName) =>
                      handleParsed(parsed, fileName)
                    }
                    onError={handleError}
                    disabled={isInputBusy}
                  />

                  {error && (
                    <div
                      role="alert"
                      className="rounded-lg border border-error-container bg-error-container px-4 py-3 text-sm text-on-error-container"
                    >
                      {error}
                    </div>
                  )}
                </div>
              </div>

              <div className="stitch-step-dock">
                <StepIndicator current={currentStep} />
              </div>
            </section>
          </div>
        ) : (
          <>
            {isCurationEmpty && (
              <div className="mb-6 text-center md:text-left">
                <h1 className="text-[2rem] font-semibold leading-tight tracking-tight text-on-surface">
                  Cleanup complete — nothing to analyze
                </h1>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Review the summary below, then choose a different dataset.
                </p>
              </div>
            )}

            {reviewsReady && (
              <div className="mb-6 text-center md:text-left">
                <h1 className="hero-title-shimmer text-[2rem] font-semibold leading-tight tracking-tight">
                  Review cleanup complete
                </h1>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Off-topic and duplicate Spotify reviews were removed. Ready
                  for LLM analysis.
                </p>
              </div>
            )}

            <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-sm sm:p-6">
              {isCurating && (
                <LoadingState
                  step="curating"
                  curationNote={curationNote ?? undefined}
                  curationOnly
                />
              )}

              {isAnalyzing && (
                <LoadingState
                  step={pipelineStep}
                  completed={classifyProgress.completed}
                  total={classifyProgress.total}
                  curationNote={curationNote ?? undefined}
                  curationComplete={Boolean(curationStats)}
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

              {isCurationEmpty && curationStats && (
                <CurationEmptyState
                  stats={curationStats}
                  fileName={loadedFileName}
                  onReturn={returnAfterEmptyCuration}
                />
              )}

              {reviewsReady && curatedReviews && curationStats && (
                <div className="mt-6 flex flex-col gap-4 animate-fade-in-up">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Icon name="filter_alt" className="text-primary" />
                      <p className="text-sm font-medium text-on-surface">
                        {curationStats.included.toLocaleString()} of{" "}
                        {curationStats.total_loaded.toLocaleString()} reviews
                        kept
                        {loadedFileName && (
                          <span className="font-normal text-on-surface-variant">
                            {" "}
                            · {loadedFileName}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => resetAll()}
                      className="text-xs font-medium text-on-surface-variant transition-colors hover:text-primary"
                    >
                      Start over
                    </button>
                  </div>

                  <CurationSummary stats={curationStats} />

                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                      Preview — reviews sent to analysis
                    </p>
                    <UploadPreview reviews={curatedReviews} />
                  </div>

                  {groqEstimate?.exceedsDailyTokenQuota && (
                    <div
                      role="status"
                      className="rounded-lg border border-warning-container bg-warning-container px-4 py-3 text-sm text-on-warning-container"
                    >
                      <p className="font-medium">Groq free-tier limit</p>
                      <p className="mt-1 text-xs leading-relaxed">
                        {curatedReviews.length} reviews needs ~
                        {groqEstimate.estimatedTokens.toLocaleString()}{" "}
                        tokens/day (limit 100K). Use{" "}
                        <code className="font-mono">sample100.csv</code>, enable{" "}
                        <code className="font-mono">USE_MOCK_CLASSIFIER=true</code>
                        , or split the file (~
                        {groqEstimate.maxReviewsPerDay} reviews max/day).
                      </p>
                    </div>
                  )}

                  {groqEstimate && !groqEstimate.exceedsDailyTokenQuota && (
                    <p className="text-xs text-on-surface-variant">
                      Live LLM run: ~{groqEstimate.batches} Groq requests, ~
                      {groqEstimate.estimatedMinutes} min (throttled for 12K
                      tok/min).
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={handleAnalyze}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-sm transition-all hover:shadow-lg hover:opacity-90 active:scale-[0.98]"
                  >
                    <Icon name="analytics" />
                    Analyze &amp; Save to Repository
                  </button>
                </div>
              )}
            </section>

            {showReviewWorkspace && (
              <StepIndicator current={currentStep} />
            )}
          </>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
