/**
 * Money helpers. Stripe amounts are integer minor units (cents), so every
 * conversion between the `numeric(10,2)` column and the API happens here.
 */

/** Platform fee in basis points: 1000 bps = 10%. */
export const PLATFORM_FEE_BPS = 1000

const PRICE_PATTERN = /^(-?)(\d+)(?:\.(\d{1,2}))?$/

/**
 * Convert a `numeric(10,2)` price into integer cents.
 *
 * Parsed digit by digit instead of by multiplying a float: `0.1 * 100` is
 * `10.000000000000002`, and the database hands the value over as a string
 * anyway. Accepts the string form and the number form.
 *
 * @throws when the value is not a plain decimal with at most two places.
 */
export function priceToCents(price: string | number): number {
  const text = String(price).trim()
  const match = PRICE_PATTERN.exec(text)
  if (!match) throw new Error(`Invalid price: ${text}`)

  const [, sign, whole, fraction = ""] = match
  const cents = Number(whole) * 100 + Number((fraction + "00").slice(0, 2))
  return sign === "-" ? -cents : cents
}

/** Platform fee in cents, rounded to the nearest cent. */
export function platformFeeCents(amountCents: number): number {
  return Math.round((amountCents * PLATFORM_FEE_BPS) / 10_000)
}

/** What the seller receives once the platform fee is deducted. */
export function sellerPayoutCents(amountCents: number): number {
  return amountCents - platformFeeCents(amountCents)
}
