import { NextRequest } from "next/server"
import { parseListingsQuery } from "@/lib/api/params"
import { badRequest, created, ok, serverError } from "@/lib/api/response"
import { createListing, listListings } from "@/lib/listings/queries"
import { validateListingInput } from "@/lib/listings/validation"

export async function GET(request: NextRequest) {
  const parsed = parseListingsQuery(request.nextUrl.searchParams)
  if (!parsed.ok) {
    return badRequest("Invalid query parameters", parsed.errors)
  }

  try {
    return ok(await listListings(parsed.value))
  } catch (error) {
    console.error("GET /api/listings failed:", error)
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

  const result = validateListingInput(body)
  if (!result.ok) {
    return badRequest("Please fix the highlighted fields", result.errors)
  }

  try {
    return created(await createListing(result.value))
  } catch (error) {
    console.error("POST /api/listings failed:", error)
    return serverError()
  }
}
