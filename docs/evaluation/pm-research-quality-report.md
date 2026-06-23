# PM Research Quality Report

**Generated:** 2026-06-22T13:43:28.725Z
**Classifier:** mock (mock-classifier)
**PM Readiness Score:** 3.5/10

> Not ready for PM discovery research — high false-positive rate and fallback dominance.

## 1. Discovery Filter Precision

### Curation gate (preprocess)
| Metric | Value |
|--------|-------|
| Correctly included | 87.6% |
| Correctly excluded | 100% |
| False positive rate | 0% |
| False negative rate | 12.4% |
| Precision | 100% |
| Recall | 87.6% |

### LLM gate (research_relevant)
| Metric | Value |
|--------|-------|
| Correctly included | 96.4% |
| Correctly excluded | 77.8% |
| False positive rate | 22.2% |
| False negative rate | 3.6% |

### Edge case breakdown (LLM correct / total)
- **positive discovery:** 8/8
- **playlist complaint:** 7/7
- **premium complaint:** 5/7
- **ads complaint:** 7/7
- **recommendation complaint:** 5/7
- **genre lock in:** 7/7
- **repetition complaint:** 6/7

## 2. Taxonomy Distribution

### theme
- Other Discovery Frustration: 113 (77.4%)
- Repetition Fatigue: 25 (17.1%)
- Positive Discovery Experience: 4 (2.7%)
- Genre Lock-In: 4 (2.7%)

### barrier
- Unclear Discovery Struggle: 139 (95.2%)
- Similar Artist Loop: 3 (2.1%)
- Genre Saturation: 2 (1.4%)
- Cold Start Discovery: 1 (0.7%)
- Low Novelty: 1 (0.7%)

### root_cause
- Unclear Repetition Cause: 141 (96.6%)
- Similarity-Based Reinforcement: 5 (3.4%)

### unmet_need
- General Discovery Improvement: 142 (97.3%)
- Cross-Genre Exploration: 2 (1.4%)
- Better Artist Discovery: 1 (0.7%)
- Genre Exploration: 1 (0.7%)

## 3. Fallback Analysis
- Other Discovery Frustration: **77.4%**
- General Discovery Improvement: **97.3%**
- Unclear Discovery Struggle: **95.2%**
- Unclear Repetition Cause: **96.6%**
- Any fallback label: **100%**

## 4. Positive Discovery Coverage
- Positive Discovery Experience theme: 4 (2.7%)
- Discover Weekly praise: 4
- DJ praise: 1
- Successful artist discovery: 3
- Recommendation satisfaction: 2

## 5. Research Question Coverage
### Why do users struggle to discover new music?
*52 reviews support this question*
- **Why users struggle to discover new music** (n=146, conf=0.45)
  Across 146 discovery-related reviews (54 non-discovery excluded): Dominant themes: Other Discovery Frustration (77%), Repetition Fatigue (17%), Positive Discovery Experience (3%). Primary barriers: Unclear Discovery Struggle (95%), Similar Artist Loop (2%), Genre Saturation (1%). Leading root cause: Unclear Repetition Cause (97%).
  > "Not sure what you mean here. a) Discover Weekly according to Spotify is identical to New Music. Every week you get a new playlist that has new releases that they think you will like based on previous " — social-media
  > "Premium is too expensive but at least Discover Weekly still helps me find new artists worth the cost." — reddit

### What are the most common frustrations with recommendations?
*27 reviews support this question*
- **Other Discovery Frustration** (n=113, conf=0.43)
  Other Discovery Frustration cited in 77% of discovery-related reviews.
  > "Not sure what you mean here. a) Discover Weekly according to Spotify is identical to New Music. Every week you get a new playlist that has new releases that they think you will like based on previous " — social-media
  > "Premium is too expensive but at least Discover Weekly still helps me find new artists worth the cost." — reddit
- **Repetition Fatigue** (n=25, conf=0.51)
  Repetition Fatigue cited in 17% of discovery-related reviews.
  > "I hear the same artists every Discover Weekly. Zero novelty." — reddit
  > "The real problem with Spotify's DJ is that, if you use it a lot, it gets into a feedback loop where it keeps playing the same songs that it serves you up because it thinks you like them. It's pretty b" — social-media
- **Positive Discovery Experience** (n=4, conf=0.57)
  Positive Discovery Experience cited in 3% of discovery-related reviews.
  > "Discover Weekly has introduced me to dozens of artists I now listen to every day. It's one of Spotify's best features." — appstore
  > "As someone who considers them very much a music aficionado I disagree with your conclusion. According to Spotify's 2021 review, I listened ~55k minutes of music across ~3300 artists. It is impossible " — social-media

