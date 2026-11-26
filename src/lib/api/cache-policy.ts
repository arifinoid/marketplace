/**
 * CDN policy for public, anonymously readable GET responses: fresh for 10s,
 * then served stale for up to 59s while the next response is generated, so a
 * visitor never waits on Supabase.
 *
 * Shared by the route handlers and `next.config.ts` — the latter cannot import
 * `next/server`, so the value lives in a module with no Next dependencies.
 */
export const PUBLIC_CACHE_CONTROL =
  "public, s-maxage=10, stale-while-revalidate=59"
