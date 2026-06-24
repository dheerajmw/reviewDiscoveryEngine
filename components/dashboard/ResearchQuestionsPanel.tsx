"use client";

import type { QuoteEvidence, ResearchQuestionAnswer } from "@/lib/types";
import Card from "@/components/ui/Card";
import Icon from "@/components/ui/Icon";
import EvidenceMeta from "./evidence/EvidenceMeta";
import FindingQuoteList from "./evidence/FindingQuoteList";

interface ResearchQuestionsPanelProps {
  answers: ResearchQuestionAnswer[];
  onQuoteClick: (quote: QuoteEvidence) => void;
}

const QUESTION_ICONS = [
  "help_outline",
  "sentiment_dissatisfied",
  "headphones",
  "repeat",
  "groups",
  "lightbulb",
] as const;

export default function ResearchQuestionsPanel({
  answers,
  onQuoteClick,
}: ResearchQuestionsPanelProps) {
  return (
    <Card
      title="Research questions"
      subtitle="Evidence-grounded answers synthesized from the classified review corpus — each links to supporting quotes."
    >
      <ol className="space-y-6">
        {answers.map((item, index) => (
          <li
            key={item.id}
            className="rounded-xl border border-outline-variant bg-surface-container-low p-5"
          >
            <div className="mb-3 flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-on-primary">
                {index + 1}
              </span>
              <h4 className="flex items-start gap-2 text-sm font-semibold text-on-surface">
                <Icon
                  name={QUESTION_ICONS[index] ?? "quiz"}
                  className="mt-0.5 shrink-0 text-primary"
                />
                {item.question}
              </h4>
            </div>

            <p className="mb-4 text-sm leading-relaxed text-on-surface-variant">
              {item.answer}
            </p>

            <EvidenceMeta
              evidenceCount={item.evidence_count}
              confidence={item.confidence}
              sourceDistribution={item.source_distribution}
            />

            <div className="mt-4">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-on-surface-variant">
                Supporting evidence
              </p>
              <FindingQuoteList
                quotes={item.quotes}
                limit={3}
                onQuoteClick={onQuoteClick}
              />
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
