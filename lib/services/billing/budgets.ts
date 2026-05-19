// ============================================================================
// budgets.ts
// Tracks the user's prepaid balance per provider billing account so the
// dashboard can show "Starting $5.78 → Spent $0.36 → Remaining $5.42" per
// platform. Edit the STARTING_BALANCES below when you top up a provider
// account — every dollar moves the "Remaining" number on the dashboard.
//
// Why hardcoded? At MVP scale there's one operator (you) and these numbers
// change a few times a month, so a code constant is simpler than a settings
// table + UI. When you outgrow this, lift it into a `billing_accounts` table
// and edit via the dashboard.
// ============================================================================

import "server-only";

// ----------------------------------------------------------------------------
// Edit these whenever you top up. Stored in tenth-cents (1/1000 USD) to match
// the rest of the cost pipeline — multiply dollars by 1000.
//
//   $5.78  → 5780
//   $11.85 → 11850
//   $20.00 → 20000
//
// Last edited: 2026-05-19
// ----------------------------------------------------------------------------
export const STARTING_BALANCES_TENTH_CENTS: Record<BillingAccount, number> = {
  fal: 5780,      // $5.78
  openai: 11850,  // $11.85
  recraft: 0,     // not prepaid yet
  google: 0,      // not prepaid yet
  alibaba: 0,     // not prepaid yet
  byteplus: 0,    // not prepaid yet
  other: 0,
};

// ----------------------------------------------------------------------------
// A "billing account" is the provider you actually pay. Multiple registry
// adapters share the same account: anything routed through fal.ai bills the
// `fal` account regardless of which model (FLUX, Recraft via fal, etc.)
// ----------------------------------------------------------------------------
export type BillingAccount =
  | "fal"
  | "openai"
  | "recraft"
  | "google"
  | "alibaba"
  | "byteplus"
  | "other";

const ACCOUNT_LABELS: Record<BillingAccount, string> = {
  fal: "fal.ai",
  openai: "OpenAI",
  recraft: "Recraft",
  google: "Google AI Studio",
  alibaba: "Alibaba Model Studio",
  byteplus: "BytePlus ModelArk",
  other: "Other",
};

export function billingAccountLabel(account: BillingAccount): string {
  return ACCOUNT_LABELS[account];
}

// ----------------------------------------------------------------------------
// Map a provider id (or raw model string from the SDK) to a billing account.
// Accepts both the canonical registry id ("fal-flux-kontext-multi") and the
// raw fal model string ("fal-ai/flux-pro/kontext/max/multi") since both
// appear in generated_images.provider_used across history.
// ----------------------------------------------------------------------------
export function providerToBillingAccount(
  providerId: string | null | undefined
): BillingAccount {
  if (!providerId) return "other";
  const p = providerId.toLowerCase();

  // fal.ai routes
  if (p.startsWith("fal-") || p.startsWith("fal-ai/") || p.startsWith("fal/")) {
    return "fal";
  }
  // OpenAI
  if (p.startsWith("gpt-image") || p.startsWith("dall-e")) {
    return "openai";
  }
  // Recraft (native)
  if (p === "recraft-v3" || p === "recraftv3" || p.startsWith("recraft")) {
    return "recraft";
  }
  // Google Gemini (native)
  if (p.startsWith("gemini-") || p.startsWith("google/")) {
    return "google";
  }
  // Alibaba Qwen
  if (p.startsWith("qwen-") || p.includes("dashscope")) {
    return "alibaba";
  }
  // BytePlus / ByteDance Seedream native
  if (p.startsWith("doubao-") || p.startsWith("seedream-") || p.startsWith("ep-")) {
    return "byteplus";
  }
  return "other";
}

export interface AccountBalance {
  account: BillingAccount;
  label: string;
  startingTenthCents: number;
  spentTenthCents: number;
  remainingTenthCents: number;
  /** spent / starting, clamped to [0, 1]. 0 when starting is 0. */
  utilization: number;
  imageCount: number;
}

/** Aggregate raw image rows into per-account balances. Includes every
 *  account where either we have a starting balance OR observed spend. */
export function rollupBalances(
  rows: Array<{
    provider_used: string | null;
    provider_cost_tenth_cents: number | null;
  }>
): AccountBalance[] {
  const spentByAccount = new Map<BillingAccount, number>();
  const countByAccount = new Map<BillingAccount, number>();

  for (const r of rows) {
    const cost = r.provider_cost_tenth_cents ?? 0;
    if (cost <= 0 && !r.provider_used) continue;
    const account = providerToBillingAccount(r.provider_used);
    spentByAccount.set(account, (spentByAccount.get(account) ?? 0) + cost);
    if (cost > 0) {
      countByAccount.set(account, (countByAccount.get(account) ?? 0) + 1);
    }
  }

  const allAccounts = new Set<BillingAccount>([
    ...spentByAccount.keys(),
    ...(Object.keys(STARTING_BALANCES_TENTH_CENTS) as BillingAccount[]).filter(
      (a) => STARTING_BALANCES_TENTH_CENTS[a] > 0
    ),
  ]);

  return [...allAccounts]
    .map((account): AccountBalance => {
      const starting = STARTING_BALANCES_TENTH_CENTS[account] ?? 0;
      const spent = spentByAccount.get(account) ?? 0;
      const remaining = Math.max(0, starting - spent);
      const utilization = starting > 0 ? Math.min(1, spent / starting) : 0;
      return {
        account,
        label: billingAccountLabel(account),
        startingTenthCents: starting,
        spentTenthCents: spent,
        remainingTenthCents: remaining,
        utilization,
        imageCount: countByAccount.get(account) ?? 0,
      };
    })
    // Sort by starting balance desc so the biggest prepaid account is first.
    .sort((a, b) => b.startingTenthCents - a.startingTenthCents);
}
