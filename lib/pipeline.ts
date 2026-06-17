export type PipelineStep =
  | "idle"
  | "uploaded"
  | "parsing"
  | "classifying"
  | "aggregating"
  | "insights"
  | "done";

export const PIPELINE_STEP_LABELS: Record<
  Exclude<PipelineStep, "idle" | "done">,
  string
> = {
  parsing: "Parsing CSV…",
  uploaded: "Ready to analyze",
  classifying: "Classifying reviews…",
  aggregating: "Aggregating patterns…",
  insights: "Generating insights…",
};
