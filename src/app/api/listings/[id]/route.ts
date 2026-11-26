import { NextRequest } from "next/server"
import { parseUuid } from "@/lib/api/params"
import { badRequest, notFound, ok, serverError } from "@/lib/api/response"
import { getListing } from "@/lib/listings/queries"
import { canAcceptPayments } from "@/lib/connect/queries"
import type { ListingDetail } from "@/lib/listings/types"

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

    const sellerReady = await canAcceptPayments(listing.seller_email)
    // Not CDN-cached: `sold` and `sellerReady` change the moment a payment
    // lands, and a stale 200 here would keep Buy Now on a sold listing.
    return ok<ListingDetail>({ ...listing, sellerReady })
  } catch (error) {
    console.error(`GET /api/listings/${listingId} failed:`, error)
    return serverError()
  }
}
