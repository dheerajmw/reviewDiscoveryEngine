"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchLiveReviews,
  loadFetchConfig,
} from "@/lib/fetch-reviews-client";
import type {
  AppStoreSort,
  FetchConfigResponse,
  FetchSourceId,
  PlayStoreSort,
} from "@/lib/fetch/types";
import {
  DEFAULT_LIMIT_PER_SOURCE,
  DEFAULT_REDDIT_QUERY_INPUT,
  DEFAULT_REDDIT_SUBREDDIT_LABELS,
} from "@/lib/fetch/config";
import type { RawReview } from "@/lib/types";
import Icon from "@/components/ui/Icon";
import {
  FetchFiltersSection,
  FetchRangeControl,
  FetchRatingChips,
  FetchSelect,
  FetchTextInput,
} from "./fetch-form-fields";

interface LiveFetchPanelProps {
  onFetchStart?: () => void;
  onLoaded: (reviews: RawReview[], fileName: string, warning?: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  priority?: boolean;
}

const SOURCE_ICONS: Record<FetchSourceId, string> = {
  playstore: "shop_two",
  appstore: "shop_two",
  reddit: "forum",
  "spotify-community": "groups",
  "social-media": "share",
};

export default function LiveFetchPanel({
  onFetchStart,
  onLoaded,
  onError,
  disabled = false,
  priority = false,
}: LiveFetchPanelProps) {
  const [config, setConfig] = useState<FetchConfigResponse | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchProgress, setFetchProgress] = useState<string | null>(null);

  const [selectedSources, setSelectedSources] = useState<FetchSourceId[]>([
    "playstore",
  ]);
  const [limitPerSource, setLimitPerSource] = useState(
    DEFAULT_LIMIT_PER_SOURCE,
  );
  const [playStoreSort, setPlayStoreSort] = useState<PlayStoreSort>("newest");
  const [appStoreSort, setAppStoreSort] = useState<AppStoreSort>("recent");
  const [region, setRegion] = useState("global");
  const [minRating, setMinRating] = useState(0);
  const [redditQuery, setRedditQuery] = useState(DEFAULT_REDDIT_QUERY_INPUT);

  useEffect(() => {
    loadFetchConfig()
      .then((data) => {
        setConfig(data);
        setLimitPerSource(
          data.defaults.limitPerSource ?? DEFAULT_LIMIT_PER_SOURCE,
        );
        setRegion(data.defaults.region);
        setPlayStoreSort(data.defaults.playStoreSort);
        setAppStoreSort(data.defaults.appStoreSort);
      })
      .catch((err) => {
        setConfigError(
          err instanceof Error ? err.message : "Failed to load fetch options.",
        );
      });
  }, []);

  const selectedMeta = useMemo(
    () =>
      config?.sources.filter((source) => selectedSources.includes(source.id)) ??
      [],
    [config, selectedSources],
  );

  const showStoreFilters = selectedMeta.some(
    (source) => source.supportsSort || source.supportsMinRating,
  );
  const showPlayStoreSort = selectedSources.includes("playstore");
  const showAppStoreSort = selectedSources.includes("appstore");
  const showCountry = selectedMeta.some((source) => source.supportsCountry);
  const showMinRating = selectedMeta.some((source) => source.supportsMinRating);
  const showRedditQuery = selectedSources.includes("reddit");

  const estimatedTotal = limitPerSource * selectedSources.length;

  const toggleSource = (sourceId: FetchSourceId) => {
    setSelectedSources((current) => {
      if (current.includes(sourceId)) {
        return current.length === 1
          ? current
          : current.filter((id) => id !== sourceId);
      }
      const max = config?.limits.maxSources ?? 5;
      if (current.length >= max) return current;
      return [...current, sourceId];
    });
  };

  const handleFetch = async () => {
    if (disabled || loading || selectedSources.length === 0) return;

    setLoading(true);
    setFetchProgress(null);
    onFetchStart?.();

    try {
      const result = await fetchLiveReviews(
        {
          sources: selectedSources,
          limitPerSource,
          playStoreSort,
          appStoreSort,
          region,
          minRating: minRating > 0 ? minRating : undefined,
          redditQuery: redditQuery.trim() || DEFAULT_REDDIT_QUERY_INPUT,
        },
        {
          onSourceProgress: (source, completed, total) => {
            const label =
              config?.sources.find((item) => item.id === source)?.label ?? source;
            setFetchProgress(`Fetching ${label} (${completed}/${total})…`);
          },
        },
      );
      onLoaded(result.reviews, result.label, result.warning);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Live fetch failed.");
    } finally {
      setLoading(false);
      setFetchProgress(null);
    }
  };

  if (configError) {
    return (
      <div className={priority ? "" : "mt-6 border-t border-outline-variant pt-6"}>
        <p className="text-sm text-on-error-container">{configError}</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className={priority ? "" : "mt-6 border-t border-outline-variant pt-6"}>
        <p className="text-sm text-on-surface-variant">Loading fetch options…</p>
      </div>
    );
  }

