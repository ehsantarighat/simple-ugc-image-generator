"""Unit tests for prompt construction."""
from app.prompt_builder import build_prompt
from app.schemas import AspectRatio, Quality, UgcTier


def test_build_prompt_includes_scene_and_all_sections() -> None:
    scene = "A bright morning bathroom, the model holding the serum near her face."
    prompt = build_prompt(
        scene=scene,
        aspect_ratio=AspectRatio.PORTRAIT_4_5,
        ugc_tier=UgcTier.POLISHED,
        quality=Quality.HIGH,
        usage="Instagram post",
    )

    # The scene description must be preserved verbatim.
    assert scene in prompt

    # All ten structured sections must be present.
    for header in (
        "# 1. Image goal",
        "# 2. Model reference preservation",
        "# 3. Product reference preservation",
        "# 4. Scene description",
        "# 5. Composition",
        "# 6. Camera / lens direction",
        "# 7. Lighting",
        "# 8. Realism requirements",
        "# 9. UGC authenticity cues",
        "# 10. Avoid list",
    ):
        assert header in prompt, f"missing section: {header}"

    # Realism cues we promised.
    assert "EXACT SAME PERSON" in prompt
    assert "EXACT SAME PRODUCT" in prompt
    assert "plastic" in prompt.lower()
    assert "distorted" in prompt.lower()


def test_build_prompt_handles_empty_scene_with_fallback() -> None:
    prompt = build_prompt(scene="   ")
    assert "model holds the product" in prompt.lower()


def test_build_prompt_changes_with_tier() -> None:
    raw = build_prompt(scene="x", ugc_tier=UgcTier.RAW)
    premium = build_prompt(scene="x", ugc_tier=UgcTier.PREMIUM)
    assert raw != premium
    assert "raw" in raw.lower()
    assert "premium" in premium.lower()
