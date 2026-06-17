type Step = "upload" | "preview" | "process" | "done";

interface StepIndicatorProps {
  current: Step;
}

const STEPS: { id: Step; label: string }[] = [
  { id: "upload", label: "Upload" },
  { id: "preview", label: "Preview" },
  { id: "process", label: "Process" },
];

function stepIndex(step: Step): number {
  if (step === "done") return 3;
  return STEPS.findIndex((s) => s.id === step);
}

export default function StepIndicator({ current }: StepIndicatorProps) {
  const activeIndex = stepIndex(current);

  return (
    <div className="mt-6 flex items-center justify-center gap-4 md:gap-8">
      {STEPS.map((step, index) => {
        const isActive = index === activeIndex;
        const isComplete = index < activeIndex;

        return (
          <div key={step.id} className="flex items-center gap-4 md:gap-8">
            <div
              className={`flex flex-col items-center gap-2 transition-opacity duration-300 ${
                isActive || isComplete ? "opacity-100" : "opacity-40"
              }`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-on-primary ring-4 ring-primary/20"
                    : isComplete
                      ? "bg-primary text-on-primary"
                      : "bg-surface-variant text-on-surface"
                }`}
              >
                {isComplete ? "✓" : index + 1}
              </div>
              <span
                className={`text-[10px] font-medium uppercase tracking-wide ${
                  isActive ? "text-primary" : "text-on-surface-variant"
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div className="hidden h-px w-10 bg-outline-variant md:block" />
            )}
          </div>
        );
      })}
    </div>
  );
}
