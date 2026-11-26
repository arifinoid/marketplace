import { describe, expect, it } from "vitest"
import type Stripe from "stripe"
import { readAccountFlags } from "./account-flags"

/**
 * Accounts v2 replaced the `charges_enabled` / `details_submitted` /
 * `payouts_enabled` booleans with a capability status plus a requirements list.
 * These tests pin the translation, because Buy Now is shown from it.
 */

function account(params: {
  cardPaymentsStatus?: string
  entries?: Array<{ awaiting_action_from: string; capability?: string }>
}): Stripe.V2.Core.Account {
  return {
    configuration: {
      merchant: {
        capabilities: {
          card_payments:
            params.cardPaymentsStatus === undefined
              ? undefined
              : {
                  status: params.cardPaymentsStatus as "active",
                  status_details: [],
                },
        },
      },
    },
    requirements: {
      alternatives: [],
      entries: (params.entries ?? []).map((entry) => ({
        awaiting_action_from: entry.awaiting_action_from as "user",
        description: "test requirement",
        errors: [],
        impact: {
          restricts_capabilities:
            entry.capability === undefined
              ? []
              : [{ capability: entry.capability, deadline: { status: "past_due" } }],
        },
        minimum_deadline: { status: "past_due" },
        reference: null,
        requested_reasons: [],
      })),
    },
  } as unknown as Stripe.V2.Core.Account
}

describe("readAccountFlags", () => {
  it("is all false for a brand new account", () => {
    const flags = readAccountFlags(
      account({
        cardPaymentsStatus: "restricted",
        entries: [
          { awaiting_action_from: "user", capability: "card_payments" },
          { awaiting_action_from: "user", capability: "stripe_balance.payouts" },
        ],
      }),
    )

    expect(flags).toEqual({
      charges_enabled: false,
      details_submitted: false,
      payouts_enabled: false,
    })
  })

  it("is all true once the seller finished onboarding", () => {
    const flags = readAccountFlags(
      account({ cardPaymentsStatus: "active", entries: [] }),
    )

    expect(flags).toEqual({
      charges_enabled: true,
      details_submitted: true,
      payouts_enabled: true,
    })
  })

  it("keeps charges enabled when only a payout requirement is outstanding", () => {
    const flags = readAccountFlags(
      account({
        cardPaymentsStatus: "active",
        entries: [
          { awaiting_action_from: "user", capability: "stripe_balance.payouts" },
        ],
      }),
    )

    expect(flags.charges_enabled).toBe(true)
    expect(flags.payouts_enabled).toBe(false)
    // The seller still has a form to fill in.
    expect(flags.details_submitted).toBe(false)
  })

  it("treats a requirement Stripe is chasing as submitted by the seller", () => {
    const flags = readAccountFlags(
      account({
        cardPaymentsStatus: "active",
        entries: [{ awaiting_action_from: "stripe" }],
      }),
    )

    expect(flags.details_submitted).toBe(true)
  })

  it("is false when the account has no requirements or configuration", () => {
    expect(readAccountFlags({} as Stripe.V2.Core.Account)).toEqual({
      charges_enabled: false,
      details_submitted: true,
      payouts_enabled: true,
    })
  })
})
