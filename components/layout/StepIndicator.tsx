type Step = "upload" | "cleanup" | "process" | "done";

interface StepIndicatorProps {
  current: Step;
}

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Fetch" },
  { id: "cleanup", label: "Cleanup" },
  { id: "process", label: "Analyze" },
];

function stepIndex(step: Step): number {
  if (step === "done") return 3;
  return STEPS.findIndex((s) => s.id === step);
}

export default function StepIndicator({ current }: StepIndicatorProps) {
  const activeIndex = stepIndex(current);

  return (
    <div className="mt-2 flex items-center justify-center gap-6 md:gap-10">
      {STEPS.map((step, index) => {
        const isActive = index === activeIndex;
        const isComplete = index < activeIndex;

        return (
          <div key={step.id} className="flex items-center gap-6 md:gap-10">
            <div
              className={`flex flex-col items-center gap-2 transition-opacity duration-300 ${
                isActive || isComplete ? "opacity-100" : "opacity-40"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-on-primary shadow-md ring-4 ring-primary/20"
                    : isComplete
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-high text-on-surface"
                }`}
              >
                {isComplete ? "✓" : index + 1}
              </div>
              <span
                className={`text-xs font-bold ${
                  isActive ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className="hidden h-px w-12 bg-outline-variant md:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}
