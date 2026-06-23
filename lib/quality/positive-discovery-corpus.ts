/**
 * Curated positive-discovery reviews for classification validation.
 * Target: ≥80% assigned a positive discovery theme (not fallback buckets).
 */
export interface PositiveDiscoveryFixture {
  id: string;
  source: string;
  text: string;
}

export const POSITIVE_DISCOVERY_CORPUS: PositiveDiscoveryFixture[] = [
  {
    id: "pos-1",
    source: "appstore",
    text: "Discover Weekly introduced me to amazing artists I now listen to every day.",
  },
  {
    id: "pos-2",
    source: "reddit",
    text: "Spotify DJ helped me discover music I would never have found on my own.",
  },
  {
    id: "pos-3",
    source: "playstore",
    text: "Recommendations are usually spot on — I find great new tracks every week.",
  },
  {
    id: "pos-4",
    source: "social-media",
    text: "Spotify consistently helps me find new artists outside my usual genres.",
  },
  {
    id: "pos-5",
    source: "appstore",
    text: "Discover Weekly has introduced me to dozens of artists I now love.",
  },
  {
    id: "pos-6",
    source: "reddit",
    text: "The DJ is amazing — mixes favorites with new tracks and I've found so many artists.",
  },
  {
    id: "pos-7",
    source: "playstore",
    text: "Spotify's recommendations are spot on. I discover new music without trying.",
  },
  {
    id: "pos-8",
    source: "spotify-community",
    text: "Release Radar consistently surfaces artists I didn't know but now love.",
  },
  {
    id: "pos-9",
    source: "appstore",
    text: "Daily Mix introduced me to similar artists outside my usual taste — found my new favorite band.",
  },
  {
    id: "pos-10",
    source: "reddit",
    text: "Discover Weekly nailed my taste — every track was a genuine find, not library repeats.",
  },
  {
    id: "pos-11",
    source: "playstore",
    text: "Spotify helped me find hidden gems in indie rock I never would have searched for.",
  },
  {
    id: "pos-12",
    source: "social-media",
    text: "Love how Discover Weekly keeps surprising me with artists I've never heard before.",
  },
  {
    id: "pos-13",
    source: "appstore",
    text: "The algorithm actually works — I've discovered more new music on Spotify than anywhere else.",
  },
  {
    id: "pos-14",
    source: "reddit",
    text: "My Discover Weekly is fire every week. Best way to find new music hands down.",
  },
  {
    id: "pos-15",
    source: "playstore",
    text: "Spotify DJ is incredible for discovery — always surfaces something fresh alongside favorites.",
  },
  {
    id: "pos-16",
    source: "appstore",
    text: "Recommendation playlists are excellent. I constantly find artists I add to my library.",
  },
  {
    id: "pos-17",
    source: "reddit",
    text: "Found so many new artists through Release Radar — it's my go-to discovery surface.",
  },
  {
    id: "pos-18",
    source: "spotify-community",
    text: "Discover Weekly introduced me to a whole new genre I now listen to daily.",
  },
  {
    id: "pos-19",
    source: "social-media",
    text: "Spotify recommendations understand my taste — always introducing me to great new music.",
  },
  {
    id: "pos-20",
    source: "playstore",
    text: "The discovery features are why I stay on Spotify. Found amazing artists every week.",
  },
  {
    id: "pos-21",
    source: "reddit",
    text: "Artist radio and Discover Weekly keep me finding new music I'd never search for myself.",
  },
  {
    id: "pos-22",
    source: "appstore",
    text: "Love Spotify for discovery — introduced me to artists now in my top played all year.",
  },
];

export const POSITIVE_DISCOVERY_DETECTION_TARGET_PCT = 80;
