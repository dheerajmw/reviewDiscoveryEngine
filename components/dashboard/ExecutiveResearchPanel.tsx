"use client";

import type {
  ExecutiveFinding,
  ExecutiveResearchReport,
  SlideFinding,
  StrategicOpportunity,
} from "@/lib/types";
import { SectionHeader } from "./SectionHeader";

function FindingCard({ finding, index }: { finding: ExecutiveFinding; index: number }) {
  return (
    <article className="stitch-dash-card rounded-xl border border-outline-variant/40 p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Finding {index + 1}
        </span>
        {finding.is_positive ? (
          <span className="rounded-full bg-tertiary-container/30 px-2 py-0.5 text-xs text-on-surface-variant">
            Positive signal
          </span>
        ) : null}
        <span className="rounded-full bg-surface-container-high px-2 py-0.5 text-xs text-on-surface-variant">
          {finding.evidence_strength} evidence · {finding.source_count} sources
        </span>
      </div>
      <h3 className="mb-2 text-base font-semibold leading-snug text-on-surface">
        {finding.title}
      </h3>
      <p className="mb-3 text-sm leading-relaxed text-on-surface-variant">
        {finding.description}
      </p>
      {finding.mechanism ? (
        <dl className="mb-3 space-y-2 rounded-lg bg-surface-container-low p-3 text-xs">
          {finding.symptom ? (
            <div>
              <dt className="font-semibold text-on-surface">Symptom</dt>
              <dd className="text-on-surface-variant">{finding.symptom}</dd>
            </div>
          ) : null}
          <div>
            <dt className="font-semibold text-on-surface">Mechanism</dt>
            <dd className="text-on-surface-variant">{finding.mechanism}</dd>
          </div>
          {finding.product_implication ? (
            <div>
              <dt className="font-semibold text-on-surface">Product implication</dt>
              <dd className="text-on-surface-variant">{finding.product_implication}</dd>
            </div>
          ) : null}
          {finding.opportunity ? (
            <div>
              <dt className="font-semibold text-on-surface">Opportunity</dt>
              <dd className="text-primary">{finding.opportunity}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-md bg-primary/10 px-2 py-1 text-primary">
          {finding.evidence_count} reviews
        </span>
        {finding.business_impact.map((impact) => (
          <span
            key={impact}
            className="rounded-md bg-tertiary-container/20 px-2 py-1 text-on-surface-variant"
          >
            {impact}
          </span>
        ))}
      </div>
      {finding.representative_quotes[0] && (
        <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic text-on-surface-variant">
          &ldquo;{finding.representative_quotes[0].text.slice(0, 200)}
          {finding.representative_quotes[0].text.length > 200 ? "…" : ""}&rdquo;
          <footer className="mt-1 text-xs not-italic text-on-surface-variant/80">
            — {finding.representative_quotes[0].source}
          </footer>
        </blockquote>
      )}
    </article>
  );
}

function OpportunityCard({ opp }: { opp: StrategicOpportunity }) {
  return (
    <article className="stitch-dash-card rounded-xl border border-outline-variant/40 p-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-on-surface">{opp.size} opportunity</span>
        <span className="text-xs text-on-surface-variant">Score {opp.opportunity_score}</span>
      </div>
      <p className="mb-2 text-sm">
        <span className="font-medium text-on-surface">Problem: </span>
        <span className="text-on-surface-variant">{opp.problem}</span>
      </p>
      <p className="mb-2 text-sm">
        <span className="font-medium text-on-surface">Behavior: </span>
        <span className="text-on-surface-variant">{opp.current_user_behavior}</span>
      </p>
      <p className="mb-2 text-sm">
        <span className="font-medium text-on-surface">Opportunity: </span>
        <span className="text-on-surface-variant">{opp.spotify_opportunity}</span>
      </p>
      <p className="text-xs text-on-surface-variant">
        {opp.supporting_reviews} reviews · {opp.affected_segments.join(", ")}
      </p>
    </article>
  );
}

function SlideCard({ slide, index }: { slide: SlideFinding; index: number }) {
  return (
    <article className="rounded-lg bg-surface-container-low p-4">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">
        Slide {index + 1}
      </p>
      <p className="mb-2 font-semibold text-on-surface">{slide.headline}</p>
      <p className="mb-1 text-xs text-on-surface-variant">{slide.evidence_count} reviews</p>
      <p className="mb-2 text-sm italic text-on-surface-variant">
        &ldquo;{slide.supporting_quote}&rdquo;
      </p>
      <p className="text-sm text-on-surface-variant">
        <span className="font-medium text-on-surface">Implication: </span>
        {slide.business_implication}
      </p>
      <p className="mt-1 text-sm text-primary">
        <span className="font-medium">Action: </span>
        {slide.recommended_action}
      </p>
    </article>
  );
}

interface ExecutiveResearchPanelProps {
  report: ExecutiveResearchReport;
}

export default function ExecutiveResearchPanel({
  report,
}: ExecutiveResearchPanelProps) {
  return (
    <div className="space-y-gutter">
      <SectionHeader
        type="interpretation"
        title="Executive research report"
        description="Synthesized product insights for director-level strategy review — not taxonomy frequencies."
      />

      <div className="stitch-dash-card rounded-xl border border-primary/20 bg-primary/5 p-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">
          Executive summary
        </h3>
        <p className="text-base leading-relaxed text-on-surface">
          {report.executive_summary}
        </p>
      </div>

      {report.positive_discovery_signals.length > 0 ? (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-on-surface">
            Positive discovery signals
          </h3>
          <div className="grid gap-4 lg:grid-cols-1">
            {report.positive_discovery_signals.map((f, i) => (
              <FindingCard key={f.id} finding={f} index={i} />
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <h3 className="mb-3 text-sm font-semibold text-on-surface">
          Discovery problems
        </h3>
        <div className="grid gap-4 lg:grid-cols-1">
          {report.top_discovery_problems.map((f, i) => (
            <FindingCard key={f.id} finding={f} index={i} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-on-surface">
          Recommendation frustrations
        </h3>
        <div className="grid gap-4 lg:grid-cols-1">
          {report.top_recommendation_frustrations.map((f, i) => (
            <FindingCard key={f.id} finding={f} index={i} />
          ))}
        </div>
      </div>

      {report.director_readiness ? (
        <div className="stitch-dash-card rounded-xl border border-outline-variant/40 p-5">
          <h3 className="mb-2 text-sm font-semibold text-on-surface">
            Director readiness
          </h3>
          <p className="text-2xl font-bold text-primary">
            {report.director_readiness.score}/{report.director_readiness.maxScore}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            {report.director_readiness.rationale}
          </p>
        </div>
      ) : null}

      <div className="grid gap-gutter lg:grid-cols-2">
        <div className="stitch-dash-card rounded-xl p-5">
          <h3 className="mb-3 text-sm font-semibold text-on-surface">
            Discovery behaviors
          </h3>
          <ul className="space-y-4">
            {report.discovery_behaviors.slice(0, 4).map((b) => (
              <li key={b.behavior}>
                <p className="text-sm font-medium text-on-surface">{b.behavior}</p>
                <p className="text-sm text-on-surface-variant">{b.narrative}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="stitch-dash-card rounded-xl p-5">
          <h3 className="mb-3 text-sm font-semibold text-on-surface">
            Segment differences
          </h3>
          <ul className="space-y-4">
            {report.segment_differences.slice(0, 4).map((s) => (
              <li key={s.segment}>
                <p className="text-sm font-semibold text-on-surface">{s.display_name}</p>
                <p className="text-sm text-on-surface-variant">{s.primary_challenge}</p>
                <p className="text-xs text-on-surface-variant/80">{s.discovery_behavior}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-on-surface">
          Strategic opportunities
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {report.strategic_opportunities.map((o) => (
            <OpportunityCard key={o.id} opp={o} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-on-surface">
          Slide-ready findings
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {report.slides.map((s, i) => (
            <SlideCard key={`${s.headline}-${i}`} slide={s} index={i} />
          ))}
        </div>
      </div>

      <p className="text-xs text-on-surface-variant">{report.confidence_assessment}</p>
    </div>
  );
}
