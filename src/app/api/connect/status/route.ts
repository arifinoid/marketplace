import { badRequest, ok, serverError } from "@/lib/api/response"
import { findStripeAccountByEmail, getAccountStatus } from "@/lib/connect/queries"
import { parseEmailParam } from "@/lib/connect/validation"
import type { ConnectStatus } from "@/lib/connect/types"

/** Onboarding state for one seller email, used by the Connect page. */
export async function GET(request: Request) {
  const email = parseEmailParam(new URL(request.url).searchParams.get("email"))
  if (!email) {
    return badRequest("A valid email address is required")
  }

  try {
    const row = await findStripeAccountByEmail(email)
    if (!row) {
      return ok<ConnectStatus>({
        email,
        connected: false,
        chargesEnabled: false,
        detailsSubmitted: false,
        payoutsEnabled: false,
      })
    }

    const flags = await getAccountStatus(row.stripe_account_id)
    return ok<ConnectStatus>({
      email,
      connected: true,
      chargesEnabled: flags?.charges_enabled ?? false,
      detailsSubmitted: flags?.details_submitted ?? false,
      payoutsEnabled: flags?.payouts_enabled ?? false,
    })
  } catch (error) {
    console.error("GET /api/connect/status failed:", error)
    return serverError()
  }
}
