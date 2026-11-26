import { beforeEach, describe, expect, it, vi } from "vitest"

interface BuiltQuery {
  table: string
  op: string
  select: string
  filters: Array<{ column: string; value: string }>
  payload: unknown
  order: { column: string; ascending: boolean } | null
  limit: number | null
  onConflict: string | null
  ignoreDuplicates: boolean | null
}

const { built, state } = vi.hoisted(() => ({
  built: [] as BuiltQuery[],
  state: {
    single: null as unknown,
    /** Sequential answers for consecutive reads in one call. */
    singles: [] as unknown[],
  },
}))

/**
 * The query builder is captured rather than executed: what matters is the
 * PostgREST payload (table, filters, upsert options), not the rows it returns.
 */
vi.mock("@/lib/supabase/server", () => ({
  getSupabase: () => ({
    from: (table: string) => {
      const query = {
        table,
        op: "",
        select: "",
        filters: [] as BuiltQuery["filters"],
        payload: undefined as unknown,
        order: null as BuiltQuery["order"],
        limit: null as number | null,
        onConflict: null as string | null,
        ignoreDuplicates: null as boolean | null,
      }

      const snapshot = () => ({
        ...query,
        filters: [...query.filters],
      })

      const builder: Record<string, unknown> = {
        select: (value: string) => {
          query.select = value
          return builder
        },
        eq: (column: string, value: string) => {
          query.filters.push({ column, value })
          return builder
        },
        order: (column: string, options: { ascending: boolean }) => {
          query.order = { column, ascending: options.ascending }
          return builder
        },
        limit: (value: number) => {
          query.limit = value
          return builder
        },
        maybeSingle: () => {
          query.op = "maybeSingle"
          built.push(snapshot())
          const value =
            state.singles.length > 0 ? state.singles.shift() : state.single
          return Promise.resolve({ data: value, error: null })
        },
        upsert: (
          payload: unknown,
          options: { onConflict: string; ignoreDuplicates: boolean },
        ) => {
          query.op = "upsert"
          query.payload = payload
          query.onConflict = options.onConflict
          query.ignoreDuplicates = options.ignoreDuplicates
          built.push(snapshot())
          return Promise.resolve({ data: null, error: null })
        },
        insert: (payload: unknown) => {
          query.op = "insert"
          query.payload = payload
          built.push(snapshot())
          return Promise.resolve({ data: null, error: null })
        },
      }

      return builder
    },
  }),
}))

import {
  canAcceptPayments,
  findStripeAccountByEmail,
  getAccountStatus,
  insertStripeAccount,
  recordAccountEvent,
} from "./queries"

beforeEach(() => {
  built.length = 0
  state.single = null
  state.singles = []
})

describe("findStripeAccountByEmail", () => {
  it("looks the account up by the seller email", async () => {
    await findStripeAccountByEmail("wei@example.com")

    expect(built).toHaveLength(1)
    expect(built[0].table).toBe("stripe_accounts")
    expect(built[0].filters).toEqual([
      { column: "seller_email", value: "wei@example.com" },
    ])
  })
})

describe("insertStripeAccount", () => {
  it("upserts on seller_email and ignores duplicates", async () => {
    state.single = {
      id: "018f6c2e-8f9a-7b8c-9d0e-1f2a3b4c5d6e",
      seller_email: "wei@example.com",
      stripe_account_id: "acct_1QwErTy",
      created_at: "2026-11-26T00:00:00.000Z",
    }

    await insertStripeAccount({
      seller_email: "wei@example.com",
      stripe_account_id: "acct_1QwErTy",
    })

    const upsert = built.find((entry) => entry.op === "upsert")
    expect(upsert).toBeDefined()
    expect(upsert?.table).toBe("stripe_accounts")
    expect(upsert?.onConflict).toBe("seller_email")
    // `ignoreDuplicates` is what makes a retry keep the original account
    // instead of failing on the unique constraint.
    expect(upsert?.ignoreDuplicates).toBe(true)
    expect(upsert?.payload).toEqual({
      seller_email: "wei@example.com",
      stripe_account_id: "acct_1QwErTy",
    })
  })

  it("re-selects the stored row after upserting", async () => {
    state.single = { seller_email: "wei@example.com" }

    await insertStripeAccount({
      seller_email: "wei@example.com",
      stripe_account_id: "acct_1QwErTy",
    })

    expect(built.map((entry) => entry.op)).toEqual(["upsert", "maybeSingle"])
  })

  it("throws when nothing was stored", async () => {
    state.single = null

    await expect(
      insertStripeAccount({
        seller_email: "wei@example.com",
        stripe_account_id: "acct_1QwErTy",
      }),
    ).rejects.toThrow("Connect account was not stored")
  })
})

describe("canAcceptPayments", () => {
  it("is false when the seller never connected", async () => {
    state.single = null

    expect(await canAcceptPayments("wei@example.com")).toBe(false)
  })

  it("is false until Stripe enables charges", async () => {
    // First read: the account row. Second read: its newest event.
    state.singles = [
      { seller_email: "wei@example.com", stripe_account_id: "acct_1QwErTy" },
      { charges_enabled: false, details_submitted: true, payouts_enabled: false },
    ]

    expect(await canAcceptPayments("wei@example.com")).toBe(false)
  })

  it("is true once charges are enabled", async () => {
    state.singles = [
      { seller_email: "wei@example.com", stripe_account_id: "acct_1QwErTy" },
      { charges_enabled: true, details_submitted: true, payouts_enabled: true },
    ]

    expect(await canAcceptPayments("wei@example.com")).toBe(true)
  })
})

describe("recordAccountEvent", () => {
  it("appends the flags Stripe reported", async () => {
    await recordAccountEvent("acct_1QwErTy", {
      charges_enabled: true,
      details_submitted: true,
      payouts_enabled: false,
    })

    expect(built).toHaveLength(1)
    expect(built[0].table).toBe("stripe_account_events")
    expect(built[0].op).toBe("insert")
    expect(built[0].payload).toEqual({
      stripe_account_id: "acct_1QwErTy",
      charges_enabled: true,
      details_submitted: true,
      payouts_enabled: false,
    })
  })
})

describe("getAccountStatus", () => {
  it("asks for the newest event only", async () => {
    state.single = {
      charges_enabled: true,
      details_submitted: true,
      payouts_enabled: false,
    }

    await getAccountStatus("acct_1QwErTy")

    expect(built).toHaveLength(1)
    expect(built[0].table).toBe("stripe_account_events")
    expect(built[0].select).toBe(
      "charges_enabled, details_submitted, payouts_enabled",
    )
    expect(built[0].order).toEqual({
      column: "created_at",
      ascending: false,
    })
    expect(built[0].limit).toBe(1)
  })
})
