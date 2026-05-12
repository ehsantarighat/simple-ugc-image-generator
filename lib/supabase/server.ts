import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { serverEnv } from "@/lib/env";

// Server-side Supabase client tied to the request's cookies.
// Use this inside server components, server actions, and route handlers.
export async function getSupabaseServerClient() {
  const env = serverEnv();
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // The `set` method throws when called from a Server Component.
          // Middleware refreshes the session, so this is safe to ignore here.
        }
      },
    },
  });
}

// Returns the current user or throws. Use at the top of server actions /
// route handlers that require an authenticated user.
export async function requireUser() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("UNAUTHENTICATED");
  }
  return { supabase, user };
}
