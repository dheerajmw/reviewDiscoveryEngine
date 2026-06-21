import Papa from "papaparse";
import type { RawReview } from "./types";

export type ParseResult =
  | { success: true; reviews: RawReview[] }
  | { success: false; error: string };

const SOURCE_ALIASES: Record<string, string> = {
  reddit: "reddit",
  "play store": "playstore",
  playstore: "playstore",
  play_store: "playstore",
  "google play": "playstore",
  "google play store": "playstore",
  android: "playstore",
  "app store": "appstore",
  appstore: "appstore",
  app_store: "appstore",
  "apple app store": "appstore",
  ios: "appstore",
  spotify: "spotify",
};

const SOURCE_PATTERNS = [
  "source",
  "store",
  "platform",
  "origin",
  "channel",
  "site",
  "src",
];

const TEXT_PATTERNS = [
  "text",
  "review",
  "body",
  "content",
  "comment",
  "message",
];

const TITLE_PATTERNS = ["title", "reviewtitle", "heading"];

const DELIMITERS = [",", ";", "\t"] as const;

const SOURCE_VALUE_HINTS = [
  "reddit",
  "playstore",
  "play_store",
  "appstore",
  "app_store",
  "google play",
  "app store",
];

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, "");
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

const IMAGE_URL_HEADER_HINTS = [
  "image",
  "img",
  "avatar",
  "thumb",
  "photo",
  "icon",
  "picture",
  "profile",
  "url",
  "link",
];

function isLikelyImageOrUrlColumn(header: string, values: string[]): boolean {
  const key = normalizeHeader(header);
  if (IMAGE_URL_HEADER_HINTS.some((hint) => key.includes(hint))) {
    return true;
  }

  const nonEmpty = values.filter(Boolean);
  if (nonEmpty.length === 0) return false;

  const urlLike = nonEmpty.filter((value) => isHttpUrl(value)).length;
  return urlLike / nonEmpty.length >= 0.5;
}

function inferSourceFromUrl(url: string): string | null {
  const lower = url.toLowerCase();
  if (
    lower.includes("play-lh.googleusercontent.com") ||
    lower.includes("play.google.com")
  ) {
    return "playstore";
  }
  if (lower.includes("apps.apple.com") || lower.includes("itunes.apple.com")) {
    return "appstore";
  }
  if (lower.includes("reddit.com")) return "reddit";
  if (lower.includes("spotify.com")) return "spotify";
  return null;
}

function looksLikeSourceValue(value: string): boolean {
  const lower = value.toLowerCase().trim();
  if (!lower || isHttpUrl(lower)) return false;

  if (SOURCE_VALUE_HINTS.some((hint) => lower.includes(hint))) return true;

  return (
    lower === "reddit" ||
    lower === "spotify" ||
    lower === "playstore" ||
    lower === "appstore" ||
    lower.includes("play store") ||
    lower.includes("app store") ||
    lower.includes("google play")
  );
}

function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/^\ufeff/, "")
    .replace(/[^a-z0-9_]/g, "");
}

function getField(row: Record<string, string>, column: string): string {
  return (row[column] ?? "").trim();
}

export function normalizeSource(source: string): string {
  const trimmed = source.trim();
  if (!trimmed) return "unknown";

  if (isHttpUrl(trimmed)) {
    return inferSourceFromUrl(trimmed) ?? "unknown";
  }

  const key = trimmed.toLowerCase().replace(/\s+/g, " ");
  if (SOURCE_ALIASES[key]) return SOURCE_ALIASES[key];

  const compact = key.replace(/\s+/g, "");
  if (SOURCE_ALIASES[compact]) return SOURCE_ALIASES[compact];

  if (compact.length > 40 || compact.includes("/") || compact.includes(".")) {
    return "unknown";
  }

  return compact || "unknown";
}

function headerMatchesPattern(key: string, pattern: string): boolean {
  if (key === pattern) return true;

  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wordBoundary = new RegExp(`(^|_)${escaped}($|_)`);
  if (wordBoundary.test(key)) return true;

  if (pattern === "src" && /src$/.test(key) && key.length <= 12) return true;
  if (pattern === "store" && (key === "store" || key.endsWith("store"))) {
    return !key.includes("review") && !key.includes("id");
  }
  if (
    pattern === "review" &&
    key.includes("review") &&
    !key.includes("reviewid")
  ) {
    return true;
  }
  if (pattern === "text" && key.includes("text") && !key.endsWith("id")) {
    return true;
  }

  return false;
}

function isLikelySourceHeader(header: string): boolean {
  const key = normalizeHeader(header);
  return !IMAGE_URL_HEADER_HINTS.some((hint) => key.includes(hint));
}

function findColumnByPatterns(
  headers: string[],
  patterns: string[],
): string | undefined {
  const normalized = headers.map((h) => ({
    original: h,
    key: normalizeHeader(h),
  }));

  for (const pattern of patterns) {
    const exact = normalized.find(
      (h) => h.key === pattern && isLikelySourceHeader(h.original),
    );
    if (exact) return exact.original;
  }

  for (const pattern of patterns) {
    const fuzzy = normalized.find(
      (h) =>
        isLikelySourceHeader(h.original) &&
        headerMatchesPattern(h.key, pattern),
    );
    if (fuzzy) return fuzzy.original;
  }

  return undefined;
}

function inferSourceFromFilename(filename?: string): string | null {
  if (!filename) return null;

  const lower = filename.toLowerCase();
  if (
    lower.includes("play_store") ||
    lower.includes("playstore") ||
    lower.includes("google_play")
  ) {
    return "playstore";
  }
  if (
    lower.includes("app_store") ||
    lower.includes("appstore") ||
    lower.includes("apple")
  ) {
    return "appstore";
  }
  if (lower.includes("reddit")) return "reddit";
  return null;
}

