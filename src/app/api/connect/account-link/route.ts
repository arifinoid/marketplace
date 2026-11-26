import { NextResponse } from "next/server"
import { badRequest, serverError } from "@/lib/api/response"
import { publicOrigin } from "@/lib/api/origin"
import { createAccountLink } from "@/lib/connect/onboarding"
import { validateConnectEmail } from "@/lib/connect/validation"

/**
 * Starts Stripe onboarding for a seller email and returns the URL to send them
 * to. The email travels in both return URLs so the Connect page still knows
 * who came back.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const parsed = validateConnectEmail(body)
  if (!parsed.ok) {
    return badRequest("Please fix the highlighted fields", parsed.errors)
  }

  const email = parsed.value.email
  const origin = publicOrigin(request)
  const query = `email=${encodeURIComponent(email)}`

  try {
    const url = await createAccountLink({
      email,
      returnUrl: `${origin}/connect?step=done&${query}`,
      refreshUrl: `${origin}/connect?step=refresh&${query}`,
    })
    return NextResponse.json({ data: { url } })
  } catch (error) {
    console.error("POST /api/connect/account-link failed:", error)
    return serverError()
  }
}
