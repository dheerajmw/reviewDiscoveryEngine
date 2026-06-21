import type {
  FetchConfigResponse,
  FetchReviewsRequest,
  FetchReviewsResult,
} from "@/lib/fetch/types";

export async function loadFetchConfig(): Promise<FetchConfigResponse> {
  const response = await fetch("/api/fetch-reviews");
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to load fetch options.");
  }
  return data as FetchConfigResponse;
}

export async function fetchLiveReviews(
  request: FetchReviewsRequest,
): Promise<FetchReviewsResult> {
  const response = await fetch("/api/fetch-reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Failed to fetch live reviews.");
  }
  return data as FetchReviewsResult;
}
