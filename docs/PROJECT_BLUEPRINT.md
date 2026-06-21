🧠 OVERALL SYSTEM (ONE LINE)
A web app that converts raw Spotify/App Store/Reddit reviews into **evidence-backed behavioral intelligence** — full-corpus aggregation, cross-tabs, representative quotes, deterministic research findings, AI interpretation, and a grounded chatbot.

🏗️ UPDATED END-TO-END PIPELINE (CURRENT)

```
CSV / corpus
  → parseReviewsCsv (RawReview[])
  → discovery-relevance pre-check (lib/discovery-relevance.ts)
  → POST /api/classify (batches of 5; adds discovery_relevant + all 8 dimensions)
  → POST /api/aggregate (full corpus evidence — discovery-related only)
  → POST /api/findings (deterministic answers to 6 PM research questions)
  → POST /api/insights (AI interpretation grounded in evidence + findings)
  → Dashboard (Evidence sections + Interpretation sections)
  → POST /api/chat (full stats, cross-tabs, quotes — not a small sample)
```

**Pipeline state machine:** `idle → uploaded → classifying → aggregating → insights → done`

**Evidence vs interpretation:**
| Layer | Source | Contains |
|-------|--------|----------|
| Evidence | `POST /api/aggregate` + `POST /api/findings` | Counts, %, cross-tabs, quotes, source mix |
| Interpretation | `POST /api/insights` | Summary, root cause narratives, opportunities |

🏗️ PHASE-WISE ARCHITECTURE

PHASE 0 — FOUNDATION (SETUP)
Goal:
Set up a working web app skeleton.
Build:
Next.js project
Simple UI shell
File upload component
Output:
User can open app → sees upload screen
Why this phase exists:
Without this, you can’t test anything.

PHASE 1 — DATA INGESTION LAYER
Goal:
Bring your 600+ reviews into the system.
Input formats:
CSV upload (e.g. docs/review-corpus/all-reviews.csv)
Columns:
source
text
Build:
Upload CSV
Parse file
Store in memory (or JSON array)
Output:
[
  { source: "reddit", text: "..." },
  { source: "playstore", text: "..." }
]
Why this matters:
Everything downstream depends on clean input.

PHASE 2 — CLASSIFICATION ENGINE (CORE AI LAYER)
Goal:
Convert raw reviews → structured behavioral data; flag discovery relevance.
Build:
API: /api/classify
Pre-check: lib/discovery-relevance.ts (billing/login/ads/crashes → not discovery)
For each review:
Review → LLM → Structured JSON
Output per review:
{
  "discovery_relevant": true,
  "theme": "",
  "behavior": "",
  "emotion": "",
  "segment": "",
  "barrier": "",
  "root_cause": "",
  "unmet_need": "",
  "confidence": 0.8
}
Store:
Array of structured objects.
Why this is the MOST IMPORTANT phase:
This converts messy text into decision-grade data; non-discovery reviews are excluded downstream.

PHASE 3 — AGGREGATION ENGINE (EVIDENCE LAYER)
Goal:
Aggregate **all classified dimensions** across the full discovery-related corpus.
Build:
API: /api/aggregate
lib/evidence.ts — cross-tabs, quote extraction, repetition clustering
Computations:
1. All frequency tables
   theme, behavior, emotion, segment, barrier, root_cause, unmet_need
2. Cross-tabs
   segment × theme, segment × barrier, segment × unmet_need
3. Representative quotes (top clusters per theme / root_cause / unmet_need)
4. Source distribution
5. discoveryRelevantCount / excludedCount
Why this matters:
Turns individual opinions → auditable business signals (not LLM guesses)

PHASE 3b — RESEARCH FINDINGS (DETERMINISTIC LAYER) ← NEW
Goal:
Answer the six PM assignment questions from evidence alone.
Build:
API: POST /api/findings
lib/findings.ts — buildResearchFindings()
Output:
{
  "why_discovery_fails": "...",
  "top_frustrations": [...],
  "listening_behaviors": [...],
  "repetition_causes": [...],
  "segment_challenges": { "Long-term user": ["Repetition Fatigue (61%)", ...] },
  "unmet_needs": [...]
}
Why this matters:
Direct, reproducible answers for product strategy — no sampling bias

PHASE 4 — ROOT CAUSE ENGINE (INTERPRETATION LAYER)
Goal:
Explain WHY problems exist — grounded in full evidence, not ~30 samples.
Build:
API: /api/insights
Input:
Full AggregationResult + ResearchFindings + quote clusters
Output (InterpretationResult):
Executive summary, root cause narratives, discovery problems, opportunities
Why this is critical:
AI synthesis on top of evidence, not in place of it

PHASE 5 — OPPORTUNITY ENGINE (PRODUCT LAYER)
Goal:
Convert interpretation → product ideas
Build:
Part of /api/insights (InterpretationResult.opportunities)
Output:
Opportunity 1: Adjustable novelty control slider
Opportunity 2: Explainable recommendations
Opportunity 3: Exploration mode with guided randomness
Why this matters:
This connects analysis → MVP

PHASE 6 — DASHBOARD (VISUALIZATION LAYER)
Goal:
Show evidence and interpretation clearly; distinguish the two.
UI Sections:
**Evidence**
1. Research Findings Summary (6 PM questions)
2. Theme Distribution
3. User Segments
4. Discovery Barriers
5. Listening Behaviors
6. Emotions
7. Root Causes (frequency)
8. Unmet Needs
9. Segment-Specific Discovery Challenges (cross-tab)
10. Representative Quotes by theme
**Interpretation**
11. Executive Summary
12. Discovery Problems
13. Root Cause Narratives
14. Product Opportunities

PHASE 7 — REVIEW CHATBOT (Q&A LAYER)
Goal:
After analysis, answer natural-language questions grounded in **full corpus evidence**.
Example questions:
- Why do users struggle to discover new music?
- What are the top discovery barriers?
- Which segment complains most about repetition?
- What listening behaviors are users trying to achieve?
- What unmet needs emerge consistently?
- How do Reddit reviews differ from Play Store?
- What evidence supports genre lock-in?

Build:
lib/chat-context.ts — bundle evidence, findings, interpretation, quote clusters
lib/chat-prompt.ts — system rules (context-only, cite quotes)
API: POST /api/chat
UI: ChatPanel on dashboard (slide-over or drawer)
Suggested question chips + message history

Input to chat API:
{
  messages: [{ role, content }],
  context: AnalysisContext  // evidence + findings + interpretation
}

Output:
{
  reply: "Users struggle because…",
  citations: [{ label: "Repetition Fatigue", count: 228, quote: "..." }]
}

Architecture flow:
Upload → Classify → Aggregate → Findings → Insights → Dashboard
                                                          ↓
                                                buildAnalysisContext
                                                          ↓
                              User asks question → /api/chat → grounded answer

Why this matters:
- Dashboard = evidence snapshot + AI interpretation
- Chatbot = interactive PM copilot over the **entire classified corpus**
- Demo killer: "Ask anything about these 1,100 reviews" with cited quotes

MVP constraints:
- No new data fetching (uses analyzed session only)
- No vector DB (full aggregation + quote clusters in prompt)
- Chat resets on re-upload
- Same OpenRouter key as classify/insights

Stretch:
- Semantic retrieval per question
- Streaming replies
- Export chat transcript with report

🔗 END-TO-END SYSTEM

CSV / corpus → Classify → Aggregate → Findings → Insights → Dashboard
                                                                  ↓
                                                            Review Chatbot
                                                       (full evidence Q&A layer)
