"""Build the production prompt sent to the image model.

The user only provides a short scene description. This module expands it
into a structured, opinionated prompt that emphasizes identity
preservation, product fidelity, and creator-style realism while
explicitly listing the failure modes we want the model to avoid.
"""
from __future__ import annotations

from textwrap import dedent

from .schemas import AspectRatio, Quality, UgcTier


_LENS_BY_USAGE = {
    "Instagram post": "35mm",
    "Instagram story": "28mm",
    "TikTok": "28mm",
    "YouTube thumbnail": "50mm",
}

_TIER_DIRECTIVES = {
    UgcTier.RAW: dedent(
        """\
        - Tone: raw, unfiltered, phone-shot, casual creator selfie energy.
        - Light imperfections allowed: slight motion, candid framing, natural skin shine.
        - Avoid any retouching or studio polish."""
    ),
    UgcTier.POLISHED: dedent(
        """\
        - Tone: polished UGC, careful framing, intentional but still authentic creator look.
        - Skin retains natural texture; minor cleanup only.
        - No magazine-style retouching."""
    ),
    UgcTier.PREMIUM: dedent(
        """\
        - Tone: premium UGC, brand-collab quality while remaining creator-shot in feel.
        - Clean composition, intentional lighting, but the result must still read as
          human-shot UGC and not a studio ad.
        - Avoid heavy retouching or commercial gloss."""
    ),
}

_QUALITY_HINTS = {
    Quality.LOW: "Reasonable detail, prioritize speed.",
    Quality.MEDIUM: "Solid detail, balanced rendering.",
    Quality.HIGH: "Maximum detail in eyes, hair, skin texture, fabric weave, and product labels.",
}


def _aspect_ratio_directive(aspect: AspectRatio) -> str:
    mapping = {
        AspectRatio.SQUARE: "Square 1:1 framing suitable for a feed post.",
        AspectRatio.PORTRAIT_4_5: "Vertical 4:5 framing optimized for an Instagram post.",
        AspectRatio.PORTRAIT_9_16: "Tall 9:16 framing optimized for Stories / Reels / TikTok.",
        AspectRatio.LANDSCAPE_16_9: "Wide 16:9 framing suitable for a thumbnail or hero crop.",
    }
    return mapping[aspect]


def build_prompt(
    *,
    scene: str,
    aspect_ratio: AspectRatio = AspectRatio.PORTRAIT_4_5,
    ugc_tier: UgcTier = UgcTier.POLISHED,
    quality: Quality = Quality.HIGH,
    usage: str = "Instagram post",
) -> str:
    """Assemble the structured prompt for GPT Image 2.

    The 10-section structure mirrors the spec:
      1. image goal
      2. model reference preservation
      3. product reference preservation
      4. scene description
      5. composition
      6. camera / lens direction
      7. lighting
      8. realism requirements
      9. UGC authenticity cues
     10. avoid list
    """
    cleaned_scene = (scene or "").strip()
    if not cleaned_scene:
        cleaned_scene = (
            "The model holds the product naturally, soft daylight from a nearby window, "
            "casual indoor setting."
        )

    lens = _LENS_BY_USAGE.get(usage, "35mm")
    tier_block = _TIER_DIRECTIVES[ugc_tier]
    quality_hint = _QUALITY_HINTS[quality]
    aspect_directive = _aspect_ratio_directive(aspect_ratio)

    prompt = dedent(
        f"""\
        # 1. Image goal
        Produce a hyperrealistic, believable influencer-style UGC product photo
        for use as a {usage}. The image must look like it was captured by a real
        creator with their phone, not like a glossy commercial ad.

        # 2. Model reference preservation
        Use the EXACT SAME PERSON shown in the model reference image.
        - Preserve face shape, eye color and shape, eyebrows, nose, lips,
          jawline, ears, hairline, hair color, hair texture, and skin tone.
        - Preserve any distinctive features (freckles, moles, dimples,
          piercings, tattoos) exactly as in the reference.
        - Do not age, slim, beautify, or stylize the model.
        - Do not blend with other faces. This is a one-to-one identity match.

        # 3. Product reference preservation
        Use the EXACT SAME PRODUCT shown in the product reference image.
        - Preserve overall shape, proportions, materials, finish, and color.
        - Preserve packaging layout, label structure, and the visible branding
          arrangement.
        - Do not redesign the label, do not invent text, do not translate or
          rewrite any wording, and do not move or recolor logos.
        - If any text on the packaging is unreadable in the reference, render
          it as a faithful, plausible blur rather than fabricating new words.

        # 4. Scene description
        {cleaned_scene}

        # 5. Composition
        - {aspect_directive}
        - The model and the product should both be clearly visible and feel
          part of the same physical scene.
        - The product is held or interacted with naturally — not floating,
          not pasted on, not isolated from the model's hands or environment.
        - Leave breathing room appropriate to the framing; do not crop the
          product label.

        # 6. Camera / lens direction
        - Lens feel: {lens} equivalent on a modern smartphone camera.
        - Natural perspective, slight imperfection in framing allowed.
        - Shallow but not extreme depth of field; the product label should
          remain legible.

        # 7. Lighting
        - Real-world, motivated lighting consistent with the described scene
          (e.g. window light, ceiling light, golden hour).
        - Coherent shadows on the model, the product, and the surrounding
          surfaces — all light sources must agree.
        - Natural color temperature; avoid neon, studio strobes, or ring-light
          catchlights unless the scene explicitly calls for them.

        # 8. Realism requirements
        - Natural skin texture with visible pores, subtle imperfections,
          believable subsurface scattering. No plastic skin, no airbrushing.
        - Anatomically correct hands with five fingers, realistic nails,
          believable grip pressure where fingers touch the product.
        - Hair has individual strand detail and reacts to the lighting.
        - Eyes have natural catchlights and moisture; irises stay consistent
          with the reference.
        - {quality_hint}

        # 9. UGC authenticity cues
        {tier_block}
        - The image should feel SHOT, not RENDERED.
        - Slight environmental clutter is welcome where appropriate (a real
          bathroom shelf, a real kitchen counter, a real desk) — not a sterile
          studio backdrop unless the scene asks for one.

        # 10. Avoid list
        Strictly avoid all of the following:
        - Plastic / waxy / over-smoothed skin.
        - Generic "AI influencer" aesthetic, uncanny symmetry, doll-like features.
        - Floating product, product pasted on top of the scene, mismatched
          lighting between the product and the model.
        - Distorted, missing, or extra fingers; melted hands; warped wrists.
        - Altered branding, redrawn logos, fabricated label text, mistranslated
          packaging, or invented product names.
        - Over-produced glossy magazine-ad style, studio softbox look, beauty
          retouching, skin smoothing filters.
        - Watermarks, captions, UI overlays, or text artifacts inside the image.
        """
    ).strip()

    return prompt