function looksLikeIdColumn(values: string[]): boolean {
  if (values.length === 0) return true;

  const idLike = values.filter(
    (v) =>
      v.length < 60 &&
      !v.includes(" ") &&
      /^[\w-]+$/.test(v) &&
      !SOURCE_VALUE_HINTS.includes(v.toLowerCase()),
  ).length;

  return idLike / values.length > 0.8;
}

function findTextColumnHeuristic(
  rows: Record<string, string>[],
  headers: string[],
  exclude: string[],
): string | undefined {
  let best: { header: string; score: number } | undefined;

  for (const header of headers) {
    if (exclude.includes(header)) continue;

    const values = rows
      .map((row) => getField(row, header))
      .filter((value) => value.length > 0);
    if (values.length === 0 || looksLikeIdColumn(values)) continue;

    const avgLen =
      values.reduce((sum, value) => sum + value.length, 0) / values.length;
    const wordy =
      values.filter((value) => value.split(/\s+/).length >= 3).length /
      values.length;

    const score = avgLen + wordy * 20;
    if (!best || score > best.score) {
      best = { header, score };
    }
  }

  return best && best.score >= 12 ? best.header : undefined;
}

function findSourceColumnByValues(
  rows: Record<string, string>[],
  headers: string[],
): string | undefined {
  for (const header of headers) {
    const values = rows
      .slice(0, 25)
      .map((row) => getField(row, header))
      .filter(Boolean);
    if (values.length === 0) continue;
    if (isLikelyImageOrUrlColumn(header, values)) continue;

    const matches = values.filter((value) => looksLikeSourceValue(value));

    if (matches.length >= Math.max(2, values.length * 0.4)) {
      return header;
    }
  }

  return undefined;
}

function buildReviewText(
  row: Record<string, string>,
  textColumn: string,
  headers: string[],
): string {
  const text = getField(row, textColumn);
  const titleColumn = findColumnByPatterns(headers, TITLE_PATTERNS);
  const title =
    titleColumn && titleColumn !== textColumn
      ? getField(row, titleColumn)
      : "";

  if (text && title) return `${title}. ${text}`;
  return text || title;
}

function parseWithDelimiter(
  csvText: string,
  delimiter: string,
): Papa.ParseResult<Record<string, string>> {
  return Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    delimiter,
  });
}

function pickBestParse(cleaned: string): {
  result: Papa.ParseResult<Record<string, string>>;
  sourceColumn?: string;
  textColumn?: string;
} | null {
  let fallback: Papa.ParseResult<Record<string, string>> | null = null;

  for (const delimiter of DELIMITERS) {
    const attempt = parseWithDelimiter(cleaned, delimiter);
    const headers = attempt.meta.fields ?? [];
    if (headers.length === 0) continue;

    if (!fallback || headers.length > (fallback.meta.fields?.length ?? 0)) {
      fallback = attempt;
    }

    const sourceColumn = findColumnByPatterns(headers, SOURCE_PATTERNS);
    const textColumn = findColumnByPatterns(headers, TEXT_PATTERNS);

    if (sourceColumn && textColumn) {
      return { result: attempt, sourceColumn, textColumn };
    }
  }

  if (!fallback) return null;

  const headers = fallback.meta.fields ?? [];
  const rows = fallback.data;
  const sourceColumn =
    findColumnByPatterns(headers, SOURCE_PATTERNS) ??
    findSourceColumnByValues(rows, headers);
  const textColumn =
    findColumnByPatterns(headers, TEXT_PATTERNS) ??
    findTextColumnHeuristic(
      rows,
      headers,
      sourceColumn ? [sourceColumn] : [],
    );

  return { result: fallback, sourceColumn, textColumn };
}

export function parseReviewsCsv(
  csvText: string,
  filename?: string,
): ParseResult {
  const cleaned = stripBom(csvText).trim();
  if (!cleaned) {
    return { success: false, error: "CSV file is empty." };
  }

  const parsed = pickBestParse(cleaned);
  if (!parsed) {
    return { success: false, error: "Failed to parse CSV." };
  }

  const { result, sourceColumn, textColumn } = parsed;

  if (result.errors.length > 0) {
    const message = result.errors[0]?.message ?? "Failed to parse CSV.";
    return { success: false, error: message };
  }

  const headers = result.meta.fields ?? [];

  if (!textColumn) {
    const found = headers.length > 0 ? headers.join(", ") : "none";
    return {
      success: false,
      error: `Could not find review text column. Found: ${found}. Try exporting with columns like source + text, or store + body.`,
    };
  }

  const defaultSource = inferSourceFromFilename(filename) ?? "unknown";
  const reviews: RawReview[] = [];

  for (const row of result.data) {
    const text = buildReviewText(row, textColumn, headers);
    if (!text) continue;

    const rawSource = sourceColumn ? getField(row, sourceColumn) : "";
    let source = defaultSource;
    if (rawSource) {
      if (isHttpUrl(rawSource)) {
        source = inferSourceFromUrl(rawSource) ?? defaultSource;
      } else {
        const normalized = normalizeSource(rawSource);
        source = normalized === "unknown" ? defaultSource : normalized;
      }
    }
    reviews.push({
      source,
      text,
    });
  }

  if (reviews.length === 0) {
    return { success: false, error: "No valid review rows found in CSV." };
  }

  return { success: true, reviews };
}
