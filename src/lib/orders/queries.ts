import { getSupabase } from "@/lib/supabase/server"
import type { NewOrder, Order, OrderRow } from "./types"

/**
 * Reads and writes for completed payments. INSERT-only like the rest of the
 * schema: an order is written once by the webhook and never edited. "Sold" is
 * the existence of a row here, which is why `listings` needs no UPDATE policy.
 */

function mapOrder(row: OrderRow): Order {
  return {
    id: row.id,
    listing_id: row.listing_id,
    buyer_email: row.buyer_email,
    amount_cents: row.amount_cents,
    fee_cents: row.fee_cents,
    currency: row.currency,
    created_at: row.created_at,
  }
}

/** Postgres unique-violation code, raised by the one-paid-order index. */
const UNIQUE_VIOLATION = "23505"

function isUniqueViolation(error: { code?: string } | null): boolean {
  return error?.code === UNIQUE_VIOLATION
}

export async function findOrderBySession(
  sessionId: string,
): Promise<Order | null> {
  const { data } = await getSupabase()
    .from("orders")
    .select("*")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle()

  return data ? mapOrder(data as OrderRow) : null
}

/**
 * Record a paid checkout. Idempotent on `stripe_checkout_session_id` (Stripe
 * retries events), and returns `null` when a different session has already paid
 * for the same listing — the listing is sold either way, so the caller has
 * nothing left to do.
 */
export async function insertOrder(input: NewOrder): Promise<Order | null> {
  const supabase = getSupabase()
  const { error } = await supabase
    .from("orders")
    .upsert(input, {
      onConflict: "stripe_checkout_session_id",
      ignoreDuplicates: true,
    })

  if (error) {
    // A second paid order for one listing is rejected by
    // `orders_one_paid_per_listing_idx`, not by the session id conflict above.
    if (isUniqueViolation(error)) return null
    throw new Error(`Failed to record the order: ${error.message}`)
  }

  const order = await findOrderBySession(input.stripe_checkout_session_id)
  if (!order) throw new Error("Order was not stored")
  return order
}

/** A listing is sold when a paid order exists for it. */
export async function isListingSold(listingId: string): Promise<boolean> {
  const { data } = await getSupabase()
    .from("orders")
    .select("listing_id")
    .eq("listing_id", listingId)
    .eq("status", "paid")
    .limit(1)
    .maybeSingle()

  return data !== null
}

/**
 * Sold flags for a whole page of listings in one round trip, so the grid does
 * not need a query per card.
 */
export async function findSoldListingIds(
  listingIds: string[],
): Promise<Set<string>> {
  if (listingIds.length === 0) return new Set()

  const { data, error } = await getSupabase()
    .from("orders")
    .select("listing_id")
    .eq("status", "paid")
    .in("listing_id", listingIds)

  if (error) throw new Error(`Failed to load sold listings: ${error.message}`)

  return new Set(
    (data as Array<{ listing_id: string }>).map((row) => row.listing_id),
  )
}
