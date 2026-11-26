/**
 * The public origin, for building absolute URLs (Connect account links,
 * Checkout return URLs). Vercel forwards the public host, so the incoming
 * request is the reliable source; `NEXT_PUBLIC_APP_URL` overrides it when a
 * deployment needs a fixed value.
 */
export function publicOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/+$/, "")

  return new URL(request.url).origin
}
