// ============================================================================
// scenario-templates.ts
// Curated recipe library. Each recipe has a prompt + recommended controls
// that the user can apply to Studio in one click. Grouped by product
// category so the Playbook page can filter and the Studio empty-state can
// offer category-aware suggestions.
//
// Adding a recipe:
//   1. Pick the right `category` so it shows under the right Playbook tab.
//   2. Write a concrete `scenePrompt` — location + action + product
//      interaction + light/mood. Avoid generic "make a beautiful image."
//   3. Set `recommendedControls` thoughtfully — these autofill in Studio.
//   4. Add `tags` for search/filtering (lowercase, hyphen-separated).
// ============================================================================

import type { PhotographyControls } from "@/types";

export type ScenarioCategory =
  | "apparel"
  | "beauty"
  | "food_beverage"
  | "electronics"
  | "home_lifestyle"
  | "fitness"
  | "general_ugc";

export interface ScenarioTemplate {
  id: string;
  title: string;
  category: ScenarioCategory;
  /** One-line summary shown on recipe cards. */
  summary: string;
  /** The actual prompt the user copies into Studio. */
  scenePrompt: string;
  recommendedControls: Omit<PhotographyControls, "numberOfVariations">;
  /** Free-form tags for filtering/search. */
  tags?: string[];
  /** Optional: explicit subject-mode hint. Defaults to "product_with_model"
   *  except for the few flat-lay / product-only recipes. */
  subjectMode?: "product_only" | "product_with_model";
}

export const CATEGORY_LABELS: Record<ScenarioCategory, string> = {
  apparel: "Apparel & Fashion",
  beauty: "Beauty & Skincare",
  food_beverage: "Food & Beverage",
  electronics: "Electronics & Tech",
  home_lifestyle: "Home & Lifestyle",
  fitness: "Fitness & Wellness",
  general_ugc: "General UGC",
};

export const CATEGORY_BLURBS: Record<ScenarioCategory, string> = {
  apparel:
    "Use these when the product is wearable. The wardrobe-swap rule kicks in automatically — your model will appear wearing the product, not the outfit in her reference photo.",
  beauty:
    "Skincare, cosmetics, fragrance. Close-ups and near-face shots dominate. Soft daylight outperforms studio strobes for authenticity.",
  food_beverage:
    "Drinks, snacks, packaged food. Table-top and in-hand work best — never put food on a model's face.",
  electronics:
    "Gadgets and tech. Avoid generic 'tech office' clichés; ground each shot in a real activity (working, traveling, gaming).",
  home_lifestyle:
    "Décor, kitchenware, organization. The product needs to feel *placed* in a real room, not floating in studio negative space.",
  fitness:
    "Activewear, supplements, equipment. Energy + lighting matter more than perfect posing.",
  general_ugc:
    "Mode-agnostic templates that work across many product types. Start here when nothing else fits.",
};

