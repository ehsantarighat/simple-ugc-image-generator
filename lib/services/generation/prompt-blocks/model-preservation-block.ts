import type {
  ModelContext,
  ModelPreservationRules,
} from "@/lib/services/generation/payload-schema";

export function buildModelPreservationBlock(args: {
  rules: ModelPreservationRules;
  model: ModelContext;
}): string {
  const lines: string[] = ["MODEL PRESERVATION:"];
  if (args.rules.preserveIdentity) {
    lines.push(
      "- Treat the human reference images as identity references for the same model. Preserve the same face and overall identity across the final image."
    );
  }
  const detail: string[] = [];
  if (args.rules.preserveFaceStructure) detail.push("facial structure");
  if (args.rules.preserveHair) detail.push("hair");
  if (args.rules.preserveSkinTone) detail.push("skin tone");
  if (args.rules.preserveVisibleDistinctiveFeatures) detail.push("visible distinctive features");
  if (detail.length > 0) {
    lines.push(`- Preserve: ${detail.join(", ")}.`);
  }
  if (args.model.description) {
    lines.push(`- Identity notes: ${args.model.description}`);
  }
  if (args.rules.realismInstruction) {
    lines.push(`- ${args.rules.realismInstruction}`);
  }
  return lines.join("\n");
}
