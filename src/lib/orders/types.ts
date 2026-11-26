/** A completed payment for one listing, as the app reads it. */
export interface Order {
  id: string
  listing_id: string
  buyer_email: string
  amount_cents: number
  fee_cents: number
  currency: string
  created_at: string
}

/** Raw `orders` row as supabase-js returns it. */
export interface OrderRow {
  id: string
  listing_id: string
  buyer_email: string
  stripe_checkout_session_id: string
  stripe_account_id: string
  amount_cents: number
  fee_cents: number
  currency: string
  status: string
  created_at: string
}

/** Payload accepted by POST /api/checkout (after validation). */
export interface CheckoutInput {
  listing_id: string
  buyer_email: string
}

/**
 * What the webhook writes. `status` is always `paid` today — the row only
 * exists because Stripe reported the payment as paid — but it is stored
 * explicitly so "Sold" is a query on a column rather than a guess.
 */
export interface NewOrder {
  listing_id: string
  buyer_email: string
  stripe_checkout_session_id: string
  stripe_account_id: string
  amount_cents: number
  fee_cents: number
  currency: string
  status: string
}
