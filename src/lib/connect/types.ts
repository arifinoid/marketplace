/** A Connect account we created for one seller email. */
export interface StripeAccountRow {
  id: string
  seller_email: string
  stripe_account_id: string
  created_at: string
}

/** The onboarding flags Stripe reports for a Connect account. */
export interface AccountFlags {
  charges_enabled: boolean
  details_submitted: boolean
  payouts_enabled: boolean
}

/** What the Connect page shows for one email. */
export interface ConnectStatus {
  email: string
  /** A Connect account exists for this email. */
  connected: boolean
  chargesEnabled: boolean
  detailsSubmitted: boolean
  payoutsEnabled: boolean
}
