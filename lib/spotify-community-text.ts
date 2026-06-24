/** Strip Spotify Community thread title + form metadata; keep the member's post body. */

const USER_VOICE_START =
  /\b(I['']ve|I have|I just|I'm|I am|We |The |Hello,? |When |Why |How |Recently|Every |Even |Someone |This |It |My Spotify|My account|My |Can't|Cannot|Does |Is there|There |Please |Hi |Hey |Feel |People |Anyone |One day|So )/i;

export function cleanSpotifyCommunityReviewText(text: string): string {
  let s = text.trim();
  if (!s) return s;

  s = s.replace(/^(?:Solved!!_\s*)+/i, "");
  s = s.replace(/^(?:_+\s*)?(?:Superuser Contribution_\s*)+/i, "");

  const mqMatches = [...s.matchAll(/My Question or Issue\s*/gi)];
  if (mqMatches.length > 0) {
    const last = mqMatches[mqMatches.length - 1]!;
    s = s.slice(last.index! + last[0].length).trim();
  } else {
    const orIssue = s.match(/(?:^|[.\s])or Issue\s*/i);
    if (orIssue?.index !== undefined) {
      s = s.slice(orIssue.index + orIssue[0].length).trim();
    }
  }

  if (
    /\bPlan(?:Premium|Duo|Free|premium)?\b/i.test(s) ||
    /\bCountry[A-Z]{2,3}\b/.test(s) ||
    /\bOperating System\b/i.test(s)
  ) {
    const voice = s.match(USER_VOICE_START);
    if (voice?.index !== undefined && voice.index > 0) {
      s = s.slice(voice.index).trim();
    }
  }

  s = s.replace(
    /\s+(?:Visitor|Roadie|Newbie|Casual Listener|Music Fan|Regular|Moderator|Spotify Staff|explicit content).*/is,
    "",
  );
  s = s.replace(/\s+\d{4}-\d{2}-\d{2}[\s\d:APM]*.*$/i, "");
  s = s.replace(/\s+\*{1,3}(?:\s*\*{1,3})*\s*$/g, "");
  s = s.replace(/\s+yesterday(?:\s+\w+)?\s*$/i, "");
  s = s.replace(
    /\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:\s+\w+)?\s*$/i,
    "",
  );

  s = s.replace(/\s+/g, " ").trim();
  return s.length >= 15 ? s : text.trim();
}

export function formatReviewQuoteText(source: string, text: string): string {
  if (source === "spotify-community") {
    return cleanSpotifyCommunityReviewText(text);
  }
  return text;
}
