// ============================================================================
// wardrobe-swap-block.ts
// When the product is wearable apparel AND the subject mode is "with model",
// the image-edit pipeline gets confused: the model reference photo shows the
// model wearing HER existing clothing, and the product reference shows the
// new garment in isolation. Without explicit instruction, the model usually
// either (a) collages both inputs into one frame, or (b) keeps the model in
// her original outfit and ignores the product entirely.
//
// This block forces a wardrobe swap: the model's identity is preserved
// (face, hair, body, pose intent) but her clothing in the reference is
// explicitly NOT preserved — the product replaces it.
//
// Triggered by a heuristic on product category + name + description. False
// positives are cheap (the block just reinforces "model wears product");
// false negatives are expensive (the user gets a collage).
// ============================================================================

import type {
  ProductCategoryHint,
  ProductContext,
} from "@/lib/services/generation/payload-schema";

// Keywords that strongly imply the product is wearable apparel or accessory.
// Anything matching these in the product name OR description triggers the
// wardrobe-swap block.
const APPAREL_KEYWORDS = [
  // tops
  "shirt", "blouse", "t-shirt", "tee", "top", "tank", "polo", "sweater",
  "cardigan", "hoodie", "sweatshirt", "pullover", "jumper", "tunic", "crop",
  // outerwear
  "jacket", "coat", "blazer", "parka", "vest", "trench", "puffer", "windbreaker",
  // bottoms
  "pants", "trousers", "jeans", "shorts", "skirt", "leggings", "joggers", "chinos",
  // dresses
  "dress", "gown", "kaftan", "jumpsuit", "romper", "bodysuit",
  // underwear / loungewear / activewear
  "lingerie", "bra", "underwear", "pajamas", "robe", "loungewear",
  "swimwear", "swimsuit", "bikini", "activewear", "sportswear", "leotard",
  // footwear (still wearable, swap heuristic applies to "on the model")
  "shoes", "sneakers", "boots", "heels", "sandals", "loafers", "trainers",
  // accessories that go ON the body
  "hat", "cap", "beanie", "scarf", "gloves", "belt", "tie", "bowtie",
  "sunglasses", "glasses", "watch", "necklace", "bracelet", "earrings", "ring",
  "bag", "handbag", "backpack", "purse", "tote",
];

const APPAREL_CATEGORIES: ReadonlySet<ProductCategoryHint> = new Set<ProductCategoryHint>([
  "fashion_accessories",
]);

export function detectIsApparel(args: {
  category: ProductCategoryHint;
  product: ProductContext;
}): boolean {
  if (APPAREL_CATEGORIES.has(args.category)) return true;
  const haystack = [
    args.product.name,
    args.product.description ?? "",
    args.product.brandName ?? "",
  ]
    .join(" ")
    .toLowerCase();
  return APPAREL_KEYWORDS.some((kw) => {
    // word-boundary-ish match so "shirt" doesn't match "shirtwaister"... but
    // also so "long-sleeve shirt" still hits.
    const re = new RegExp(`\\b${kw}\\b`, "i");
    return re.test(haystack);
  });
}

export function buildWardrobeSwapBlock(args: {
  product: ProductContext;
}): string {
  const productLabel = args.product.brandName
    ? `${args.product.brandName} ${args.product.name}`
    : args.product.name;
  return [
    "WARDROBE — CRITICAL:",
    `- The product (${productLabel}) is an item of clothing or a wearable accessory.`,
    "- In the final image, the model MUST be wearing the product.",
    "- The clothing the model is wearing in the human reference images is NOT to be preserved. It exists in the reference only to identify the person, not the outfit.",
    "- Replace the model's reference outfit with the product. Do not keep, layer, or partially show the original outfit.",
    "- The product must appear correctly fitted on the model's body — proper drape, sleeve length, neckline, hem, and closure.",
    "- Match the product's exact color, fabric, sheen, pattern, button placement, collar style, and other visible design details to the product reference images.",
    "- Show the garment from a flattering, naturally-photographed angle on a real person — not laid flat, not on a hanger, not floating beside the model.",
  ].join("\n");
}
