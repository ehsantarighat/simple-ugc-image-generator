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
    "WARDROBE — ABSOLUTE PRIORITY:",
    "",
    `The product (${productLabel}) is wearable clothing. The single requirement of this generation is: the model in the final image must be WEARING the product on her body.`,
    "",
    "REQUIRED COMPOSITION:",
    "- The product covers the appropriate part of the model's torso/body, as actual clothing.",
    "- Her arms go through the sleeves (if it has sleeves). It is buttoned, zipped, or draped on her body the way real clothing is worn.",
    "- The clothing she is wearing in the reference photos (whatever it is — cardigan, jacket, shirt, anything) is GONE. Replaced. Removed. Treat the reference outfit as if it never existed.",
    "- The product's color, fabric, pattern, collar, buttons, and stitching exactly match the product reference images.",
    "",
    "FAILURE MODES — these are wrong outputs that you must NOT produce:",
    "- ❌ The model holding the product in her hands (in front of her, beside her, on a foam board, on a hanger).",
    "- ❌ The model presenting or displaying the product as a separate item.",
    "- ❌ The product floating, hovering, or layered transparently over the model's existing outfit.",
    "- ❌ The model wearing her original reference outfit while the product appears anywhere else in the frame.",
    "- ❌ Any layout that shows the model and the product as two visually separate subjects.",
    "- ❌ A before-and-after, side-by-side, or comparison composition.",
    "",
    "Before treating the image as final, verify silently:",
    "1. Is the product ON the model's body, replacing her reference outfit? If no, the image is wrong.",
    "2. Is her reference outfit (any cardigan, jacket, or top from the reference photos) visible anywhere in the final image? If yes, the image is wrong — remove it.",
    "3. Is the product shown anywhere OTHER than worn on her body (e.g. in her hand, on a board, beside her)? If yes, the image is wrong.",
  ].join("\n");
}
