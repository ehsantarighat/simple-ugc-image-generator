// ============================================================================
// refinement-block.ts
// Refinement-specific prompt sections from spec section 13.1, plus the
// optional refinement-intent templates from section 14.
// ============================================================================

export function buildRefinementInstructionBlock(userRequest: string): string {
  return [
    "USER REFINEMENT REQUEST:",
    userRequest,
  ].join("\n");
}

export function buildRefinementPreservationBlock(): string {
  return [
    "PRESERVATION PRIORITY:",
    "- Keep the same model identity.",
    "- Keep the same product identity.",
    "- Keep the same broad scene and visual mood unless explicitly changed.",
    "- Make only the minimum necessary changes to satisfy the user request.",
    "- Preserve the strongest realistic qualities of the original generated image.",
  ].join("\n");
}

export function buildRefinementRealismBlock(): string {
  return [
    "REALISM REQUIREMENTS:",
    "- Keep the result photorealistic and naturally photographed.",
    "- Preserve believable skin texture, lighting, shadows, product scale, and human-product interaction.",
    "- Avoid introducing new visual errors while making the requested edit.",
  ].join("\n");
}

// ---- Refinement intent templates from spec section 14 ---------------------
// Lightweight rule-based classifier. Returns extra instruction text to append
// to the prompt when a known intent is detected. Returns null otherwise.
export function classifyRefinementIntent(userRequest: string): string | null {
  const t = userRequest.toLowerCase();

  if (/more (natural|realistic|authentic|candid)/.test(t)) {
    return "Reduce any over-polished or synthetic look. Make the image feel more like an authentic real-life creator photo while keeping the original subject, product, and scene.";
  }
  if (/product (more|larger|bigger|visible|prominent|hero)/.test(t)) {
    return "Increase the visual clarity and presence of the product while keeping the pose, scene, and model identity natural. Do not enlarge it unrealistically.";
  }
  if (/(light|lighting|brighter|darker|warmer|cooler|shadow)/.test(t)) {
    return "Adjust only the lighting mood and associated shadows/reflections. Preserve the model, product, composition, and scene structure as much as possible.";
  }
  if (/(gaze|eyes? (looking|towards|away)|face camera|look at)/.test(t)) {
    return "Adjust the model's gaze direction according to the request while preserving the same face, pose, product, and scene.";
  }
  if (/(hand|grip|hold|holding|fingers?)/.test(t)) {
    return "Improve the realism of the hand grip and product contact. Keep the product accurate and the model's hand anatomy natural and plausible.";
  }
  if (/(background|backdrop|behind|environment)/.test(t)) {
    return "Replace or adjust the background according to the user request while preserving the model, the product, and their relative positioning.";
  }
  return null;
}
