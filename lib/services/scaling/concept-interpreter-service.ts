// ============================================================================
// concept-interpreter-service.ts
// Spec section 7.1. Rule-based concept normalization. No LLM call.
//
// The MVP version takes the user's free-form concept description and produces
// a normalized concept summary the planner can branch on. A later version can
// swap this for a vision/text LLM call.
// ============================================================================

import type {
  StyleMode,
  SubjectMode,
} from "@/lib/services/generation/payload-schema";

export interface NormalizedConcept {
  summary: string;
  hintedSceneTypes: SceneType[];
  hintedMoods: string[];
}

export type SceneType =
  | "bathroom"
  | "kitchen"
  | "cafe"
  | "desk"
  | "bedroom"
  | "outdoor"
  | "gym"
  | "studio_white"
  | "studio_tabletop"
  | "flat_lay"
  | "shelf"
  | "generic";

const SCENE_PATTERNS: Array<[SceneType, RegExp]> = [
  ["bathroom", /(bathroom|sink|mirror|vanity|shower)/i],
  ["kitchen", /(kitchen|counter|stove)/i],
  ["cafe", /(cafe|coffee shop|coffee house|barista)/i],
  ["desk", /(desk|workspace|laptop|office)/i],
  ["bedroom", /(bedroom|bed\b|nightstand|dresser)/i],
  ["outdoor", /(outdoor|park|garden|street|patio|terrace)/i],
  ["gym", /(gym|workout|fitness|yoga)/i],
  ["studio_white", /(white background|seamless|cyc|studio backdrop|isolated)/i],
  ["studio_tabletop", /(studio (?:tabletop|surface)|tabletop product|hero shot)/i],
  ["flat_lay", /(flat lay|flatlay|top down|overhead|knolling)/i],
  ["shelf", /(shelf|shelves)/i],
];

const MOOD_PATTERNS: Array<[string, RegExp]> = [
  ["calm", /(calm|serene|peaceful|relax)/i],
  ["energetic", /(energetic|active|dynamic|vibrant)/i],
  ["luxurious", /(luxur|premium|elegant|sophisticated)/i],
  ["minimal", /(minimal|simple|clean|sparse)/i],
  ["warm", /(warm|cozy|homey|inviting)/i],
  ["bright", /(bright|airy|sunny|fresh)/i],
];

export function interpretConcept(args: {
  conceptDescription: string;
  subjectMode: SubjectMode;
  styleMode: StyleMode;
}): NormalizedConcept {
  const text = args.conceptDescription;
  const hintedSceneTypes: SceneType[] = [];
  for (const [s, re] of SCENE_PATTERNS) if (re.test(text)) hintedSceneTypes.push(s);
  const hintedMoods: string[] = [];
  for (const [m, re] of MOOD_PATTERNS) if (re.test(text)) hintedMoods.push(m);

  // Sensible defaults if nothing matched.
  if (hintedSceneTypes.length === 0) {
    if (args.styleMode === "studio") {
      hintedSceneTypes.push(
        args.subjectMode === "product_only" ? "studio_tabletop" : "studio_white"
      );
    } else {
      hintedSceneTypes.push("generic");
    }
  }
  if (hintedMoods.length === 0) hintedMoods.push("clean");

  const summary = `${args.subjectMode} / ${args.styleMode} — scenes: ${hintedSceneTypes.join(", ")}; mood: ${hintedMoods.join(", ")}`;
  return { summary, hintedSceneTypes, hintedMoods };
}
