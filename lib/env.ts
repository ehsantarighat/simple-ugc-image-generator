import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(15),

  // --- OpenAI (primary, required) ------------------------------------------
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-2"),

  // --- Seedream (BytePlus ModelArk) ----------------------------------------
  // The "model" sent to ARK is either:
  //   (a) a public Doubao/Seedream model id like "doubao-seedream-3-0-t2i-250415"
  //   (b) a private endpoint id you created in the BytePlus console
  //       (looks like "ep-20240xxx-xxxxx")
  // Override these per-environment once you know which model id your ARK
  // workspace actually has access to.
  SEEDREAM_API_KEY: z.string().optional(),
  SEEDREAM_BASE_URL: z
    .string()
    .default("https://ark.ap-southeast.bytepluses.com/api/v3"),
  SEEDREAM_MODEL_HIGH_QUALITY: z
    .string()
    .default("doubao-seedream-4-0-250828"),
  SEEDREAM_MODEL_LITE: z
    .string()
    .default("doubao-seedream-3-0-t2i-250415"),

  // --- Qwen (Alibaba Model Studio) -----------------------------------------
  QWEN_API_KEY: z.string().optional(),
  QWEN_BASE_URL: z
    .string()
    .default("https://dashscope-intl.aliyuncs.com/api/v1"),
  QWEN_IMAGE_EDIT_MODEL_PLUS: z.string().default("qwen-image-edit-plus"),
  QWEN_IMAGE_EDIT_MODEL_MAX: z.string().default("qwen-image-edit-max"),

  // --- Gemini (Google AI Studio) -------------------------------------------
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_BASE_URL: z
    .string()
    .default("https://generativelanguage.googleapis.com/v1beta"),
  GEMINI_IMAGE_MODEL_FLASH: z.string().default("gemini-2.5-flash-image"),
  GEMINI_IMAGE_MODEL_PRO: z.string().default("gemini-2.5-pro-image"),

  // --- Recraft V3 (replaces FLUX/BFL slot — purpose-built for product) -----
  RECRAFT_API_KEY: z.string().optional(),
  RECRAFT_BASE_URL: z.string().default("https://external.api.recraft.ai/v1"),
  RECRAFT_MODEL: z.string().default("recraftv3"),
});

let cached: z.infer<typeof serverEnvSchema> | null = null;

export function serverEnv() {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new Error(`Invalid server env: ${issues}`);
  }
  cached = parsed.data;
  return cached;
}
