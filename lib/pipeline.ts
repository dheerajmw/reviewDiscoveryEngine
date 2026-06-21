export type PipelineStep =
  | "idle"
  | "uploaded"
  | "parsing"
  | "fetching"
  | "curating"
  | "curation_empty"
  | "classifying"
  | "aggregating"
  | "saving"
  | "done";

export const PIPELINE_STEP_LABELS: Record<
  Exclude<PipelineStep, "idle" | "done" | "curation_empty">,
  string
> = {
  parsing: "Parsing CSV…",
  fetching: "Fetching live reviews…",
  uploaded: "Ready to analyze",
  curating: "Filtering discovery-relevant reviews…",
  classifying: "Classifying reviews…",
  aggregating: "Aggregating patterns…",
  saving: "Saving to research repository…",
};
