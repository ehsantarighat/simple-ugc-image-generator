// ============================================================================
// /playbook
// The user's "bible" — a curated reference for how to get great images out
// of the platform. Server-rendered for fast first paint; the recipe grid +
// copy interactions are delegated to the PlaybookContent client component.
// ============================================================================

import { PageHeader } from "@/components/shared/page-header";
import { PlaybookContent } from "@/components/playbook/playbook-content";
import {
  SCENARIO_TEMPLATES,
  CATEGORY_LABELS,
  CATEGORY_BLURBS,
  scenariosByCategory,
} from "@/lib/services/generation/scenario-templates";

export const dynamic = "force-static";

export default function PlaybookPage() {
  const groups = scenariosByCategory();

  return (
    <div className="mx-auto w-full max-w-6xl pb-16">
      <PageHeader
        title="Playbook"
        description="Recipes, prompt formulas, and reference guides for getting great images out of the platform."
      />

      <PlaybookContent
        templates={SCENARIO_TEMPLATES}
        groups={groups}
        categoryLabels={CATEGORY_LABELS}
        categoryBlurbs={CATEGORY_BLURBS}
      />
    </div>
  );
}
