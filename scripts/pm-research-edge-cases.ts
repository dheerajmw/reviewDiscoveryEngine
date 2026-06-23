/**
 * Manually curated edge cases for PM research quality evaluation.
 * Each case has ground-truth discovery relevance for filter precision scoring.
 */
export type EdgeCaseCategory =
  | "positive_discovery"
  | "playlist_complaint"
  | "premium_complaint"
  | "ads_complaint"
  | "recommendation_complaint"
  | "genre_lock_in"
  | "repetition_complaint";

export interface PmResearchEdgeCase {
  id: string;
  category: EdgeCaseCategory;
  source: string;
  text: string;
  expected_discovery_relevant: boolean;
  /** Optional expected theme when discovery-relevant and classifiable */
  expected_theme?: string;
}

export const PM_RESEARCH_EDGE_CASES: PmResearchEdgeCase[] = [
  // ── Positive discovery (8) ──
  {
    id: "edge-pos-1",
    category: "positive_discovery",
    source: "appstore",
    text: "Discover Weekly has introduced me to dozens of artists I now listen to every day. It's one of Spotify's best features.",
    expected_discovery_relevant: true,
    expected_theme: "Positive Discovery Experience",
  },
  {
    id: "edge-pos-2",
    category: "positive_discovery",
    source: "reddit",
    text: "The DJ is amazing — it mixes my favorites with new tracks and I've found so many artists I never would have searched for.",
    expected_discovery_relevant: true,
    expected_theme: "Positive Discovery Experience",
  },
  {
    id: "edge-pos-3",
    category: "positive_discovery",
    source: "playstore",
    text: "Spotify's recommendations are spot on. I discover new music every week without trying.",
    expected_discovery_relevant: true,
    expected_theme: "Positive Discovery Experience",
  },
  {
    id: "edge-pos-4",
    category: "positive_discovery",
    source: "social-media",
    text: "Release Radar consistently surfaces artists I didn't know but now love. Best discovery tool on any platform.",
    expected_discovery_relevant: true,
    expected_theme: "Positive Discovery Experience",
  },
  {
    id: "edge-pos-5",
    category: "positive_discovery",
    source: "appstore",
    text: "I love how Daily Mix introduces me to similar artists outside my usual genres. Found my new favorite band this way.",
    expected_discovery_relevant: true,
    expected_theme: "Positive Discovery Experience",
  },
  {
    id: "edge-pos-6",
    category: "positive_discovery",
    source: "spotify-community",
    text: "Discover Weekly nailed my taste this week — every track was a genuine find, not repeats from my library.",
    expected_discovery_relevant: true,
    expected_theme: "Positive Discovery Experience",
  },
  {
    id: "edge-pos-7",
    category: "positive_discovery",
    source: "reddit",
    text: "Spotify helped me find hidden gems in indie rock I never would have discovered on my own. Algorithm works great for me.",
    expected_discovery_relevant: true,
    expected_theme: "Positive Discovery Experience",
  },
  {
    id: "edge-pos-8",
    category: "positive_discovery",
    source: "playstore",
    text: "The algorithm recommended a playlist that led me to 20 new artists this month. Really happy with discovery here.",
    expected_discovery_relevant: true,
    expected_theme: "Positive Discovery Experience",
  },

  // ── Playlist complaints — contamination / control, NOT promos (7) ──
  {
    id: "edge-playlist-1",
    category: "playlist_complaint",
    source: "playstore",
    text: "Smart Shuffle keeps adding random songs I never asked for into my carefully curated workout playlist.",
    expected_discovery_relevant: true,
    expected_theme: "Poor Recommendation Quality",
  },
  {
    id: "edge-playlist-2",
    category: "playlist_complaint",
    source: "reddit",
    text: "Why does Spotify keep inserting suggested tracks into playlists I built myself? I want only the songs I added.",
    expected_discovery_relevant: true,
    expected_theme: "Lack of Discovery Control",
  },
  {
    id: "edge-playlist-3",
    category: "playlist_complaint",
    source: "appstore",
    text: "My playlist keeps getting contaminated with unrelated recommendations when I use shuffle.",
    expected_discovery_relevant: true,
  },
  {
    id: "edge-playlist-4",
    category: "playlist_complaint",
    source: "reddit",
    text: "Drop your playlist and I'll share mine! Follow me for more — link in bio.",
    expected_discovery_relevant: false,
  },
  {
    id: "edge-playlist-5",
    category: "playlist_complaint",
    source: "reddit",
    text: "Check out my new playlist on Spotify, follow for follow!",
    expected_discovery_relevant: false,
  },
  {
    id: "edge-playlist-6",
    category: "playlist_complaint",
    source: "spotify-community",
    text: "Autoplay on my playlist adds songs I don't want. I can't turn off recommendations inside my own playlist.",
    expected_discovery_relevant: true,
    expected_theme: "Lack of Discovery Control",
  },
  {
    id: "edge-playlist-7",
    category: "playlist_complaint",
    source: "playstore",
    text: "Spotify ruined my playlist by mixing in algorithm picks I never approved. Stop changing my lists.",
    expected_discovery_relevant: true,
    expected_theme: "Lack of Discovery Control",
  },

  // ── Premium complaints (7) ──
  {
    id: "edge-premium-1",
    category: "premium_complaint",
    source: "playstore",
    text: "Spotify is unusable without Premium. Too expensive and I can't choose songs freely.",
    expected_discovery_relevant: false,
  },
  {
    id: "edge-premium-2",
    category: "premium_complaint",
    source: "appstore",
    text: "Subscription price keeps going up. Not worth it anymore compared to Apple Music.",
    expected_discovery_relevant: false,
  },
  {
    id: "edge-premium-3",
    category: "premium_complaint",
    source: "playstore",
    text: "Can't skip songs without premium. Hate that I need to pay just to pick what plays next.",
    expected_discovery_relevant: false,
  },
  {
    id: "edge-premium-4",
    category: "premium_complaint",
    source: "reddit",
    text: "Premium is too expensive but at least Discover Weekly still helps me find new artists worth the cost.",
    expected_discovery_relevant: true,
  },
  {
    id: "edge-premium-5",
    category: "premium_complaint",
    source: "appstore",
    text: "Billing charged me twice this month. Fix your payment system.",
    expected_discovery_relevant: false,
  },
  {
    id: "edge-premium-6",
    category: "premium_complaint",
    source: "playstore",
    text: "Free tier won't let me play specific songs — only shuffle. Premium upsell is annoying.",
    expected_discovery_relevant: false,
  },
  {
    id: "edge-premium-7",
    category: "premium_complaint",
    source: "appstore",
    text: "Student discount verification failed. Can't access premium features I paid for.",
    expected_discovery_relevant: false,
  },

  // ── Ads complaints (7) ──
  {
    id: "edge-ads-1",
    category: "ads_complaint",
    source: "playstore",
    text: "Too many ads between every song. I get three ads before each track on the free plan.",
    expected_discovery_relevant: false,
  },
  {
    id: "edge-ads-2",
    category: "ads_complaint",
    source: "appstore",
    text: "Ads are unbearable — longer than the songs sometimes. Ruins the listening experience.",
    expected_discovery_relevant: false,
  },
  {
    id: "edge-ads-3",
    category: "ads_complaint",
    source: "playstore",
    text: "Constant ad interruptions. Can't enjoy music without premium.",
    expected_discovery_relevant: false,
  },
  {
    id: "edge-ads-4",
    category: "ads_complaint",
    source: "reddit",
    text: "Ads every two songs but the recommendations after ads are still repetitive garbage.",
    expected_discovery_relevant: true,
    expected_theme: "Repetition Fatigue",
  },
  {
    id: "edge-ads-5",
    category: "ads_complaint",
    source: "playstore",
    text: "Stop showing me podcast ads when I only want music recommendations.",
    expected_discovery_relevant: true,
  },
  {
    id: "edge-ads-6",
    category: "ads_complaint",
    source: "appstore",
    text: "Advertisement frequency is insane on free tier.",
    expected_discovery_relevant: false,
  },
  {
    id: "edge-ads-7",
    category: "ads_complaint",
    source: "playstore",
    text: "I hate ads but the app itself plays music fine when they finally stop.",
    expected_discovery_relevant: false,
  },

  // ── Recommendation complaints (7) ──
  {
    id: "edge-rec-1",
    category: "recommendation_complaint",
    source: "social-media",
    text: "Spotify recommendations have gotten worse — song radio drifts into completely unrelated tracks.",
    expected_discovery_relevant: true,
    expected_theme: "Poor Recommendation Quality",
  },
  {
    id: "edge-rec-2",
    category: "recommendation_complaint",
    source: "reddit",
    text: "For You feed keeps suggesting music I already thumbs-downed. Algorithm ignores my feedback.",
    expected_discovery_relevant: true,
    expected_theme: "Poor Recommendation Quality",
  },
  {
    id: "edge-rec-3",
    category: "recommendation_complaint",
    source: "appstore",
    text: "Recommended songs don't match my taste at all. Feels random.",
    expected_discovery_relevant: true,
    expected_theme: "Poor Recommendation Quality",
  },
  {
    id: "edge-rec-4",
    category: "recommendation_complaint",
    source: "spotify-community",
    text: "Home recommendations surface podcasts when I only listen to metal. Wrong context entirely.",
    expected_discovery_relevant: true,
    expected_theme: "Poor Recommendation Quality",
  },
  {
    id: "edge-rec-5",
    category: "recommendation_complaint",
    source: "social-media",
    text: "Discover Weekly used to be great in 2018 but recommendations feel generic now.",
    expected_discovery_relevant: true,
    expected_theme: "Weak Discovery Surfaces",
  },
  {
    id: "edge-rec-6",
    category: "recommendation_complaint",
    source: "reddit",
    text: "Why does Spotify push the same mainstream hits in every recommendation playlist?",
    expected_discovery_relevant: true,
    expected_theme: "Poor Recommendation Quality",
  },
  {
    id: "edge-rec-7",
    category: "recommendation_complaint",
    source: "playstore",
    text: "Smart recommendations insert irrelevant tracks. Quality dropped after the last update.",
    expected_discovery_relevant: true,
    expected_theme: "Poor Recommendation Quality",
  },

  // ── Genre lock-in (7) ──
  {
    id: "edge-genre-1",
    category: "genre_lock_in",
    source: "reddit",
    text: "Spotify only recommends mainstream pop. No matter what I do it never helps me discover music outside that genre.",
    expected_discovery_relevant: true,
    expected_theme: "Genre Lock-In",
  },
  {
    id: "edge-genre-2",
    category: "genre_lock_in",
    source: "social-media",
    text: "Stuck in a genre bubble — every Discover Weekly is indie folk even though I listen to hip hop too.",
    expected_discovery_relevant: true,
    expected_theme: "Genre Lock-In",
  },
  {
    id: "edge-genre-3",
    category: "genre_lock_in",
    source: "appstore",
    text: "Algorithm won't let me break out of EDM. I want cross-genre exploration but never get it.",
    expected_discovery_relevant: true,
    expected_theme: "Genre Lock-In",
  },
  {
    id: "edge-genre-4",
    category: "genre_lock_in",
    source: "reddit",
    text: "All my suggested artists sound the same genre. No diversity in recommendations.",
    expected_discovery_relevant: true,
    expected_theme: "Genre Lock-In",
  },
  {
    id: "edge-genre-5",
    category: "genre_lock_in",
    source: "playstore",
    text: "Genre filter on recommendations doesn't work — still get the same pop playlists.",
    expected_discovery_relevant: true,
    expected_theme: "Genre Lock-In",
  },
  {
    id: "edge-genre-6",
    category: "genre_lock_in",
    source: "social-media",
    text: "I listen to jazz and classical but For You only shows rap. Can't explore outside that box.",
    expected_discovery_relevant: true,
    expected_theme: "Genre Lock-In",
  },
  {
    id: "edge-genre-7",
    category: "genre_lock_in",
    source: "appstore",
    text: "Recommendations trapped in one genre despite years of varied listening history.",
    expected_discovery_relevant: true,
    expected_theme: "Genre Lock-In",
  },

  // ── Repetition complaints (7) ──
  {
    id: "edge-rep-1",
    category: "repetition_complaint",
    source: "appstore",
    text: "Spotify keeps recommending the same artists and songs I've already listened to hundreds of times.",
    expected_discovery_relevant: true,
    expected_theme: "Repetition Fatigue",
  },
  {
    id: "edge-rep-2",
    category: "repetition_complaint",
    source: "reddit",
    text: "Discover Weekly feels repetitive and rarely introduces genuinely new music.",
    expected_discovery_relevant: true,
    expected_theme: "Repetition Fatigue",
  },
  {
    id: "edge-rep-3",
    category: "repetition_complaint",
    source: "playstore",
    text: "Shuffle plays the same 20 songs from my 500-song playlist every single day.",
    expected_discovery_relevant: true,
    expected_theme: "Repetition Fatigue",
  },
  {
    id: "edge-rep-4",
    category: "repetition_complaint",
    source: "social-media",
    text: "Same songs on repeat — algorithm regurgitates my listening history instead of finding new artists.",
    expected_discovery_relevant: true,
    expected_theme: "Repetition Fatigue",
  },
  {
    id: "edge-rep-5",
    category: "repetition_complaint",
    source: "appstore",
    text: "Radio mode loops the same tracks. Nothing new in weeks.",
    expected_discovery_relevant: true,
    expected_theme: "Repetition Fatigue",
  },
  {
    id: "edge-rep-6",
    category: "repetition_complaint",
    source: "reddit",
    text: "I hear the same artists every Discover Weekly. Zero novelty.",
    expected_discovery_relevant: true,
    expected_theme: "Repetition Fatigue",
  },
  {
    id: "edge-rep-7",
    category: "repetition_complaint",
    source: "playstore",
    text: "Recommendations are the same 50 songs rotated. Repetition fatigue is real.",
    expected_discovery_relevant: true,
    expected_theme: "Repetition Fatigue",
  },
];
