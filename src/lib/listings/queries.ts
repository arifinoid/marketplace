import { DEFAULT_LIMIT, MAX_LIMIT } from "@/lib/api/params"
import { getSupabase } from "@/lib/supabase/server"
import type {
  CreateListingInput,
  ListListingsParams,
  ListListingsResult,
  Listing,
  ListingRow,
} from "./types"

function mapListing(row: ListingRow): Listing {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    price: row.price,
    category_slug: row.category?.slug ?? "",
    category_name: row.category?.name ?? "",
    seller_email: row.seller_email,
    image_url: row.image_url,
    location: row.location,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

async function getCategoryIdBySlug(slug: string): Promise<string | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle()

  if (error) throw new Error(`Failed to resolve category: ${error.message}`)
  return data?.id ?? null
}

function normaliseLimit(limit?: number): number {
  if (limit === undefined || Number.isNaN(limit)) return DEFAULT_LIMIT
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_LIMIT)
}

function normaliseOffset(offset?: number): number {
  if (offset === undefined || Number.isNaN(offset)) return 0
  return Math.max(Math.trunc(offset), 0)
}

/** Strip characters that would break the PostgREST `or` filter. */
function escapeSearch(value: string): string {
  return value.replace(/[,()]/g, " ").trim()
}

export async function listListings(
  params: ListListingsParams = {},
): Promise<ListListingsResult> {
  const supabase = getSupabase()
  const limit = normaliseLimit(params.limit)
  const offset = normaliseOffset(params.offset)

  let query = supabase
    .from("listings")
    .select("*, category:categories!inner(slug,name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  // Filter on the embedded category so the slug resolves inside PostgREST and
  // no separate `categories` lookup (an extra round trip on every request) is
  // needed. `!inner` above is load bearing: PostgREST embeds are left joins by
  // default, so without the hint `category.slug` only nulls out the embed and
  // the parent rows are never restricted. `listings.category_id` is NOT NULL,
  // so the inner join cannot drop a listing.
  if (params.category) {
    query = query.eq("category.slug", params.category)
  }

  const q = escapeSearch(params.q ?? "")
  if (q) {
    const pattern = `%${q}%`
    query = query.or(`title.ilike.${pattern},description.ilike.${pattern}`)
  }

  const { data, error, count } = await query

  if (error) throw new Error(`Failed to list listings: ${error.message}`)

  return {
    data: (data as ListingRow[]).map(mapListing),
    total: count ?? 0,
  }
}

export async function getListing(id: string): Promise<Listing | null> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from("listings")
    .select("*, category:categories(slug,name)")
    .eq("id", id)
    .maybeSingle()

  if (error) throw new Error(`Failed to load listing: ${error.message}`)
  return data ? mapListing(data as ListingRow) : null
}

export async function createListing(
  input: CreateListingInput,
): Promise<Listing> {
  const supabase = getSupabase()
  const categoryId = await getCategoryIdBySlug(input.category)
  if (!categoryId) throw new Error("Unknown category")

  const { data, error } = await supabase
    .from("listings")
    .insert({
      title: input.title,
      description: input.description,
      price: input.price,
      category_id: categoryId,
      seller_email: input.seller_email,
      image_url: input.image_url,
    })
    .select("*, category:categories(slug,name)")
    .single()

  if (error) throw new Error(`Failed to create listing: ${error.message}`)
  return mapListing(data as ListingRow)
}