### What listening behaviors are users trying to achieve?
*139 reviews support this question*
- **Use Algorithmic Playlists** (n=65, conf=0.53)
  Users report use algorithmic playlists in 45% of discovery-related reviews.
  > "Stuck in a genre bubble — every Discover Weekly is indie folk even though I listen to hip hop too." — social-media
  > "I hear the same artists every Discover Weekly. Zero novelty." — reddit
- **Evaluate Recommendations** (n=60, conf=0.39)
  Users report evaluate recommendations in 41% of discovery-related reviews.
  > "Recommendations trapped in one genre despite years of varied listening history." — appstore
  > "my favorite music app for over a decade! a happy customer! I love being able to listen to entire albums, make playlists, and most recently I'm super enjoying the AI DJ X, which usually is spot on for " — playstore
- **Social or External Discovery** (n=9, conf=0.49)
  Users report social or external discovery in 6% of discovery-related reviews.
  > "Absolute trash. New widget broke the already broken app more. Recommendations are always yhe exact same song (regardless of what you're listening to), the shuffle works the same way (only plays the sa" — playstore
  > "*I am a bot. If you'd like to receive a weekly recap of /r/electrohouse with the top posts and their alternative links, send me a message [with the subject 'electrohouse'](https://www.reddit.com/messa" — reddit

### What causes users to repeatedly listen to the same content?
*21 reviews support this question*
- **Unclear Repetition Cause** (n=65, conf=0.45)
  Repetitive listening linked to Unclear Repetition Cause (97% of repetition-related reviews).
  > "Stuck in a genre bubble — every Discover Weekly is indie folk even though I listen to hip hop too." — social-media
  > "I hear the same artists every Discover Weekly. Zero novelty." — reddit
- **Similarity-Based Reinforcement** (n=2, conf=0.55)
  Repetitive listening linked to Similarity-Based Reinforcement (3% of repetition-related reviews).
  > "Not sure what you mean here. a) Discover Weekly according to Spotify is identical to New Music. Every week you get a new playlist that has new releases that they think you will like based on previous " — social-media
  > "Same songs on repeat — algorithm regurgitates my listening history instead of finding new artists." — social-media

### Which user segments experience different discovery challenges?
*39 reviews support this question*
- **Unspecified Segment: Other Discovery Frustration** (n=63, conf=0.39)
  Other Discovery Frustration affects Unspecified Segment listeners (72%).
  > "The best ”algorithm” for discovering new music was digging through profiles on last.fm back when the social functions of the site were still active. Sure, it was a lot of manual work, but the results " — social-media
  > "I love how Daily Mix introduces me to similar artists outside my usual genres. Found my new favorite band this way." — appstore
- **Discovery-Focused Listener: Other Discovery Frustration** (n=43, conf=0.54)
  Other Discovery Frustration affects Discovery-Focused Listener listeners (88%).
  > "Not sure what you mean here. a) Discover Weekly according to Spotify is identical to New Music. Every week you get a new playlist that has new releases that they think you will like based on previous " — social-media
  > "Premium is too expensive but at least Discover Weekly still helps me find new artists worth the cost." — reddit
- **Playlist-Centric Listener: Other Discovery Frustration** (n=7, conf=0.51)
  Other Discovery Frustration affects Playlist-Centric Listener listeners (88%).
  > "Help please, Spotify ghost harassing me... —   I need help...  3 months ago, my Spotify account has started playing songs, randomly, that I did not request or start listening to. The phone will be on " — reddit
  > "Autoplay on my playlist adds songs I don't want. I can't turn off recommendations inside my own playlist." — spotify-community

### What unmet needs emerge consistently across reviews?
*30 reviews support this question*
- **General Discovery Improvement** (n=142, conf=0.45)
  Users express need for general discovery improvement (97% of reviews).
  > "Stuck in a genre bubble — every Discover Weekly is indie folk even though I listen to hip hop too." — social-media
  > "I hear the same artists every Discover Weekly. Zero novelty." — reddit
- **Cross-Genre Exploration** (n=2, conf=0.52)
  Users express need for cross-genre exploration (1% of reviews).
  > "The best ”algorithm” for discovering new music was digging through profiles on last.fm back when the social functions of the site were still active. Sure, it was a lot of manual work, but the results " — social-media
  > "I keep hearing from people how good is Spotify "Discovery" playlist. I've been a paid customer for 5+ years and their recommendations have a hit rate of 2%. I listen to a lot of different genres, arti" — social-media
- **Better Artist Discovery** (n=1, conf=0.59)
  Users express need for better artist discovery (1% of reviews).
  > "Premium is too expensive but at least Discover Weekly still helps me find new artists worth the cost." — reddit

