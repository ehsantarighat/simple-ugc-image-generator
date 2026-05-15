// ============================================================================
// product-reproduction-style-block.ts
// Spec section 19 — 10 style-specific prompt additions for Mode A.
// Each block returns a complete "PRODUCT PRESENTATION STYLE:" section ready to
// concatenate into the final product-reproduction prompt.
// ============================================================================

import type { ProductReproductionStyle } from "@/lib/services/generation/payload-schema";

const STYLE_BODY: Record<ProductReproductionStyle, string> = {
  studio_white_background:
    "Present the product in a clean, professional white-background studio setup. Maintain accurate shadows and realistic edge definition. The image should be suitable for catalogs, e-commerce, and marketplaces.",
  studio_colored_background:
    "Present the product against a controlled, elegant colored background that complements the product without overwhelming it. Maintain commercial studio realism and product clarity.",
  studio_tabletop:
    "Place the product on a polished tabletop surface with professional studio lighting, believable contact shadows, and carefully controlled reflections.",
  flat_lay:
    "Create a top-down flat-lay composition centered around the product. Maintain realistic spacing, believable object placement if props are present, and strict product fidelity.",
  catalog_premium:
    "Create a premium product advertisement-like image with refined lighting and commercial polish while keeping the product fully realistic and faithful to the reference.",
  lifestyle_product_only:
    "Place the product naturally into a believable everyday environment with no visible human model. The product should remain the visual anchor of the scene.",
  shelf_scene:
    "Place the product on a realistic shelf, cabinet, or display area in a way that feels natural, clean, and commercially usable.",
  desk_scene:
    "Place the product in a modern desk or work environment with believable scale, realistic contact with the surface, and clear product readability.",
  bathroom_scene:
    "Place the product in a believable bathroom or skincare setting. Preserve product scale, surface realism, and naturally diffused lighting.",
  minimal_brand_scene:
    "Create a minimal, modern, brand-forward composition with controlled negative space and polished realism, while preserving strict product fidelity.",
};

const STYLE_LABEL: Record<ProductReproductionStyle, string> = {
  studio_white_background: "Studio — white background",
  studio_colored_background: "Studio — colored background",
  studio_tabletop: "Studio tabletop",
  flat_lay: "Flat lay",
  catalog_premium: "Catalog premium",
  lifestyle_product_only: "Lifestyle (product only)",
  shelf_scene: "Shelf scene",
  desk_scene: "Desk scene",
  bathroom_scene: "Bathroom scene",
  minimal_brand_scene: "Minimal brand scene",
};

export function buildProductReproductionStyleBlock(
  style: ProductReproductionStyle
): string {
  return ["PRODUCT PRESENTATION STYLE:", STYLE_BODY[style]].join("\n");
}

export function productReproductionStyleLabel(
  style: ProductReproductionStyle
): string {
  return STYLE_LABEL[style];
}

export { STYLE_LABEL as PRODUCT_REPRODUCTION_STYLE_LABELS };
