import type {
  ModelContext,
  ModelPreservationRules,
} from "@/lib/services/generation/payload-schema";

export function buildModelPreservationBlock(args: {
  rules: ModelPreservationRules;
  model: ModelContext;
  /** When true, the prompt has a wardrobe-swap block, so the language here
   *  needs to scope preservation to the PERSON (face/body/hair) and avoid
   *  any phrasing that could lock in the reference outfit. */
  hasWardrobeSwap?: boolean;
}): string {
  const lines: string[] = ["MODEL PRESERVATION (identity only — NOT clothing):"];
  if (args.rules.preserveIdentity) {
    lines.push(
      "- Treat the human reference images as identity references for the same person. Preserve the same face and overall personal identity in the final image."
    );
  }
  // Build the detail list. When a wardrobe swap is in play we drop the
  // "visible distinctive features" line, because image models tend to read
  // that as "preserve the cardigan, the necklace, the headband, etc."
  const detail: string[] = [];
  if (args.rules.preserveFaceStructure) detail.push("facial structure");
  if (args.rules.preserveHair) detail.push("hair color and style");
  if (args.rules.preserveSkinTone) detail.push("skin tone and texture");
  if (args.rules.preserveVisibleDistinctiveFeatures && !args.hasWardrobeSwap) {
    detail.push("permanent visible features (e.g. moles, tattoos, freckles)");
  }
  if (detail.length > 0) {
    lines.push(`- Preserve: ${detail.join(", ")}.`);
  }

  // Explicit scope guard. Without this, "preserve the model's identity"
  // gets interpreted as "preserve everything visible in the reference",
  // including her current outfit. This single line is the difference
  // between a wardrobe swap working and a collage output.
  lines.push(
    "- Do NOT preserve the model's clothing, jewelry, accessories, makeup styling, hair styling, or background from the reference photos — only the person."
  );

  if (args.model.description) {
    lines.push(`- Identity notes: ${args.model.description}`);
  }
  if (args.rules.realismInstruction) {
    lines.push(`- ${args.rules.realismInstruction}`);
  }
  return lines.join("\n");
}
