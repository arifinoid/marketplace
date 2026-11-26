import type { Category } from "@/lib/categories"

export type { Category }

/** Payload accepted by POST /api/listings (after validation). */
export interface CreateListingInput {
  title: string
  description: string
  price: number
  category: string
  seller_email: string
  image_url: string
}

/** Listing as returned by the API, with the category joined. */
export interface Listing {
  id: string
  title: string
  description: string | null
  price: number
  category_slug: string
  category_name: string
  seller_email: string
  image_url: string
  location: string
  created_at: string
  updated_at: string
  /**
   * Derived, never stored on the row: a paid `orders` row exists for this
   * listing. Kept out of `listings` so that table needs no UPDATE policy.
   */
  sold: boolean
}

/** Detail response: the listing plus the two flags the item page acts on. */
export interface ListingDetail extends Listing {
  /** The seller has a Connect account with `charges_enabled`. */
  sellerReady: boolean
}

/** Raw row shape returned by supabase-js for a listing with its category. */
export interface ListingRow {
  id: string
  title: string
  description: string | null
  price: number
  category_id: string
  seller_email: string
  image_url: string
  location: string
  created_at: string
  updated_at: string
  category: { slug: string; name: string } | null
}

export interface ListListingsParams {
  category?: string
  q?: string
  limit?: number
  offset?: number
}

export interface ListListingsResult {
  data: Listing[]
  total: number
}
