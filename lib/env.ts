import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_IMAGE_MODEL: z.string().default("gpt-image-2"),
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(15),
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
