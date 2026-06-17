import type { PipelineStep } from "@/lib/pipeline";
import Icon from "./Icon";
import ProgressBar from "./ProgressBar";

interface LoadingStateProps {
  step: PipelineStep;
  completed?: number;
  total?: number;
}

const PIPELINE_STEPS: {
  id: PipelineStep;
  label: string;
  icon: string;
}[] = [
  { id: "parsing", label: "Parsing CSV", icon: "table_view" },
  { id: "classifying", label: "Classifying reviews", icon: "psychology" },
  { id: "aggregating", label: "Aggregating patterns", icon: "hub" },
  { id: "insights", label: "Generating insights", icon: "auto_awesome" },
];

function stepStatus(
  current: PipelineStep,
  stepId: PipelineStep,
): "done" | "active" | "pending" {
  const order: PipelineStep[] = [
    "parsing",
    "classifying",
    "aggregating",
    "insights",
  ];
  const currentIdx = order.indexOf(current);
  const stepIdx = order.indexOf(stepId);
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return "active";
  return "pending";
}

export default function LoadingState({
  step,
  completed = 0,
  total = 0,
}: LoadingStateProps) {
  if (!["parsing", "classifying", "aggregating", "insights"].includes(step)) {
    return null;
  }

  return (
    <div className="animate-fade-in-up flex flex-col gap-8 py-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-on-surface">
          Processing reviews
        </h2>
        <p className="mt-1 text-sm text-on-surface-variant">
          Running AI classification and insight generation
        </p>
      </div>

      <div className="mx-auto w-full max-w-md space-y-4">
        {PIPELINE_STEPS.map((pipelineStep, index) => {
          const status = stepStatus(step, pipelineStep.id);
          return (
            <div
              key={pipelineStep.id}
              className={`animate-fade-in-up stagger-${index + 1} flex items-center gap-4 rounded-xl border px-4 py-3 transition-all ${
                status === "active"
                  ? "border-primary/30 bg-primary/5"
                  : status === "done"
                    ? "border-outline-variant bg-surface-container-low"
                    : "border-outline-variant/50 bg-surface-container-lowest opacity-50"
              }`}
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  status === "active"
                    ? "bg-primary text-on-primary animate-subtle-pulse"
                    : status === "done"
                      ? "bg-primary text-on-primary"
                      : "bg-surface-variant text-on-surface-variant"
                }`}
              >
                {status === "done" ? (
                  <Icon name="check" className="text-lg" />
                ) : (
                  <Icon name={pipelineStep.icon} className="text-lg" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-sm font-medium ${
                    status === "active" ? "text-primary" : "text-on-surface"
                  }`}
                >
                  {pipelineStep.label}
                </p>
                {status === "active" && step === "classifying" && total > 0 && (
                  <div className="mt-2">
                    <ProgressBar
                      completed={completed}
                      total={total}
                      shimmer
                    />
                  </div>
                )}
                {status === "active" && step !== "classifying" && (
                  <p className="mt-0.5 text-xs text-on-surface-variant">
                    In progress…
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
