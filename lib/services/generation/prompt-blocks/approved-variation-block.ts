export function buildVariationGoalBlock(variationRequest?: string | null): string {
  return [
    "VARIATION GOAL:",
    variationRequest && variationRequest.trim().length > 0
      ? variationRequest.trim()
      : "Create a slight natural variation of the approved image.",
  ].join("\n");
}

export function buildVariationConsistencyBlock(): string {
  return [
    "KEEP CONSISTENT:",
    "- same model identity",
    "- same product identity",
    "- similar realism level",
    "- similar photographic quality",
    "- similar UGC authenticity",
    "- similar commercial usability",
    "",
    "ALLOW ONLY NATURAL VARIATION IN:",
    "- small pose changes",
    "- subtle facial expression changes",
    "- small framing differences",
    "- slight angle or distance shifts",
    "- minor background movement if not user-constrained",
  ].join("\n");
}

export function buildVariationAvoidBlock(): string {
  return [
    "AVOID:",
    "- major restyling",
    "- different product",
    "- different model",
    "- artificial or overly studio-like look",
    "- scene replacement unless explicitly requested",
  ].join("\n");
}
