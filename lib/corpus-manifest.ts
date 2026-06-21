export interface CorpusFile {
  id: string;
  label: string;
  description: string;
  reviewCount: number;
}

export const CORPUS_FILES: CorpusFile[] = [
  {
    id: "all-reviews.csv",
    label: "Full corpus",
    description: "All sources combined",
    reviewCount: 1996,
  },
  {
    id: "sample100.csv",
    label: "Sample 100",
    description: "100-review evaluation subset",
    reviewCount: 99,
  },
  {
    id: "playstore.csv",
    label: "Play Store",
    description: "Google Play reviews",
    reviewCount: 600,
  },
  {
    id: "appstore.csv",
    label: "App Store",
    description: "Apple App Store reviews",
    reviewCount: 441,
  },
  {
    id: "reddit.csv",
    label: "Reddit",
    description: "Reddit posts & comments",
    reviewCount: 499,
  },
  {
    id: "spotify-community.csv",
    label: "Spotify Community",
    description: "Community forum threads",
    reviewCount: 265,
  },
  {
    id: "social-media.csv",
    label: "Social media",
    description: "Bluesky, Mastodon, HN",
    reviewCount: 191,
  },
];

export const DEFAULT_CORPUS_ID = "all-reviews.csv";

export function getCorpusFile(id: string): CorpusFile | undefined {
  return CORPUS_FILES.find((file) => file.id === id);
}
