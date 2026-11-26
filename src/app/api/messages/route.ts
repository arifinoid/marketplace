import { NextRequest } from "next/server"
import { parseUuid } from "@/lib/api/params"
import { badRequest, created, notFound, ok, serverError } from "@/lib/api/response"
import {
  ListingNotFoundError,
  createMessage,
  listMessages,
} from "@/lib/messages/queries"
import { validateMessageInput } from "@/lib/messages/validation"

export async function GET(request: NextRequest) {
  const listingId = parseUuid(request.nextUrl.searchParams.get("listing_id"))
  if (!listingId) {
    return badRequest("A valid listing_id query parameter is required")
  }

  try {
    return ok(await listMessages(listingId))
  } catch (error) {
    console.error(`GET /api/messages?listing_id=${listingId} failed:`, error)
    return serverError()
  }
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest("Invalid JSON body")
  }

  const result = validateMessageInput(body)
  if (!result.ok) {
    return badRequest("Please fix the highlighted fields", result.errors)
  }

  try {
    return created(await createMessage(result.value))
  } catch (error) {
    if (error instanceof ListingNotFoundError) {
      return notFound("Listing not found")
    }
    console.error("POST /api/messages failed:", error)
    return serverError()
  }
}
