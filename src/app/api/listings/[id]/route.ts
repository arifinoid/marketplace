import { NextRequest } from "next/server"
import { parseUuid } from "@/lib/api/params"
import {
  badRequest,
  notFound,
  okWithCache,
  serverError,
} from "@/lib/api/response"
import { getListing } from "@/lib/listings/queries"

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { id } = await params
  const listingId = parseUuid(id)
  if (!listingId) {
    return badRequest("A valid listing id is required")
  }

  try {
    const listing = await getListing(listingId)
    if (!listing) {
      return notFound("Listing not found")
    }
    return okWithCache(listing)
  } catch (error) {
    console.error(`GET /api/listings/${listingId} failed:`, error)
    return serverError()
  }
}
