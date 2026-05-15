// ============================================================================
// product-reproduction-planner-service.ts
// Mode A planner. Pure: returns a plan describing every output to generate
// for the user's chosen styles × ratios × platforms.
// ============================================================================

import type {
  OutputAspectRatio,
  OutputScope,
  PlatformTarget,
  ProductReproductionStyle,
} from "@/lib/services/generation/payload-schema";
import {
  planRatiosForPlatforms,
  primaryPlatformForRatio,
} from "@/lib/services/scaling/ratio-planner-service";
import { productReproductionStyleLabel } from "@/lib/services/generation/prompt-blocks/product-reproduction-style-block";

export interface PlannedReproductionOutput {
  id: string;
  style: ProductReproductionStyle;
  ratio: OutputAspectRatio;
  platform?: PlatformTarget;
  styleLabel: string;
}

export interface ReproductionPlan {
  projectId: string;
  scope: OutputScope;
  styles: ProductReproductionStyle[];
  ratios: OutputAspectRatio[];
  platforms: PlatformTarget[];
  outputs: PlannedReproductionOutput[];
  estimatedCallCount: number;
  notes: string[];
}

export interface BuildReproductionPlanArgs {
  projectId: string;
  scope: OutputScope;
  styles: ProductReproductionStyle[];
  selectedPlatforms: PlatformTarget[];
  selectedRatios?: OutputAspectRatio[];
  generateAllFormats?: boolean;
}

const ALL_RATIOS: OutputAspectRatio[] = ["1:1", "4:5", "9:16", "16:9"];

export function buildReproductionPlan(
  args: BuildReproductionPlanArgs
): ReproductionPlan {
  if (args.styles.length === 0) {
    throw new Error("At least one style preset is required for product reproduction.");
  }

  // Decide the ratio set.
  let ratios: OutputAspectRatio[];
  let platforms = args.selectedPlatforms;
  const notes: string[] = [];

  if (args.generateAllFormats) {
    ratios = [...ALL_RATIOS];
    notes.push("Generating all 4 aspect ratios per style.");
  } else if (args.selectedRatios && args.selectedRatios.length > 0) {
    ratios = [...args.selectedRatios];
  } else if (args.selectedPlatforms.length > 0) {
    ratios = planRatiosForPlatforms(args.selectedPlatforms).map((p) => p.ratio);
  } else {
    ratios = ["1:1"];
    notes.push("Defaulted to 1:1 since no ratio/platform was selected.");
  }

  // Apply the output scope cap on number of styles/ratios to keep cost sane.
  let effectiveStyles = args.styles;
  let effectiveRatios = ratios;
  if (args.scope === "single_image") {
    effectiveStyles = effectiveStyles.slice(0, 1);
    effectiveRatios = effectiveRatios.slice(0, 1);
  } else if (args.scope === "few_variations") {
    effectiveStyles = effectiveStyles.slice(0, 2);
    effectiveRatios = effectiveRatios.slice(0, 2);
  }

  const outputs: PlannedReproductionOutput[] = [];
  let idx = 0;
  for (const style of effectiveStyles) {
    for (const ratio of effectiveRatios) {
      const platform = primaryPlatformForRatio(ratio, platforms);
      outputs.push({
        id: `out_${idx++}_${style}_${ratio.replace(":", "x")}`,
        style,
        ratio,
        platform,
        styleLabel: productReproductionStyleLabel(style),
      });
    }
  }

  return {
    projectId: args.projectId,
    scope: args.scope,
    styles: effectiveStyles,
    ratios: effectiveRatios,
    platforms,
    outputs,
    estimatedCallCount: outputs.length,
    notes,
  };
}
