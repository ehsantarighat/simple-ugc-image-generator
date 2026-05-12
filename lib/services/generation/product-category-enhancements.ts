// ============================================================================
// product-category-enhancements.ts
// Spec section 9. Category-specific prompt enhancements + classifier.
// ============================================================================

import type { ProductCategoryHint } from "@/lib/services/generation/payload-schema";

const ENHANCEMENT_TEXT: Record<ProductCategoryHint, string> = {
  beauty_skincare: [
    "The product should sit naturally in a skincare or beauty context.",
    "If held near the face, maintain a believable hand position and a natural product scale.",
    "Do not make the skin unrealistically flawless; keep pores and subtle natural skin variation visible.",
  ].join(" "),
  fashion_accessories: [
    "The item should be worn or held in a way that reflects real-life fashion usage.",
    "Preserve material behavior such as leather, fabric, metallic sheen, or stitching where visible.",
    "Avoid warping brand marks, buckles, straps, seams, or repeated patterns.",
  ].join(" "),
  food_beverage: [
    "The product should appear clean, appetizing, and physically plausible.",
    "Preserve packaging shape, label placement, and container structure.",
    "Avoid melted, warped, duplicated, or physically impossible packaging.",
  ].join(" "),
  electronics_gadgets: [
    "Preserve the product's geometry, button placement, camera positions, ports, and screen proportions where visible.",
    "Avoid inventing extra controls, extra lenses, or incorrect hardware details.",
  ].join(" "),
  home_lifestyle: [
    "The product should appear at a believable real-world scale within the environment.",
    "Preserve material feel, edges, and structure.",
    "Avoid turning the product into a generic decorative object.",
  ].join(" "),
  unknown: "",
};

export function buildProductCategoryEnhancement(category: ProductCategoryHint): string {
  return ENHANCEMENT_TEXT[category];
}

// Lightweight rule-based classifier. We try the user-typed `category` first;
// if absent, fall back to keyword matching on name+description.
export function inferProductCategory(args: {
  name: string;
  category?: string | null;
  description?: string | null;
}): ProductCategoryHint {
  const blob = [args.category ?? "", args.name, args.description ?? ""]
    .join(" ")
    .toLowerCase();

  const tests: Array<[ProductCategoryHint, RegExp]> = [
    [
      "beauty_skincare",
      /(serum|cream|lotion|cleanser|skincare|moistur|sunscreen|spf|lipstick|mascara|foundation|fragrance|perfume|cosmetic|toner|essence)/,
    ],
    [
      "food_beverage",
      /(snack|drink|beverage|coffee|tea|protein|bar|cookie|chocolate|granola|cereal|gummy|soda|water|wine|beer|kombucha|food|sauce)/,
    ],
    [
      "electronics_gadgets",
      /(phone|tablet|laptop|headphone|earbud|speaker|charger|cable|smart|wearable|watch|tv|monitor|router|drone|camera|console|gadget|gpu|cpu|microphone)/,
    ],
    [
      "fashion_accessories",
      /(shoe|sneaker|boot|jacket|coat|sweater|hoodie|t-?shirt|dress|jeans|pants|hat|bag|backpack|sunglass|wallet|belt|necklace|ring|earring|bracelet|watch strap)/,
    ],
    [
      "home_lifestyle",
      /(candle|diffuser|mug|plate|bowl|towel|blanket|pillow|lamp|planter|vase|frame|decor|furniture|kitchen|bath|home)/,
    ],
  ];

  for (const [hint, re] of tests) {
    if (re.test(blob)) return hint;
  }
  return "unknown";
}
