import type { SceneSpecification } from "@/lib/services/generation/payload-schema";
import { buildInteractionPrompt } from "@/lib/services/generation/interaction-classifier";

export function buildSceneBlock(scene: SceneSpecification): string {
  const lines: string[] = [
    "SCENE TO CREATE:",
    scene.userSceneDescription,
  ];

  const interactionPrompt = buildInteractionPrompt(scene.productInteraction);
  lines.push("");
  lines.push("INTERACTION:");
  if (interactionPrompt) {
    lines.push(interactionPrompt);
  } else {
    lines.push(
      "Infer a natural product interaction from the scene description and execute it plausibly."
    );
  }

  const inferred: string[] = [];
  if (scene.inferredLocation) inferred.push(`location: ${scene.inferredLocation}`);
  if (scene.inferredAction) inferred.push(`action: ${scene.inferredAction}`);
  if (scene.inferredMood) inferred.push(`mood: ${scene.inferredMood}`);
  if (scene.inferredTimeOfDay) inferred.push(`time of day: ${scene.inferredTimeOfDay}`);
  if (inferred.length > 0) {
    lines.push(`Scene notes — ${inferred.join("; ")}.`);
  }
  if (scene.backgroundNotes) {
    lines.push(`Background: ${scene.backgroundNotes}`);
  }

  return lines.join("\n");
}
