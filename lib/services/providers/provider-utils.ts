// ============================================================================
// provider-utils.ts
// Shared helpers used by non-OpenAI adapters: extract bytes from an
// Uploadable, encode to base64 / data URI, parse size strings, etc.
// ============================================================================

import "server-only";

import type { Uploadable } from "openai/uploads";

// Uploadables we pass to providers are always created via openai/uploads
// `toFile()` — at runtime they expose Web File semantics with arrayBuffer().
// We coerce loosely; if a future provider ever passes something else, this
// will throw with a clear message.
export async function uploadableToBuffer(ref: Uploadable): Promise<Buffer> {
  const r = ref as unknown as {
    arrayBuffer?: () => Promise<ArrayBuffer>;
  };
  if (typeof r.arrayBuffer === "function") {
    const ab = await r.arrayBuffer();
    return Buffer.from(ab);
  }
  throw new Error("Cannot extract bytes from provider reference");
}

export async function uploadableToBase64(ref: Uploadable): Promise<string> {
  const buf = await uploadableToBuffer(ref);
  return buf.toString("base64");
}

export async function uploadableToDataUri(
  ref: Uploadable,
  contentType = "image/jpeg"
): Promise<string> {
  const b64 = await uploadableToBase64(ref);
  return `data:${contentType};base64,${b64}`;
}

// Parses "1024x1024" into [width, height]. Throws on a malformed string.
export function parseSize(size: string): [number, number] {
  const m = /^(\d+)x(\d+)$/.exec(size);
  if (!m) throw new Error(`Invalid size: ${size}`);
  return [Number(m[1]), Number(m[2])];
}
