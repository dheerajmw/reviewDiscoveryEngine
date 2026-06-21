import type { QuoteEvidence } from "@/lib/types";
import Icon from "@/components/ui/Icon";
import SourceBadge from "@/components/ui/SourceBadge";

interface FindingQuoteListProps {
  quotes: QuoteEvidence[];
  limit?: number;
  onQuoteClick?: (quote: QuoteEvidence) => void;
}

function truncate(text: string, max = 220): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function quoteListKey(quote: QuoteEvidence, index: number): string {
  return `${quote.review_id || "quote"}-${index}-${quote.source}`;
}

export default function FindingQuoteList({
  quotes,
  limit = 3,
  onQuoteClick,
}: FindingQuoteListProps) {
  if (quotes.length === 0) {
    return (
      <p className="text-xs italic text-on-surface-variant">
        No representative quotes available for this finding.
      </p>
    );
  }

  const visible = quotes.slice(0, limit);

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {visible.map((quote, index) => (
          <li key={quoteListKey(quote, index)}>
          <button
            type="button"
            onClick={() => onQuoteClick?.(quote)}
            className="group flex w-full gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-left transition-colors hover:bg-surface-container-high"
          >
            <Icon
              name="format_quote"
              className="mt-0.5 shrink-0 text-primary/60 group-hover:text-primary"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-relaxed text-on-surface-variant group-hover:text-on-surface">
                &ldquo;{truncate(quote.text)}&rdquo;
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <SourceBadge source={quote.source} />
                <span className="text-[10px] text-outline">{quote.segment}</span>
                <span className="text-[10px] text-outline">
                  {Math.round(quote.confidence * 100)}% conf.
                </span>
              </div>
            </div>
          </button>
          </li>
        ))}
      </ul>
      {quotes.length > limit && (
        <p className="text-xs text-primary">
          +{quotes.length - limit} more in detail view
        </p>
      )}
    </div>
  );
}
