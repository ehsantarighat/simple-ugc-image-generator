import type {
  ProductContext,
  ProductPreservationRules,
} from "@/lib/services/generation/payload-schema";
import { buildProductCategoryEnhancement } from "@/lib/services/generation/product-category-enhancements";

export function buildProductPreservationBlock(args: {
  rules: ProductPreservationRules;
  product: ProductContext;
}): string {
  const lines: string[] = ["PRODUCT PRESERVATION:"];
  if (args.rules.preserveExactProduct) {
    lines.push(
      "- Use the product reference images as the exact product identity reference. Preserve the original product's form, proportions, colors, packaging, surface details, and visible brand marks as faithfully as possible."
    );
  }
  const detail: string[] = [];
  if (args.rules.preserveShape) detail.push("shape and proportions");
  if (args.rules.preserveDominantColors) detail.push("dominant colors");
  if (args.rules.preservePackaging) detail.push("packaging structure");
  if (args.rules.preserveLogoPlacement) detail.push("logo placement");
  if (args.rules.preserveReadableTextWhenPossible) detail.push("readable label text");
  if (detail.length > 0) {
    lines.push(`- Preserve: ${detail.join(", ")}.`);
  }
  if (args.rules.mustNotInventProductDetails) {
    lines.push(
      "- Do not invent labels, redesign packaging, or substitute the product for a generic lookalike."
    );
  }
  if (args.product.name) {
    const parts = [`product: ${args.product.name}`];
    if (args.product.brandName) parts.push(`brand: ${args.product.brandName}`);
    if (args.product.category) parts.push(`category: ${args.product.category}`);
    lines.push(`- Context — ${parts.join(", ")}.`);
  }
  if (args.product.description) {
    lines.push(`- Description: ${args.product.description}`);
  }
  if (args.product.preservationNotes) {
    lines.push(`- Must-preserve notes: ${args.product.preservationNotes}`);
  }
  if (args.rules.productCriticalFeatures && args.rules.productCriticalFeatures.length > 0) {
    lines.push(`- Critical features: ${args.rules.productCriticalFeatures.join("; ")}.`);
  }

  const enhancement = buildProductCategoryEnhancement(args.product.inferredCategory);
  if (enhancement) {
    lines.push("");
    lines.push(enhancement);
  }

  return lines.join("\n");
}
