import type {
  ProductCategoryHint,
  ProductInteraction,
  PromptSafetyAndNegativeConstraints,
  ShotType,
} from "@/lib/services/generation/payload-schema";

const BASE_NEGATIVE_CONSTRAINTS: readonly string[] = [
  // Composition-shape failures (collage/grid) listed FIRST because they
  // are the most expensive failure mode — the whole image is unusable.
  "avoid producing a collage, grid, or panel of multiple images",
  "avoid showing the reference images alongside the generated subject",
  "avoid before/after, side-by-side, or comparison layouts",
  "avoid duplicating the model or the product within a single frame",
  // Realism / fidelity
  "avoid synthetic AI-art appearance",
  "avoid CGI or 3D render look",
  "avoid plastic or overly smoothed skin",
  "avoid mannequin-like facial stiffness",
  "avoid malformed hands",
  "avoid extra fingers",
  "avoid distorted anatomy",
  "avoid incorrect product geometry",
  "avoid packaging deformation",
  "avoid invented or substituted logos",
  "avoid adding random unreadable text",
  "avoid changing the product into a generic lookalike",
];

const CATEGORY_NEGATIVES: Record<ProductCategoryHint, readonly string[]> = {
  electronics_gadgets: [
    "avoid wrong camera arrangement on electronics",
    "avoid inventing extra buttons or controls",
    "avoid altering screen shape or aspect ratio",
  ],
  beauty_skincare: [
    "avoid fake flawless skin and over-smoothing",
    "avoid product cap or pump deformation",
  ],
  fashion_accessories: [
    "avoid warping brand marks, buckles, straps, or stitching",
    "avoid melting fabric folds or impossible material behavior",
  ],
  food_beverage: [
    "avoid melted, warped, or duplicated packaging",
    "avoid relocating the label or distorting the container neck",
  ],
  home_lifestyle: [
    "avoid turning the product into a generic decorative shape",
    "avoid implausible scale relative to the surrounding scene",
  ],
  unknown: [],
};

const INTERACTION_NEGATIVES: Record<ProductInteraction, readonly string[]> = {
  product_in_hand: [
    "avoid fused or duplicated fingers around the product",
    "avoid an impossible grip or floating product",
  ],
  product_near_face: [
    "avoid covering essential facial identity features",
  ],
  product_on_table: [
    "avoid missing or implausible contact shadow on the surface",
  ],
  product_being_used: [
    "avoid impossible or category-inappropriate usage",
  ],
  unspecified: [],
};

export function buildNegativeConstraintBlock(args: {
  flags: PromptSafetyAndNegativeConstraints;
  productCategory: ProductCategoryHint;
  productInteraction: ProductInteraction;
  shotType: ShotType;
}): string {
  const extras: string[] = [];
  extras.push(...CATEGORY_NEGATIVES[args.productCategory]);
  extras.push(...INTERACTION_NEGATIVES[args.productInteraction]);
  if (args.shotType === "mirror_selfie") {
    extras.push("avoid impossible reflection geometry");
    extras.push("avoid duplicated limbs in the reflection");
  }
  if (args.flags.extraNegativeConstraints) {
    extras.push(...args.flags.extraNegativeConstraints);
  }

  const list = [...BASE_NEGATIVE_CONSTRAINTS, ...extras].map((s) => `- ${s}`);
  return ["AVOID:", ...list].join("\n");
}
