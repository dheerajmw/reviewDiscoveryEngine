export const SUGGESTED_QUESTIONS = [
  "Why do users struggle to discover new music?",
  "What are the top discovery barriers?",
  "Which user segment complains most about repetition?",
  "How do Play Store reviews differ from Reddit?",
  "What product opportunities address low novelty?",
  "What evidence supports the top theme?",
] as const;

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export default function SuggestedQuestions({
  onSelect,
  disabled = false,
}: SuggestedQuestionsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTED_QUESTIONS.map((question) => (
        <button
          key={question}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(question)}
          className="rounded-full border border-outline-variant bg-surface-container-low px-3 py-1.5 text-left text-xs text-on-surface-variant transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