export const SCENARIO_TEMPLATES: ScenarioTemplate[] = [
  // ==========================================================================
  // APPAREL & FASHION (5)
  // ==========================================================================
  {
    id: "apparel_mirror_selfie",
    title: "Mirror selfie outfit reveal",
    category: "apparel",
    summary: "Phone-shot mirror selfie showing the model wearing the product.",
    scenePrompt:
      "A natural smartphone mirror selfie in a softly-lit bedroom or dressing area. The model is wearing the product as her main outfit and casually angles her phone toward a full-length mirror, glancing at the camera. The framing feels like real influencer content — slight grain, candid pose, believable bedroom or hallway background.",
    recommendedControls: {
      shotType: "mirror_selfie",
      cameraAngle: "handheld_selfie",
      lensType: "smartphone_wide",
      framing: "waist_up",
      lighting: "warm_indoor",
      authenticityLevel: "natural_influencer",
      productProminence: "hero",
      outputAspectRatio: "9:16",
    },
    tags: ["selfie", "instagram-story", "tiktok"],
  },
  {
    id: "apparel_street_style",
    title: "Street style on-the-go",
    category: "apparel",
    summary: "Candid sidewalk shot, model wearing the product, urban background.",
    scenePrompt:
      "A candid street-style photograph of the model walking on an urban sidewalk in late afternoon golden hour. She is wearing the product as her main piece of clothing. The pose is mid-stride, glancing slightly off-camera. Soft city bokeh in the background — storefronts, blurred passersby, warm light. The image should feel like it was shot for a fashion editorial, but unposed.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "three_quarter",
      lensType: "50mm",
      framing: "medium_shot",
      lighting: "golden_hour",
      authenticityLevel: "branded_clean_ugc",
      productProminence: "hero",
      outputAspectRatio: "4:5",
    },
    tags: ["editorial", "golden-hour", "outdoor"],
  },
  {
    id: "apparel_cafe_outfit",
    title: "Café outfit moment",
    category: "apparel",
    summary: "Model seated in a bright café wearing the product, relaxed mood.",
    scenePrompt:
      "The model is seated at a small café table by a large window, wearing the product. She is mid-conversation, smiling softly, holding a coffee cup. Soft natural daylight fills the room. The framing emphasizes the product on her body without making it a hard-sell — like a casual lifestyle shot her friend would take of her.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "eye_level",
      lensType: "35mm",
      framing: "medium_shot",
      lighting: "soft_window_light",
      authenticityLevel: "natural_influencer",
      productProminence: "hero",
      outputAspectRatio: "4:5",
    },
    tags: ["café", "daylight", "lifestyle"],
  },
  {
    id: "apparel_studio_lookbook",
    title: "Studio lookbook portrait",
    category: "apparel",
    summary: "Clean neutral backdrop, polished light, brand-catalog feel.",
    scenePrompt:
      "A clean studio portrait of the model wearing the product against a neutral seamless backdrop (light gray or warm beige). She stands in a relaxed posture, hands at her sides or one hand at her waist. Lighting is soft and even, like a brand lookbook — no harsh shadows. The image should feel premium and editorial, suitable for ecommerce or campaign use.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "eye_level",
      lensType: "85mm",
      framing: "full_body",
      lighting: "studio_softbox",
      authenticityLevel: "branded_clean_ugc",
      productProminence: "hero",
      outputAspectRatio: "4:5",
    },
    tags: ["studio", "catalog", "ecommerce"],
  },
  {
    id: "apparel_flat_lay",
    title: "Flat-lay product styling",
    category: "apparel",
    summary: "Product laid flat on a styled surface — no model.",
    scenePrompt:
      "A clean flat-lay of the product laid on a soft neutral surface (linen, light wood, or matte stone). Subtle styling props nearby — a coffee mug, sunglasses, a pair of earrings — but the product is the clear focal point. Soft overhead daylight. The composition should feel like a curated Instagram post by a fashion creator.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "slight_top_angle",
      lensType: "50mm",
      framing: "medium_shot",
      lighting: "soft_window_light",
      authenticityLevel: "branded_clean_ugc",
      productProminence: "hero",
      outputAspectRatio: "1:1",
    },
    tags: ["flat-lay", "no-model", "styled"],
    subjectMode: "product_only",
  },

  // ==========================================================================
  // BEAUTY & SKINCARE (5)
  // ==========================================================================
  {
    id: "beauty_morning_routine",
    title: "Morning skincare routine",
    category: "beauty",
    summary: "Bright bathroom, model holding the product near her face.",
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
    tags: ["skincare", "bathroom", "routine"],
  },
  {
    id: "beauty_application_close",
    title: "Application close-up",
    category: "beauty",
    summary: "Tight macro shot of the model applying the product.",
    scenePrompt:
      "A tight close-up of the model gently applying the product to her cheek or hand. The framing is intimate, almost macro — visible skin texture, soft natural light from a window, slight depth-of-field falloff. The product label is clearly readable. The mood is calm and unhurried, like a tutorial moment paused mid-frame.",
    recommendedControls: {
      shotType: "product_near_face",
      cameraAngle: "eye_level",
      lensType: "85mm",
      framing: "close_up",
      lighting: "soft_window_light",
      authenticityLevel: "natural_influencer",
      productProminence: "hero",
      outputAspectRatio: "1:1",
    },
    tags: ["close-up", "macro", "skincare"],
  },
  {
    id: "beauty_vanity_styled",
    title: "Vanity table styled scene",
    category: "beauty",
    summary: "Product placed on a styled vanity with mirror + accessories.",
    scenePrompt:
      "A styled vanity table scene with the product as the hero. Surrounding objects include a small flower stem, a folded linen towel, a tortoiseshell hair clip, and one or two other beauty essentials in the background, slightly out of focus. Warm morning light falls across the surface. The mood is calm, aspirational, magazine-editorial. No human model is present.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "slight_top_angle",
      lensType: "50mm",
      framing: "medium_shot",
      lighting: "soft_window_light",
      authenticityLevel: "branded_clean_ugc",
      productProminence: "hero",
      outputAspectRatio: "4:5",
    },
    tags: ["vanity", "styled", "no-model"],
    subjectMode: "product_only",
  },
  {
    id: "beauty_packshot_minimal",
    title: "Minimal packshot",
    category: "beauty",
    summary: "Ultra-clean studio shot — packaging hero on neutral background.",
    scenePrompt:
      "A clean, minimal product packshot of the beauty product on a soft neutral background (warm beige or pale stone). The product is the only subject — no model, no extra props. Light is even and shadow-soft, with one subtle accent highlight to define the bottle's edge. The mood is premium and minimalist, like a luxury brand ecommerce hero.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "eye_level",
      lensType: "85mm",
      framing: "close_up",
      lighting: "studio_softbox",
      authenticityLevel: "branded_clean_ugc",
      productProminence: "hero",
      outputAspectRatio: "1:1",
    },
    tags: ["packshot", "minimal", "ecommerce", "no-model"],
    subjectMode: "product_only",
  },
  {
    id: "beauty_get_ready_with_me",
    title: "Get-ready-with-me selfie",
    category: "beauty",
    summary: "Phone-style selfie, model mid-routine, product visible.",
    scenePrompt:
      "A handheld smartphone selfie of the model in her bathroom or vanity area, holding the product up to the camera while glancing at her own reflection. Light is warm and indoor — bathroom vanity bulbs, maybe a window. The image should feel exactly like a 'GRWM' post — slightly imperfect framing, casual energy, real skin texture.",
    recommendedControls: {
      shotType: "mirror_selfie",
      cameraAngle: "handheld_selfie",
      lensType: "smartphone_wide",
      framing: "medium_close_up",
      lighting: "warm_indoor",
      authenticityLevel: "natural_influencer",
      productProminence: "balanced",
      outputAspectRatio: "9:16",
    },
    tags: ["grwm", "selfie", "tiktok"],
  },

  // ==========================================================================
  // FOOD & BEVERAGE (4)
  // ==========================================================================
  {
    id: "food_table_top_styled",
    title: "Table-top styled shot",
    category: "food_beverage",
    summary: "Overhead styled shot of the product surrounded by props.",
    scenePrompt:
      "A styled overhead table-top scene featuring the product as the centerpiece. Around it are tasteful props that complement the category — fresh ingredients, a linen napkin, a wooden spoon, a small ceramic plate. Soft daylight from above-left creates natural shadows. Composition is balanced and Pinterest-worthy. No model is present.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "top_down",
      lensType: "50mm",
      framing: "medium_shot",
      lighting: "soft_window_light",
      authenticityLevel: "branded_clean_ugc",
      productProminence: "hero",
      outputAspectRatio: "4:5",
    },
    tags: ["flat-lay", "table-top", "no-model"],
    subjectMode: "product_only",
  },
  {
    id: "food_in_hand_cheers",
    title: "In-hand cheers moment",
    category: "food_beverage",
    summary: "Model holds the product up in a celebratory casual pose.",
    scenePrompt:
      "The model holds the product (a drink, can, bottle, or snack) up toward the camera as if in a cheerful toast or 'try this' gesture. She is in a casual lifestyle setting — backyard, balcony, or sunny kitchen. Natural smile, eye contact with camera. Warm afternoon light. The image should feel like a friend recommending something delicious.",
    recommendedControls: {
      shotType: "product_in_hand",
      cameraAngle: "eye_level",
      lensType: "35mm",
      framing: "medium_close_up",
      lighting: "warm_indoor",
      authenticityLevel: "natural_influencer",
      productProminence: "hero",
      outputAspectRatio: "4:5",
    },
    tags: ["lifestyle", "drink", "cheers"],
  },
  {
    id: "food_cafe_morning",
    title: "Café morning routine",
    category: "food_beverage",
    summary: "Bright café table with the product as part of a morning scene.",
    scenePrompt:
      "A bright café table scene with the product placed naturally among morning items — a notebook, a phone, a pastry on a small plate. Soft window light streams in from the side. The model's hand is in frame, resting on the table near the product. Mood is calm, slow-morning. Background is softly blurred — typical café interior, warm wood tones.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "slight_top_angle",
      lensType: "35mm",
      framing: "medium_shot",
      lighting: "soft_window_light",
      authenticityLevel: "natural_influencer",
      productProminence: "balanced",
      outputAspectRatio: "4:5",
    },
    tags: ["café", "morning", "ambient"],
  },
  {
    id: "food_pour_action",
    title: "Pour action shot",
    category: "food_beverage",
    summary: "Mid-pour moment, liquid in motion, dramatic and appetizing.",
    scenePrompt:
      "An action shot capturing the moment the beverage is being poured from the product into a clear glass. The liquid arcs naturally and catches the light. Background is softly out of focus — a clean kitchen counter or wooden bar. Side lighting creates appetizing highlights on the glass. The scene is real-feeling, not over-stylized.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "eye_level",
      lensType: "50mm",
      framing: "medium_shot",
      lighting: "warm_indoor",
      authenticityLevel: "branded_clean_ugc",
      productProminence: "hero",
      outputAspectRatio: "1:1",
    },
    tags: ["action", "pour", "appetizing"],
    subjectMode: "product_only",
  },

  // ==========================================================================
  // ELECTRONICS & TECH (4)
  // ==========================================================================
  {
    id: "tech_desk_setup",
    title: "Desk setup in use",
    category: "electronics",
    summary: "Model using the product at a well-styled creator desk.",
    scenePrompt:
      "A realistic work-from-home or creative desk scene. The model is naturally using or showing the product within the workspace. The photo should feel like modern creator content, clean but not sterile. The product must remain visually accurate and clearly present. Background includes a notebook, a plant, and ambient daylight from a side window.",
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
    tags: ["desk", "wfh", "creator"],
  },
  {
    id: "tech_in_hand_demo",
    title: "In-hand product demo",
    category: "electronics",
    summary: "Model holding the product up, showing it to camera.",
    scenePrompt:
      "The model holds the product up toward the camera in both hands as if demonstrating it. The background is a clean, modern interior with soft daylight — living room, kitchen counter, or home office. The product is clearly readable and centered. The mood is enthusiastic but not aggressive — like an honest creator first-impressions video paused mid-frame.",
    recommendedControls: {
      shotType: "product_in_hand",
      cameraAngle: "eye_level",
      lensType: "50mm",
      framing: "medium_close_up",
      lighting: "warm_indoor",
      authenticityLevel: "natural_influencer",
      productProminence: "hero",
      outputAspectRatio: "1:1",
    },
    tags: ["demo", "unboxing", "first-impressions"],
  },
  {
    id: "tech_packshot",
    title: "Hero packshot",
    category: "electronics",
    summary: "Clean studio shot of the device on a neutral background.",
    scenePrompt:
      "A clean studio packshot of the tech product on a neutral light gray seamless background. The device sits at a slight three-quarter angle to show its form factor. Lighting is soft and even with one accent rim light to define the edges. The composition is centered with generous negative space — ideal for ecommerce hero use.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "three_quarter",
      lensType: "85mm",
      framing: "medium_shot",
      lighting: "studio_softbox",
      authenticityLevel: "branded_clean_ugc",
      productProminence: "hero",
      outputAspectRatio: "1:1",
    },
    tags: ["packshot", "studio", "ecommerce", "no-model"],
    subjectMode: "product_only",
  },
  {
    id: "tech_lifestyle_use",
    title: "In-context lifestyle use",
    category: "electronics",
    summary: "Model using the product in a real environment, naturally.",
    scenePrompt:
      "The model is actively using the product in a believable everyday environment — listening to headphones on a couch, working on a laptop in a café, taking a photo with the device on a walk. The framing captures both the model's action and the product clearly. Lighting is natural and matches the location.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "eye_level",
      lensType: "35mm",
      framing: "medium_shot",
      lighting: "soft_window_light",
      authenticityLevel: "natural_influencer",
      productProminence: "balanced",
      outputAspectRatio: "4:5",
    },
    tags: ["lifestyle", "in-use", "natural"],
  },

  // ==========================================================================
  // HOME & LIFESTYLE (4)
  // ==========================================================================
  {
    id: "home_in_room_placement",
    title: "Product in a real room",
    category: "home_lifestyle",
    summary: "Product placed naturally within a styled interior.",
    scenePrompt:
      "A wide interior shot featuring the product placed naturally within a styled living space — on a coffee table, shelf, or sideboard. The room has warm modern décor: light wood, soft textiles, a few plants. Late afternoon sunlight casts long natural shadows. The product is the focal point but feels lived-in, not staged.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "eye_level",
      lensType: "35mm",
      framing: "wide_shot",
      lighting: "soft_window_light",
      authenticityLevel: "branded_clean_ugc",
      productProminence: "balanced",
      outputAspectRatio: "16:9",
    },
    tags: ["interior", "lifestyle", "ambient", "no-model"],
    subjectMode: "product_only",
  },
  {
    id: "home_hands_only",
    title: "Hands-only interaction",
    category: "home_lifestyle",
    summary: "Just the model's hands holding or using the product.",
    scenePrompt:
      "A close-up of just the model's hands interacting with the product — holding, opening, pouring, arranging. The model's face is not in frame. The background is a warm wooden table or soft fabric surface. Side lighting emphasizes texture. The mood is calm, ASMR-adjacent, the kind of shot that opens a tutorial reel.",
    recommendedControls: {
      shotType: "product_in_hand",
      cameraAngle: "slight_top_angle",
      lensType: "50mm",
      framing: "close_up",
      lighting: "soft_window_light",
      authenticityLevel: "natural_influencer",
      productProminence: "hero",
      outputAspectRatio: "1:1",
    },
    tags: ["hands", "close-up", "asmr"],
  },
  {
    id: "home_kitchen_use",
    title: "Kitchen-use moment",
    category: "home_lifestyle",
    summary: "Model using the product in a real bright kitchen.",
    scenePrompt:
      "The model is actively using the product in a real modern kitchen — at the counter, near the stove, or by a window. Soft daylight, plants on the sill, a couple of natural ingredients out on the counter. The pose is mid-action, candid, not posed. The product is clearly visible and central to the moment.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "eye_level",
      lensType: "35mm",
      framing: "medium_shot",
      lighting: "soft_window_light",
      authenticityLevel: "natural_influencer",
      productProminence: "balanced",
      outputAspectRatio: "4:5",
    },
    tags: ["kitchen", "in-use", "candid"],
  },
  {
    id: "home_flat_lay_curated",
    title: "Curated lifestyle flat-lay",
    category: "home_lifestyle",
    summary: "Overhead arrangement of the product + complementary objects.",
    scenePrompt:
      "An overhead flat-lay of the product surrounded by carefully chosen lifestyle objects — a coffee mug, a notebook, eyeglasses, a small plant, a folded scarf. The surface is a warm natural wood or linen. Soft natural light from above-left. The composition feels curated but breathable, with room around the product. Pinterest-aesthetic.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "top_down",
      lensType: "50mm",
      framing: "medium_shot",
      lighting: "soft_window_light",
      authenticityLevel: "branded_clean_ugc",
      productProminence: "hero",
      outputAspectRatio: "1:1",
    },
    tags: ["flat-lay", "pinterest", "no-model"],
    subjectMode: "product_only",
  },

  // ==========================================================================
  // FITNESS & WELLNESS (3)
  // ==========================================================================
  {
    id: "fitness_post_workout",
    title: "Post-workout candid",
    category: "fitness",
    summary: "Model just-finished-working-out, holding the product.",
    scenePrompt:
      "A believable post-workout lifestyle image in a gym or fitness environment. The model naturally holds or uses the product in a way that feels connected to a personal creator recommendation. Slight glow on the skin from exertion. Natural light from the gym's overhead windows. The scene should feel energetic but real, with natural body language.",
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
    tags: ["gym", "post-workout", "candid"],
  },
  {
    id: "fitness_outdoor_run",
    title: "Outdoor activewear shot",
    category: "fitness",
    summary: "Model running or stretching outdoors wearing the product.",
    scenePrompt:
      "The model is captured mid-stretch or mid-pause during an outdoor run — park path, beach trail, or quiet city street. She is wearing the product as her active gear. Early morning soft light, slight haze in the background. The framing feels editorial yet candid, like a brand campaign shot in real conditions.",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "three_quarter",
      lensType: "50mm",
      framing: "full_body",
      lighting: "golden_hour",
      authenticityLevel: "branded_clean_ugc",
      productProminence: "hero",
      outputAspectRatio: "4:5",
    },
    tags: ["outdoor", "activewear", "editorial"],
  },
  {
    id: "fitness_in_hand_supplement",
    title: "In-hand supplement shot",
    category: "fitness",
    summary: "Tight in-hand shot of supplement or wellness product.",
    scenePrompt:
      "A clean, well-lit shot of the model holding the wellness product in one hand, with the other hand visible — perhaps scooping powder, opening a cap, or pouring. The background is a bright kitchen or gym corner, softly out of focus. The product label is fully readable. The mood is healthy, intentional, no-nonsense.",
    recommendedControls: {
      shotType: "product_in_hand",
      cameraAngle: "eye_level",
      lensType: "50mm",
      framing: "medium_close_up",
      lighting: "soft_window_light",
      authenticityLevel: "natural_influencer",
      productProminence: "hero",
      outputAspectRatio: "1:1",
    },
    tags: ["supplement", "wellness", "in-hand"],
  },

  // ==========================================================================
  // GENERAL UGC (5) — works across most product types
  // ==========================================================================
  {
    id: "general_three_quarter_portrait",
    title: "Three-quarter creator portrait",
    category: "general_ugc",
    summary: "Classic UGC framing — model holding product, candid expression.",
    scenePrompt:
      "A three-quarter portrait of the model holding the product casually in front of her, glancing slightly to the side as if mid-sentence. The background is a softly-lit interior with warm tones. The framing is the classic creator-portrait look — natural, approachable, conversational. Soft daylight, slight depth-of-field.",
    recommendedControls: {
      shotType: "product_in_hand",
      cameraAngle: "three_quarter",
      lensType: "50mm",
      framing: "medium_shot",
      lighting: "warm_indoor",
      authenticityLevel: "natural_influencer",
      productProminence: "balanced",
      outputAspectRatio: "4:5",
    },
    tags: ["portrait", "creator", "approachable"],
  },
  {
    id: "general_user_review_pose",
    title: "User-review pose",
    category: "general_ugc",
    summary: "Model holding product up, eye contact, like a TikTok review.",
    scenePrompt:
      "A direct-to-camera shot of the model holding the product up beside her face, smiling and making eye contact. The framing is tight — head-and-shoulders. The background is a clean, casual interior. Lighting is soft and warm, like a smartphone-shot product review. The mood is genuine and conversational.",
    recommendedControls: {
      shotType: "product_near_face",
      cameraAngle: "eye_level",
      lensType: "smartphone_wide",
      framing: "medium_close_up",
      lighting: "warm_indoor",
      authenticityLevel: "natural_influencer",
      productProminence: "hero",
      outputAspectRatio: "9:16",
    },
    tags: ["tiktok", "review", "selfie"],
  },
  {
    id: "general_lifestyle_couch",
    title: "Cozy couch moment",
    category: "general_ugc",
    summary: "Model relaxed on a couch with the product nearby or in hand.",
    scenePrompt:
      "A cozy lifestyle scene with the model relaxed on a couch — soft throw blanket, plants, warm afternoon light through nearby windows. She holds the product in a natural relaxed way or has it on the side table within easy frame. The mood is slow, content, real. The kind of shot that says 'I actually use this every day.'",
    recommendedControls: {
      shotType: "candid_lifestyle",
      cameraAngle: "eye_level",
      lensType: "35mm",
      framing: "medium_shot",
      lighting: "warm_indoor",
      authenticityLevel: "natural_influencer",
      productProminence: "balanced",
      outputAspectRatio: "4:5",
    },
    tags: ["lifestyle", "cozy", "couch"],
  },
  {
    id: "general_minimalist_brand",
    title: "Minimalist brand portrait",
    category: "general_ugc",
    summary: "Polished editorial-style portrait, brand-shoot energy.",
    scenePrompt:
      "A polished editorial portrait of the model holding the product, against a soft warm neutral backdrop. The pose is composed and elegant — one hand near the product, eye contact with camera, calm expression. Light is studio-soft with one defined key. The mood is premium-brand campaign, the kind of image a luxury creator partnership would produce.",
    recommendedControls: {
      shotType: "product_in_hand",
      cameraAngle: "eye_level",
      lensType: "85mm",
      framing: "medium_close_up",
      lighting: "studio_softbox",
      authenticityLevel: "branded_clean_ugc",
      productProminence: "hero",
      outputAspectRatio: "4:5",
    },
    tags: ["editorial", "campaign", "premium"],
  },
  {
    id: "general_unboxing_moment",
    title: "Unboxing moment",
    category: "general_ugc",
    summary: "Model just opened the product, excited reaction, packaging visible.",
    scenePrompt:
      "A candid shot of the model just having opened the product packaging, holding the product in one hand and the packaging visible nearby. Excited but believable expression — small smile, eyes on the product. Background is a styled but real-feeling room — couch, dining table, or bed. Warm indoor light. The mood is the moment of a real first reaction.",
    recommendedControls: {
      shotType: "product_in_hand",
      cameraAngle: "eye_level",
      lensType: "35mm",
      framing: "medium_close_up",
      lighting: "warm_indoor",
      authenticityLevel: "natural_influencer",
      productProminence: "hero",
      outputAspectRatio: "4:5",
    },
    tags: ["unboxing", "reaction", "candid"],
  },
];

// ----------------------------------------------------------------------------
// Helpers used by the Playbook UI + Studio empty-state
// ----------------------------------------------------------------------------
export function scenariosByCategory(): Record<ScenarioCategory, ScenarioTemplate[]> {
  const byCat = {} as Record<ScenarioCategory, ScenarioTemplate[]>;
  for (const cat of Object.keys(CATEGORY_LABELS) as ScenarioCategory[]) {
    byCat[cat] = [];
  }
  for (const t of SCENARIO_TEMPLATES) {
    byCat[t.category].push(t);
  }
  return byCat;
}
