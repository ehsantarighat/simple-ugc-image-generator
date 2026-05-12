// ============================================================================
// content-scaling-engine.ts
// Spec section 6. The top-level orchestrator that turns a project's content
// scope + choices into a content_packs row and runs the pack pipeline.
// ============================================================================

import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  estimatePackOutputs,
  planShots,
  type ShotPlan,
} from "@/lib/services/scaling/shot-planner-service";
import { planRatiosForPlatforms } from "@/lib/services/scaling/ratio-planner-service";
import { runPack } from "@/lib/services/scaling/pack-generation-service";
import type {
  OutputAspectRatio,
  OutputScope,
  PackType,
  PlatformTarget,
  StyleMode,
  SubjectMode,
} from "@/lib/services/generation/payload-schema";

export interface BuildPackPlanInput {
  projectId: string;
  scope: OutputScope;
  subjectMode: SubjectMode;
  styleMode: StyleMode;
  conceptDescription: string;
  selectedPlatforms: PlatformTarget[];
  requestedConceptCount?: number;
}

export interface PackPlanResult {
  shotPlan: ShotPlan;
  ratios: OutputAspectRatio[];
  ratioPlatformGroups: { ratio: OutputAspectRatio; platforms: PlatformTarget[] }[];
  estimatedOutputs: number;
  packType: PackType;
}

// Pure planning step. Does not write to the DB. The UI uses this to render a
// confirmation/preview before generation runs.
export function buildPackPlan(input: BuildPackPlanInput): PackPlanResult {
  const ratioPlan = planRatiosForPlatforms(input.selectedPlatforms);
  const ratios = ratioPlan.map((r) => r.ratio);

  const shotPlan = planShots({
    projectId: input.projectId,
    scope: input.scope,
    subjectMode: input.subjectMode,
    styleMode: input.styleMode,
    conceptDescription: input.conceptDescription,
    selectedPlatforms: input.selectedPlatforms,
    requestedConceptCount: input.requestedConceptCount,
    requestedAspectRatios: ratios,
  });

  const estimatedOutputs = estimatePackOutputs({ shotPlan, ratios });

  const packType: PackType =
    input.scope === "multi_format_pack"
      ? "multi_format"
      : input.scope === "multi_concept_pack"
        ? "multi_concept"
        : "campaign";

  return {
    shotPlan,
    ratios,
    ratioPlatformGroups: ratioPlan,
    estimatedOutputs,
    packType,
  };
}

export interface LaunchPackInput extends BuildPackPlanInput {
  userId: string;
  modelId: string | null;
  productId: string;
  title?: string;
  description?: string | null;
}

export interface LaunchPackResult {
  contentPackId: string;
  plan: PackPlanResult;
}

// Persists the pack row + content_plan_json on the project, then kicks off
// generation. Returns the pack id and the plan summary.
export async function launchPack(input: LaunchPackInput): Promise<LaunchPackResult> {
  const svc = getSupabaseServiceClient();
  const plan = buildPackPlan(input);

  // Persist content_plan on the project for future tabs/UI.
  await svc
    .from("projects")
    .update({
      content_plan_json: {
        scope: input.scope,
        subjectMode: input.subjectMode,
        styleMode: input.styleMode,
        selectedPlatforms: input.selectedPlatforms,
        ratios: plan.ratios,
        estimatedOutputs: plan.estimatedOutputs,
        conceptCount: plan.shotPlan.concepts.length,
      },
    })
    .eq("id", input.projectId)
    .eq("user_id", input.userId);

  const { data: packRow, error: packErr } = await svc
    .from("content_packs")
    .insert({
      user_id: input.userId,
      project_id: input.projectId,
      pack_type: plan.packType,
      title: input.title ?? `${input.scope.replace(/_/g, " ")}`,
      description: input.description ?? null,
      selected_platforms_json: input.selectedPlatforms,
      requested_ratios_json: plan.ratios,
      concept_count: plan.shotPlan.concepts.length,
      variation_count: 1,
      status: "planning",
    })
    .select("id")
    .single();
  if (packErr || !packRow) {
    throw new Error(`Failed to create content_pack: ${packErr?.message}`);
  }
  const contentPackId = packRow.id as string;

  // Run pack synchronously inside the request (consistent with the rest of MVP).
  await runPack({
    userId: input.userId,
    projectId: input.projectId,
    contentPackId,
    modelId: input.modelId,
    productId: input.productId,
    subjectMode: input.subjectMode,
    styleMode: input.styleMode,
    selectedPlatforms: input.selectedPlatforms,
    shotPlan: plan.shotPlan,
  });

  return { contentPackId, plan };
}