## 6. Evidence Quality
### Why users struggle to discover new music
- Supporting reviews: 146
- Confidence: 0.45
- Segments: Discovery-Focused Listener, Unspecified Segment
- Sources: social-media, reddit
- Classification reasons present: no
  > "Not sure what you mean here. a) Discover Weekly according to Spotify is identical to New Music. Every week you get a new playlist that has new releases that they think you will lik"
  > "Premium is too expensive but at least Discover Weekly still helps me find new artists worth the cost."

### Other Discovery Frustration
- Supporting reviews: 113
- Confidence: 0.43
- Segments: Discovery-Focused Listener, Unspecified Segment
- Sources: social-media, reddit
- Classification reasons present: no
  > "Not sure what you mean here. a) Discover Weekly according to Spotify is identical to New Music. Every week you get a new playlist that has new releases that they think you will lik"
  > "Premium is too expensive but at least Discover Weekly still helps me find new artists worth the cost."

### Repetition Fatigue
- Supporting reviews: 25
- Confidence: 0.51
- Segments: Discovery-Focused Listener, Unspecified Segment
- Sources: reddit, social-media
- Classification reasons present: no
  > "I hear the same artists every Discover Weekly. Zero novelty."
  > "The real problem with Spotify's DJ is that, if you use it a lot, it gets into a feedback loop where it keeps playing the same songs that it serves you up because it thinks you like"

### Positive Discovery Experience
- Supporting reviews: 4
- Confidence: 0.57
- Segments: Discovery-Focused Listener, Unspecified Segment, Long-Term Power Listener
- Sources: appstore, social-media, playstore
- Classification reasons present: no
  > "Discover Weekly has introduced me to dozens of artists I now listen to every day. It's one of Spotify's best features."
  > "As someone who considers them very much a music aficionado I disagree with your conclusion. According to Spotify's 2021 review, I listened ~55k minutes of music across ~3300 artist"

### Genre Lock-In
- Supporting reviews: 4
- Confidence: 0.56
- Segments: Discovery-Focused Listener, Unspecified Segment
- Sources: social-media, appstore, reddit
- Classification reasons present: no
  > "Stuck in a genre bubble — every Discover Weekly is indie folk even though I listen to hip hop too."
  > "Recommendations trapped in one genre despite years of varied listening history."

### Neutral
- Supporting reviews: 138
- Confidence: 0.45
- Segments: Discovery-Focused Listener
- Sources: social-media, reddit, appstore
- Classification reasons present: no
  > "Stuck in a genre bubble — every Discover Weekly is indie folk even though I listen to hip hop too."
  > "I hear the same artists every Discover Weekly. Zero novelty."

### Frustration
- Supporting reviews: 6
- Confidence: 0.5
- Segments: Unspecified Segment, Playlist-Centric Listener
- Sources: appstore, reddit, playstore
- Classification reasons present: no
  > "2026 Update: There are so many duplicates of songs. So many. Not talking about 10th anniversary versions or single versions but those exist too. I have 4 different duplicates of Ma"
  > "Is there a way to stop mid-playlist song recommendations? — I'm enjoying tunes I'm familiar with and all of a sudden a song I definitely know I didn't add is playing. Why? Does Spo"

### Unclear Discovery Struggle
- Supporting reviews: 139
- Confidence: 0.44
- Segments: Discovery-Focused Listener
- Sources: appstore, social-media, reddit
- Classification reasons present: no
  > "Discover Weekly has introduced me to dozens of artists I now listen to every day. It's one of Spotify's best features."
  > "As someone who considers them very much a music aficionado I disagree with your conclusion. According to Spotify's 2021 review, I listened ~55k minutes of music across ~3300 artist"

## 7. Before vs After
| Metric | Before | After | Δ | Target | Improved |
|--------|--------|-------|---|--------|----------|
| Other Discovery Frustration | 45.6% | 77.4% | -31.8 | <25% | ✗ |
| General Discovery Improvement | 36.8% | 97.3% | -60.5 | <15% | ✗ |
| Unclear Discovery Struggle | 47.4% | 95.2% | -47.8 | <25% | ✗ |
| Unclear Repetition Cause | 63.2% | 96.6% | -33.4 | <20% | ✗ |
| Reviews with any fallback label | 78.9% | 100% | -21.1 | <40% | ✗ |

## Remaining Weaknesses
- LLM false-positive rate 22.2% — classifier keeps non-research reviews.
- Unclear Repetition Cause still 96.6% — root-cause insights weak.
- Other Discovery Frustration 77.4% — theme bucket still overloaded.
- 100% of research reviews contain fallback labels.
- Few findings include per-field classification_reasons for PM audit.
- Limited improvement vs benchmark on key fallback metrics.