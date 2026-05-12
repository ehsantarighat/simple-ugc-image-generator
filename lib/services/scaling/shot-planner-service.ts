// ============================================================================
// shot-planner-service.ts
// Spec section 7.2. Produces a `shotPlan` for pack modes.
// Rule-based defaults; can be replaced with an LLM planner later.
// ============================================================================

import type { PhotographyControls } from "@/types";
import type {
  OutputAspectRatio,
  OutputScope,
  PlatformTarget,
  StyleMode,
  SubjectMode,
} from "@/lib/services/generation/payload-schema";
import {
  interpretConcept,
  type NormalizedConcept,
  type SceneType,
} from "@/lib/services/scaling/concept-interpreter-service";

export interface PlannedConcept {
  id: string;
  title: string;
  scenePrompt: string;
  sceneType: SceneType;
  styleMode: StyleMode;
  subjectMode: SubjectMode;
  recommendedControls: PhotographyControls;
  // ratios + platforms are decided at orchestration time by the ratio planner.
}

export interface ShotPlan {
  projectId: string;
  scope: OutputScope;
  concepts: PlannedConcept[];
  notes: string[];
}

// ----------------------------------------------------------------------------
// Default controls per (subjectMode, styleMode) pair. Used as the starting
// point and lightly customized per concept.
// ----------------------------------------------------------------------------
function baseControls(args: {
  subjectMode: SubjectMode;
  styleMode: StyleMode;
}): PhotographyControls {
  // Common defaults
  const out: PhotographyControls = {
    shotType: "candid_lifestyle",
    cameraAngle: "eye_level",
    lensType: "35mm",
    framing: "medium_close_up",
    lighting: "soft_window_light",
    authenticityLevel: "natural_influencer",
    productProminence: "balanced",
    outputAspectRatio: "4:5",
    numberOfVariations: 1, // anchors are usually a single hero shot
  };

  if (args.styleMode === "studio") {
    out.shotType = "close_up_interaction";
    out.lensType = "50mm";
    out.framing = "close_up";
    out.lighting = "soft_window_light";
    out.authenticityLevel = "branded_clean_ugc";
    out.productProminence = "hero";
  } else if (args.styleMode === "lifestyle") {
    out.shotType = "candid_lifestyle";
    out.framing = "medium_shot";
    out.authenticityLevel = "natural_influencer";
  } else if (args.styleMode === "hybrid") {
    out.authenticityLevel = "branded_clean_ugc";
  } else {
    out.shotType = "selfie_style";
    out.authenticityLevel = "natural_influencer";
  }

  if (args.subjectMode === "product_only") {
    out.shotType = args.styleMode === "lifestyle" ? "close_up_interaction" : "close_up_interaction";
    out.framing = args.styleMode === "studio" ? "close_up" : "medium_close_up";
    out.productProminence = "hero";
  }

  return out;
}

const SCENE_LABELS: Record<SceneType, string> = {
  bathroom: "Bathroom shelf",
  kitchen: "Kitchen scene",
  cafe: "Café table",
  desk: "Desk setup",
  bedroom: "Bedroom side table",
  outdoor: "Outdoor lifestyle",
  gym: "Post-workout",
  studio_white: "Studio on white",
  studio_tabletop: "Studio tabletop",
  flat_lay: "Flat lay",
  shelf: "Shelf in context",
  generic: "Lifestyle scene",
};

const SCENE_PROMPTS: Record<SceneType, string> = {
  bathroom:
    "A bright, softly lit bathroom shelf or counter. The product sits naturally among everyday items, with believable scale and reflections.",
  kitchen:
    "A clean kitchen counter scene with realistic surrounding household textures. The product is placed naturally as if mid-use.",
  cafe:
    "A modern café table scene with realistic light and surface texture. The product is integrated casually into the moment.",
  desk:
    "A creative workspace desk scene with natural daylight, realistic materials, and tidy but lived-in styling.",
  bedroom:
    "A calm, softly lit bedroom side table with believable everyday styling.",
  outdoor:
    "A natural outdoor scene with realistic ambient light and environmental context that suits the product.",
  gym:
    "A believable gym or fitness environment with natural light and realistic textures.",
  studio_white:
    "A clean, premium studio shot on a seamless white background with controlled, photographic lighting.",
  studio_tabletop:
    "A polished studio tabletop scene with controlled key light and a neutral surface, photographed like a commercial product still.",
  flat_lay:
    "A top-down flat-lay composition with thoughtful styling and natural light, suitable for editorial product use.",
  shelf:
    "A realistic shelf scene that places the product among compatible everyday items, with believable depth and lighting.",
  generic:
    "A clean, realistic lifestyle scene that places the product naturally inside a believable environment.",
};

