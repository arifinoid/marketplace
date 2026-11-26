import { NextResponse } from "next/server"
import { badRequest, conflict, serverError } from "@/lib/api/response"
import { publicOrigin } from "@/lib/api/origin"
import { createCheckoutUrl, CheckoutError } from "@/lib/orders/checkout"
import { validateCheckoutInput } from "@/lib/orders/validation"

/**
 * Starts a Stripe Checkout session for one listing and returns the URL to send
 * the buyer to. The seller is looked up from the listing server-side; the
 * client only ever sends a listing id and its own email.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const parsed = validateCheckoutInput(body)
  if (!parsed.ok) {
    return badRequest("Please fix the highlighted fields", parsed.errors)
  }

  try {
    const url = await createCheckoutUrl({
      listingId: parsed.value.listing_id,
      buyerEmail: parsed.value.buyer_email,
      origin: publicOrigin(request),
    })
    return NextResponse.json({ data: { url } })
  } catch (error) {
    if (error instanceof CheckoutError) {
      return conflict(error.message)
    }
    console.error("POST /api/checkout failed:", error)
    return serverError()
  }
}
