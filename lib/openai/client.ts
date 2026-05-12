import "server-only";

import OpenAI from "openai";
import { serverEnv } from "@/lib/env";

let cached: OpenAI | null = null;

export function getOpenAIClient() {
  if (cached) return cached;
  const env = serverEnv();
  cached = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  return cached;
}