function makeConcept(args: {
  index: number;
  sceneType: SceneType;
  conceptDescription: string;
  subjectMode: SubjectMode;
  styleMode: StyleMode;
}): PlannedConcept {
  const controls = baseControls({
    subjectMode: args.subjectMode,
    styleMode: args.styleMode,
  });
  const sceneOpener = SCENE_PROMPTS[args.sceneType];
  const augmented = args.conceptDescription
    ? `${sceneOpener} Concept context: ${args.conceptDescription}`
    : sceneOpener;
  return {
    id: `concept_${args.index}_${args.sceneType}`,
    title: SCENE_LABELS[args.sceneType],
    sceneType: args.sceneType,
    scenePrompt: augmented,
    styleMode: args.styleMode,
    subjectMode: args.subjectMode,
    recommendedControls: controls,
  };
}

export interface PlanShotsArgs {
  projectId: string;
  scope: OutputScope;
  subjectMode: SubjectMode;
  styleMode: StyleMode;
  conceptDescription: string;
  selectedPlatforms: PlatformTarget[];
  requestedConceptCount?: number;
  // Optional caller-supplied ratios. Otherwise derived from platforms.
  requestedAspectRatios?: OutputAspectRatio[];
}

export function planShots(args: PlanShotsArgs): ShotPlan {
  const interpreted: NormalizedConcept = interpretConcept({
    conceptDescription: args.conceptDescription,
    subjectMode: args.subjectMode,
    styleMode: args.styleMode,
  });

  let conceptCount = args.requestedConceptCount ?? 0;
  if (conceptCount <= 0) {
    if (args.scope === "single_image" || args.scope === "few_variations") conceptCount = 1;
    else if (args.scope === "multi_format_pack") conceptCount = 1;
    else if (args.scope === "multi_concept_pack") conceptCount = 3;
    else if (args.scope === "full_campaign_pack") conceptCount = 4;
    else conceptCount = 1;
  }
  conceptCount = Math.max(1, Math.min(6, conceptCount));

  // Pick distinct scene types up to the requested concept count.
  const candidatePool: SceneType[] = [...interpreted.hintedSceneTypes];
  // Top up the pool with a sane default fallback ordering.
  const fallback: SceneType[] =
    args.styleMode === "studio"
      ? ["studio_white", "studio_tabletop", "flat_lay", "shelf", "desk"]
      : ["cafe", "desk", "bathroom", "kitchen", "bedroom", "outdoor"];
  for (const f of fallback) {
    if (!candidatePool.includes(f)) candidatePool.push(f);
  }
  const chosen = candidatePool.slice(0, conceptCount);

  const concepts: PlannedConcept[] = chosen.map((sceneType, idx) =>
    makeConcept({
      index: idx,
      sceneType,
      conceptDescription: args.conceptDescription,
      subjectMode: args.subjectMode,
      styleMode: args.styleMode,
    })
  );

  const notes: string[] = [];
  if (args.subjectMode === "product_only") {
    notes.push("Subject mode is product_only — no model will be required.");
  }
  notes.push(`Plan: ${interpreted.summary}`);

  return {
    projectId: args.projectId,
    scope: args.scope,
    concepts,
    notes,
  };
}

// Estimator: how many final images will this plan produce, given a ratio plan?
export function estimatePackOutputs(args: {
  shotPlan: ShotPlan;
  ratios: OutputAspectRatio[];
  variationsPerRatio?: number;
}): number {
  const v = Math.max(1, args.variationsPerRatio ?? 1);
  const r = Math.max(1, args.ratios.length);
  const c = Math.max(1, args.shotPlan.concepts.length);
  return c * r * v;
}
