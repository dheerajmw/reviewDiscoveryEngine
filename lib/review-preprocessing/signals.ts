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
