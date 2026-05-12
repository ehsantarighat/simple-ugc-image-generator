export function buildRealismBlock(): string {
  return [
    "REALISM REQUIREMENTS:",
    "- Photographic realism is the highest priority.",
    "- Preserve realistic skin texture, pores, natural facial detail, and believable hair rendering.",
    "- Preserve realistic hand anatomy and natural grip if the product is held.",
    "- Maintain physically plausible lighting, shadows, reflections, and contact between the hand and product.",
    "- The scene should have real depth, natural focus falloff, and convincing material rendering.",
    "- Avoid overly polished AI beauty effects, excessive smoothing, or impossible surfaces.",
  ].join("\n");
}

export function buildCompositionPriorityBlock(): string {
  return [
    "COMPOSITION PRIORITY:",
    "1. Keep the model identity faithful to the references.",
    "2. Keep the product appearance faithful to the references.",
    "3. Follow the requested scene and interaction.",
    "4. Follow the requested camera, composition, and lighting.",
    "5. Optimize for an authentic, commercially usable UGC photograph.",
  ].join("\n");
}
