export const EXPLICIT_DISCOVERY_PATTERNS: RegExp[] = [
  /\brecommend(ation|ations|ed|s)?\b/,
  /\bsuggest(ion|ions|ed|s)?\b/,
  /\bdiscover(y| weekly|ies|ed|ing)?\b/,
  /\brelease radar\b/,
  /\bdaily mix\b/,
  /\bfor you\b/,
  /\balgorithm(ic)?\b/,
  /\bpersonaliz(ed|ation|e)?\b/,
  /\bplaylist(s)?\b/,
  /\bradio\b/,
  /\bspotify dj\b/,
  /\bdj\b/,
  /\bsmart shuffle\b/,
  /\bshuffle\b/,
  /\bnew (artist|music|song)s?\b/,
  /\bfind(ing)? (new )?(artist|music|song)s?\b/,
  /\bgenre(s)? (explor|discover)/,
  /\bexplor(e|ing|ation) (new )?(music|artist|genre)/,
  /\bnovelty\b/,
  /\bmusic suggestions?\b/,
  /\bhidden gems?\b/,
  /\btrending music\b/,
  /\bwrapped\b/,
  /\brecommendation (quality|relevance|diversity|accuracy|trust)\b/,
  /\brecommendation (loop|irrelevance|distrust)\b/,
  /\bplaylist contamination\b/,
  /\bdiscovery fatigue\b/,
  /\bbroaden (my )?taste\b/,
  /\bdiscover (genres?|songs?)\b/,
  /\bmade for you\b/,
  /\bautoplay\b/,
  /\bfeed\b/,
];

/** Implicit discovery — repetition, sameness, stale feeds without saying "recommendation". */
export const IMPLICIT_DISCOVERY_PATTERNS: RegExp[] = [
  /\bsame (song|songs|artist|artists|music|playlist|playlists|stuff|things)\b/,
  /\bkeeps? playing the same\b/,
  /\bon repeat\b/,
  /\bover and over\b/,
  /\bnothing new\b/,
  /\bno(new| new) music\b/,
  /\bstale playlist\b/,
  /\bidentical shuffle\b/,
  /\bshuffle (always|keeps?) (sound|play)s? (the )?same\b/,
  /\bsounds? the same every\b/,
  /\bregurgitat(ed|es|ing)\b/,
  /\brecycled (music|songs|artist)/,
  /\bfilter bubble\b/,
  /\bgenre bubble\b/,
  /\bstuck in (one|a) genre\b/,
  /\bonly (hear|get|see|play) (the )?same\b/,
  /\brepetitive (songs|music|artist|playlist|recommend)/,
  /\bnever (find|discover|hear) (anything )?new\b/,
  /\bplaylist(s)? (never|don't|doesn't) (change|update)\b/,
  /\bfeels? like the same\b/,
  /\bmore of the same\b/,
  /\bnot diverse\b/,
  /\blacks? variety\b/,
  /\bno variety\b/,
];

