import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const globalForSupabase = globalThis as unknown as {
  supabase?: SupabaseClient
}

/**
 * Server-only Supabase client. The browser never imports this module — it talks
 * to /api/* instead. Uses the publishable/anon key together with RLS; a
 * service-role key must never be used here or committed.
 *
 * Created lazily so `next build` does not require the env vars to be present.
 */
export function getSupabase(): SupabaseClient {
  if (globalForSupabase.supabase) return globalForSupabase.supabase

  const url = process.env.SUPABASE_URL
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY

  if (!url || !publishableKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY in the environment",
    )
  }

  const client = createClient(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })

  if (process.env.NODE_ENV !== "production") {
    globalForSupabase.supabase = client
  }

  return client
}
