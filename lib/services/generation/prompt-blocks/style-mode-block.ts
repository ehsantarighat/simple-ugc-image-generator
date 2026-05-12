// ============================================================================
// style-mode-block.ts
// Spec section 11.2 — style-mode prompt additions: studio / lifestyle / ugc / hybrid.
// ============================================================================

import type { StyleMode } from "@/lib/services/generation/payload-schema";

const STYLE_TEXT: Record<StyleMode, string> = {
  studio: [
    "STYLE MODE — STUDIO:",
    "- Treat this as a polished commercial product photograph captured in a real studio.",
    "- Intentional, controlled lighting with clear key/fill behavior and clean shadows.",
    "- Considered composition with strong product visibility and tidy framing.",
    "- Still photorealistic — never CGI, never a 3D render, never glossy AI gloss.",
    "- Suitable for ecommerce, catalog, or premium brand assets.",
  ].join("\n"),
  lifestyle: [
    "STYLE MODE — LIFESTYLE:",
    "- Place the product (and model, if present) inside a believable real-world environment.",
    "- Natural spatial context: visible surfaces, lived-in cues, plausible ambient lighting.",
    "- More polished than raw UGC, but never overproduced.",
    "- Suitable for brand social posts, web content, and editorial lifestyle imagery.",
  ].join("\n"),
  ugc: [
    "STYLE MODE — UGC / INFLUENCER:",
    "- The image should look like authentic creator-made content, not a brand ad.",
    "- Casual framing, candid moment, slight natural imperfection in pose or framing.",
    "- Believable smartphone / mirrorless camera capture, not studio-polished.",
    "- The product is integrated into a real moment; it must never feel like a paid placement.",
  ].join("\n"),
  hybrid: [
    "STYLE MODE — HYBRID:",
    "- Branded but believable. Professionally composed but socially native.",
    "- Slightly more refined than raw UGC, slightly less commercial than full studio.",
    "- Appropriate for campaign content that needs to feel real on feed.",
  ].join("\n"),
};

export function buildStyleModeBlock(style: StyleMode): string {
  return STYLE_TEXT[style];
}
