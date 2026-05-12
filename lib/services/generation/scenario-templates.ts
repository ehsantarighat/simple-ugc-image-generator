// ============================================================================
// scenario-templates.ts
// Spec section 16. Preset scenes the user can apply to populate the scene
// prompt and recommended photography controls in one click.
// ============================================================================

import type { PhotographyControls } from "@/types";

export interface ScenarioTemplate {
  id: string;
  title: string;
  scenePrompt: string;
  recommendedControls: Omit<PhotographyControls, "numberOfVariations">;
}

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  {
    id: "morning_skincare_routine",
    title: "Morning Skincare Routine",
    scenePrompt:
      "A realistic morning skincare scene in a bright apartment bathroom. The model holds the product near her face in a natural way, as if sharing a personal beauty routine with her audience. Soft daylight enters from the side. The scene should feel authentic and influencer-created, not like a studio ad.",
    recommendedControls: {
      shotType: "product_in_hand",
      cameraAngle: "eye_level",
      lensType: "35mm",
      framing: "medium_close_up",
      lighting: "bathroom_soft_light",
      authenticityLevel: "natural_influencer",
      productProminence: "balanced",
      outputAspectRatio: "4:5",
    },
  },
  {
    id: "cafe_lifestyle",
    title: "Café Lifestyle",
    scenePrompt:
      "A natural lifestyle image in a modern bright café. The model is seated at a table and casually interacting with the product, as if recommending it in a social post. The product should be clearly visible but naturally integrated into the moment. The photo should feel candid and believable.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "three_quarter",
      lensType: "35mm",
      framing: "medium_shot",
      lighting: "soft_window_light",
      authenticityLevel: "natural_influencer",
      productProminence: "balanced",
      outputAspectRatio: "4:5",
    },
  },
  {
    id: "mirror_selfie_fashion",
    title: "Mirror Selfie Fashion",
    scenePrompt:
      "A realistic mirror selfie in a stylish bedroom or dressing area. The model naturally showcases the product as part of her outfit or personal style. The image should look like genuine influencer content captured on a smartphone, with believable reflection and casual framing.",
    recommendedControls: {
      shotType: "mirror_selfie",
      cameraAngle: "handheld_selfie",
      lensType: "smartphone_wide",
      framing: "waist_up",
      lighting: "warm_indoor",
      authenticityLevel: "natural_influencer",
      productProminence: "balanced",
      outputAspectRatio: "9:16",
    },
  },
  {
    id: "desk_setup_tech",
    title: "Desk Setup",
    scenePrompt:
      "A realistic work-from-home or creative desk scene. The model is naturally using or showing the product within the workspace. The photo should feel like modern creator content, clean but not sterile. The product must remain visually accurate and clearly present.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "slight_top_angle",
      lensType: "35mm",
      framing: "medium_shot",
      lighting: "soft_window_light",
      authenticityLevel: "branded_clean_ugc",
      productProminence: "balanced",
      outputAspectRatio: "4:5",
    },
  },
  {
    id: "post_workout_fitness",
    title: "Post-Workout Fitness",
    scenePrompt:
      "A believable post-workout lifestyle image in a gym or fitness environment. The model naturally holds or uses the product in a way that feels connected to a personal creator recommendation. The scene should feel energetic but real, with natural body language and realistic lighting.",
    recommendedControls: {
      shotType: "product_in_hand",
      cameraAngle: "eye_level",
      lensType: "35mm",
      framing: "medium_shot",
      lighting: "warm_indoor",
      authenticityLevel: "natural_influencer",
      productProminence: "balanced",
      outputAspectRatio: "4:5",
    },
  },
];