  return (
    <div className={priority ? "" : "mt-6 border-t border-outline-variant pt-6"}>
      <div className="mb-6 flex items-start gap-3">
        <Icon name="podcasts" className="mt-0.5 text-on-surface-variant" />
        <div>
          <h3 className="text-sm font-semibold text-on-surface">LiveFetch Panel</h3>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            Fetches <span className="font-medium text-on-surface">Spotify reviews only</span>{" "}
            from Play Store, App Store, Reddit, Spotify Community, and social sources.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-tight text-outline">
            Data Source
          </p>
          <div className="flex flex-wrap gap-2">
            {config.sources.map((source) => {
              const active = selectedSources.includes(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  disabled={disabled || loading}
                  onClick={() => toggleSource(source.id)}
                  title={source.description}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-60 ${
                    active
                      ? "bg-primary text-on-primary hover:opacity-90"
                      : "border border-outline-variant bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                  }`}
                >
                  <Icon
                    name={SOURCE_ICONS[source.id]}
                    className={`text-[18px] ${active ? "text-on-primary" : ""}`}
                    filled={active}
                  />
                  {source.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-on-surface-variant">
            <span className="font-mono font-bold text-primary">
              {estimatedTotal}
            </span>{" "}
            reviews estimated · {selectedSources.length} source
            {selectedSources.length === 1 ? "" : "s"} · max{" "}
            {config.limits.maxSources}
          </p>
        </div>

        <FetchRangeControl
          id="fetch-limit"
          label="Fetch Amount"
          icon="numbers"
          value={limitPerSource}
          min={config.limits.minPerSource}
          max={config.limits.maxPerSource}
          step={10}
          disabled={disabled || loading}
          onChange={setLimitPerSource}
          hint="Each selected source returns up to this many reviews before deduplication."
        />

        {(showCountry || showStoreFilters || showRedditQuery) && (
          <FetchFiltersSection title="Fetch Filters">
            {showCountry ? (
              <FetchSelect
                id="fetch-region"
                label="Region"
                icon="public"
                value={region}
                disabled={disabled || loading}
                onChange={setRegion}
                hint={
                  region === "global"
                    ? "Pulls store reviews across US, UK, Germany, India, Australia, and Canada."
                    : "Limits Play Store and App Store reviews to this region."
                }
                options={config.regions.map((item) => ({
                  value: item.id,
                  label: item.label,
                }))}
              />
            ) : null}

            {showPlayStoreSort ? (
              <FetchSelect
                id="playstore-sort"
                label="Play Store sort"
                icon="sort"
                value={playStoreSort}
                disabled={disabled || loading}
                onChange={(value) => setPlayStoreSort(value as PlayStoreSort)}
                options={config.playStoreSorts.map((item) => ({
                  value: item.id,
                  label: item.label,
                }))}
              />
            ) : null}

            {showAppStoreSort ? (
              <FetchSelect
                id="appstore-sort"
                label="App Store sort"
                icon="sort"
                value={appStoreSort}
                disabled={disabled || loading}
                onChange={(value) => setAppStoreSort(value as AppStoreSort)}
                options={config.appStoreSorts.map((item) => ({
                  value: item.id,
                  label: item.label,
                }))}
              />
            ) : null}

            {showMinRating ? (
              <div className="sm:col-span-2">
                <FetchRatingChips
                  label="Minimum star rating"
                  value={minRating}
                  disabled={disabled || loading}
                  onChange={setMinRating}
                  hint="Applies to Play Store and App Store reviews only."
                />
              </div>
            ) : null}

            {showRedditQuery ? (
              <div className="sm:col-span-2 space-y-4">
                <p className="text-xs text-on-surface-variant">
                  <span className="font-medium text-on-surface">Subreddits (automatic):</span>{" "}
                  {DEFAULT_REDDIT_SUBREDDIT_LABELS.join(", ")} — posts and comments
                  are fetched from these without typing{" "}
                  <span className="font-mono">r/spotify</span> in the field below.
                </p>
                <FetchTextInput
                  id="reddit-query"
                  label="Discovery topic keywords"
                  value={redditQuery}
                  disabled={disabled || loading}
                  onChange={setRedditQuery}
                  placeholder={DEFAULT_REDDIT_QUERY_INPUT}
                  hint='Topic words only (e.g. discover weekly, algorithm) — not r/spotify. Each term searches Reddit comments for "spotify <term>".'
                />
              </div>
            ) : null}
          </FetchFiltersSection>
        )}

        <button
          type="button"
          disabled={disabled || loading || selectedSources.length === 0}
          onClick={() => void handleFetch()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-on-primary shadow-sm transition-all hover:shadow-lg hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/30 border-t-on-primary" />
              Fetching live reviews…
            </>
          ) : (
            <>
              <span>Fetch {estimatedTotal} reviews</span>
              <Icon name="arrow_forward" />
            </>
          )}
        </button>

        {loading && (
          <p className="text-center text-xs text-on-surface-variant">
            {fetchProgress ??
              "Scraping public APIs — large counts (500+) can take several minutes"}
          </p>
        )}
      </div>
    </div>
  );
}
