import { badRequest, ok, serverError } from "@/lib/api/response"
import { fetchAccountFlags } from "@/lib/connect/account-status"
import {
  findStripeAccountByEmail,
  getAccountStatus,
  recordAccountEvent,
} from "@/lib/connect/queries"
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

    let flags = await getAccountStatus(row.stripe_account_id)

    // Stripe redirects the seller back here the moment they finish onboarding,
    // which can beat the webhook. Ask Stripe before telling the seller they are
    // still stuck; once our stored flags say charges are enabled the page is
    // served from the database alone.
    if (flags?.charges_enabled !== true) {
      const live = await fetchAccountFlags(row.stripe_account_id)
      if (live) {
        if (
          live.charges_enabled !== flags?.charges_enabled ||
          live.details_submitted !== flags?.details_submitted ||
          live.payouts_enabled !== flags?.payouts_enabled
        ) {
          await recordAccountEvent(row.stripe_account_id, live)
        }
        flags = live
      }
    }

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