export const TECHNICAL_PATTERNS: RegExp[] = [
  /\b(crash(es|ed|ing)?|crashed)\b/,
  /\b(won't|wont|can't|cant) open\b/,
  /\bapp (freeze|frozen|freezes|freezing)\b/,
  /\b(keeps? stopping|force close|force closed)\b/,
  /\b(bug|bugs|glitch|glitches|buggy)\b/,
  /\b(buffer(ing|s)?|lag(ging|gy)?)\b/,
  /\b(login|log in|sign in|sign-in)\b/,
  /\b(password|account locked|can't sign|cant sign)\b/,
  /\b(offline (mode )?(bug|broken|doesn't work|not working))\b/,
  /\b(won't play|wont play|doesn't play|doesnt play)\b/,
  /\bplayback (issue|problem|bug|broken)\b/,
  /\b(audio (cut|skip|drop)|skipping audio)\b/,
  /\b(ui (bug|broken|glitch))\b/,
];

export const BILLING_PATTERNS: RegExp[] = [
  /\b(billing|billed|charged twice|double charged)\b/,
  /\b(subscription|subscribe|unsubscribe)\b/,
  /\b(premium (cost|price|fee|plan|too expensive))\b/,
  /\b(payment (failed|problem|issue)|refund)\b/,
  /\b(too expensive|pay(ing)? too much)\b/,
  /\b(free trial|cancel premium)\b/,
  /\b(student discount)\b.*\b(verify|verification|problem)\b/,
];

export const ADS_PATTERNS: RegExp[] = [
  /\b(too many ads|so many ads|ads every)\b/,
  /\b(ad frequency|constant ads|nonstop ads)\b/,
  /\b(ad(s)? (interrupt|between|before) (every )?(song|track))\b/,
  /\b(ad break|minutes of ads|long ads)\b/,
  /\b(advertisement|advertisements|annoying ads)\b/,
  /\b(listen(ing)? to ads)\b/,
];

export const PRAISE_PATTERNS: RegExp[] = [
  /\b(amazing app|best music app|love spotify|great app)\b/,
  /\b(awesome|perfect|excellent|fantastic) (app|service|music)\b/,
  /\b(life changing|would recommend spotify)\b/,
  /\b(five stars|5 stars|10\/10)\b/,
  /\b(only music (app|streaming)|best streaming)\b/,
];

export const DISCOVERY_SUCCESS_PATTERNS: RegExp[] = [
  /\b(found (amazing|great|new|so many) (artist|artists|music|songs))\b/,
  /\b(discover(ed|ing) (great|amazing|new|awesome) (artist|music))\b/,
  /\b(love (discover weekly|release radar|daily mix|recommendations))\b/,
  /\b(great (recommendations|discover weekly|algorithm|suggestions))\b/,
  /\b(helps? me find new (music|artist|songs))\b/,
  /\b(excellent (discovery|recommendations|personalization))\b/,
  /\b(hidden gems? (found|discovered))\b/,
];

export const DISCOVERY_FAILURE_PATTERNS: RegExp[] = [
  /\b(discover weekly (keeps?|always) (repeat|same|playing same))\b/,
  /\b(recommend(ation)?s? (are )?(bad|terrible|awful|useless|repetitive|same))\b/,
  /\b(same (song|artist|music) (every day|all the time|over and over))\b/,
  /\b(nothing new (in )?(my )?(playlist|feed|recommendations))\b/,
  /\b(never (find|discover|get) (new|anything new))\b/,
  /\b(algorithm (is )?(broken|bad|terrible|useless|awful))\b/,
  /\b(no (variety|diversity|novelty))\b/,
  /\b(stuck (listening|hearing) (to )?the same)\b/,
  /\b(poor (recommendations|suggestions|personalization))\b/,
  /\b(repetitive (recommendations|playlists|songs|artists))\b/,
];

/** PM discovery substance — experience (recommendations, algorithms, discovery surfaces). */
export const DISCOVERY_EXPERIENCE_PATTERNS: RegExp[] = [
  /\b(find(ing)? (new )?(music|artist|artists|songs|genres?))\b/,
  /\b(discover(ing)? (new )?(music|artist|artists|songs|genres?))\b/,
  /\b(recommendation (quality|accuracy|diversity))\b/,
  /\b(recommend(ation)?s? (work|are) (well|great|spot on|amazing|excellent))\b/,
  /\b(algorithm(ic)? (behavior|recommend|playlist|radio))\b/,
  /\b(personaliz(ed|ation) recommend)\b/,
  /\b(discover weekly|release radar|daily mix|made for you)\b/,
  /\b(spotify dj\b|\bdj mix\b|\bdj feature\b)/,
  /\b(smart shuffle|song radio|artist radio|mix(es)?\b)/,
  /\b(playlist recommend|recommended (songs|artists|playlist))\b/,
  /\b(introduced me to|found (great|new|amazing) artists?)\b/,
  /\b(recommendation diversity|diverse recommend)\b/,
];

/** PM discovery substance — friction (repetition, loops, irrelevance, distrust). */
export const DISCOVERY_FRICTION_PATTERNS: RegExp[] = [
  /\b(same (songs?|artists?|music) (repeatedly|again|over and over))\b/,
  /\b(repetitive recommend)/,
  /\b(lack of novelty|low novelty|no novelty)\b/,
  /\b(genre bubble|genre lock|stuck in (a )?genre|only (pop|mainstream))\b/,
  /\b(recommendation loop|echo chamber|filter bubble)\b/,
  /\b(playlist contamination|random (songs?|tracks?) (in|into) (my )?playlist)\b/,
  /\b(unrelated (songs?|tracks?)|irrelevant recommend)\b/,
  /\b(don'?t trust (the )?(algorithm|recommend)|algorithm distrust)\b/,
  ...IMPLICIT_DISCOVERY_PATTERNS,
  ...DISCOVERY_FAILURE_PATTERNS,
];

/** PM discovery substance — explicit user intent to explore/discover. */
export const DISCOVERY_INTENT_PATTERNS: RegExp[] = [
  /\b(want to|trying to|try to|need to|looking to) (explore|discover|find (new|something new))\b/,
  /\b(broaden (my )?taste|expand (my )?taste|outside (my )?comfort zone)\b/,
  /\b(explore (new )?(music|genres?|artists?))\b/,
  /\b(find (hidden gems?|new artists?|new music))\b/,
  /\b(discover something new)\b/,
];

/** Hard excludes — never discovery-relevant unless paired with discovery substance. */
export const PLAYLIST_PROMO_PATTERNS: RegExp[] = [
  /\b(drop (your|a) playlist|share (your|a|one of) (mine|playlist))\b/i,
  /\b(follow (me|my account)|check me out|open\.spotify\.com\/playlist)\b/i,
  /\b(i('ll| will) (share|follow) (back|you))\b/i,
  /\b(promo(te)? (my|your) (playlist|music|song))\b/i,
  /\b(listen to my (playlist|music))\b/i,
];

export const SOCIAL_SPAM_PATTERNS: RegExp[] = [
  /\b(subscribe to my|link in bio|follow for follow)\b/i,
  /\b(check out my (channel|page|profile))\b/i,
];

export const NOISE_WITHOUT_DISCOVERY_PATTERNS: RegExp[] = [
  ...BILLING_PATTERNS,
  ...ADS_PATTERNS,
  ...TECHNICAL_PATTERNS,
];

export function countPmDiscoverySubstance(text: string): {
  experience: number;
  friction: number;
  intent: number;
  total: number;
} {
  const experience = countPatternHits(text, DISCOVERY_EXPERIENCE_PATTERNS);
  const friction = countPatternHits(text, DISCOVERY_FRICTION_PATTERNS);
  const intent = countPatternHits(text, DISCOVERY_INTENT_PATTERNS);
  return { experience, friction, intent, total: experience + friction + intent };
}

export function hasHardDiscoveryExclusion(text: string): {
  excluded: boolean;
  reason?: string;
} {
  const lower = text.toLowerCase();
  if (PLAYLIST_PROMO_PATTERNS.some((p) => p.test(lower))) {
    return { excluded: true, reason: "playlist promotion or sharing thread" };
  }
  if (SOCIAL_SPAM_PATTERNS.some((p) => p.test(lower))) {
    return { excluded: true, reason: "social spam or self-promotion" };
  }
  return { excluded: false };
}

export function hasPmDiscoverySubstance(text: string): boolean {
  return countPmDiscoverySubstance(text).total > 0;
}

import type { UserGoal } from "./types";

export const USER_GOAL_RULES: {
  goal: NonNullable<UserGoal>;
  patterns: RegExp[];
}[] = [
  {
    goal: "find new artists",
    patterns: [
      /\b(find(ing)? new artists?)\b/,
      /\b(discover (new )?artists?)\b/,
      /\b(new artist discovery)\b/,
      /\bfound (?:\w+\s+){0,3}new artists?\b/,
      /\bfound amazing (?:new )?artists?\b/,
    ],
  },
  {
    goal: "explore genres",
    patterns: [
      /\b(explor(e|ing) (new )?genres?)\b/,
      /\b(genre exploration)\b/,
      /\b(break out of (my )?genre)\b/,
      /\b(different genres?)\b/,
    ],
  },
  {
    goal: "refresh playlists",
    patterns: [
      /\b(refresh (my )?playlists?)\b/,
      /\b(update (my )?playlists?)\b/,
      /\b(new songs? in (my )?playlist)\b/,
      /\b(stale playlist)\b/,
    ],
  },
  {
    goal: "discover music for mood",
    patterns: [
      /\b(music for (my )?mood)\b/,
      /\b(mood (playlist|music|based))\b/,
      /\b(feel(ing)? (happy|sad|calm|energetic|focused))\b.*\bmusic\b/,
    ],
  },
  {
    goal: "get personalized recommendations",
    patterns: [
      /\b(personalized recommendations?)\b/,
      /\b(for you (page|feed|playlist))\b/,
      /\b(tailored (suggestions|recommendations))\b/,
      /\b(recommendations? for me)\b/,
    ],
  },
  {
    goal: "find hidden gems",
    patterns: [/\bhidden gems?\b/, /\b(underground|obscure|unknown) artist/],
  },
  {
    goal: "discover trending music",
    patterns: [
      /\b(trending music)\b/,
      /\b(what(?:'s| is) (hot|trending|popular) (right )?now)\b/,
      /\b(new releases?)\b/,
    ],
  },
];

export function countPatternHits(text: string, patterns: RegExp[]): number {
  return patterns.filter((pattern) => pattern.test(text)).length;
}

export function countDiscoverySignals(text: string): {
  explicit: number;
  implicit: number;
  total: number;
} {
  const explicit = countPatternHits(text, EXPLICIT_DISCOVERY_PATTERNS);
  const implicit = countPatternHits(text, IMPLICIT_DISCOVERY_PATTERNS);
  return { explicit, implicit, total: explicit + implicit };
}
