import { beforeEach, describe, expect, it, vi } from "vitest"

interface BuiltQuery {
  table: string
  op: string
  select: string
  filters: Array<{ column: string; value: string }>
  inValues: string[]
  limit: number | null
  payload: unknown
  onConflict: string | null
  ignoreDuplicates: boolean | null
}

const { built, state } = vi.hoisted(() => ({
  built: [] as BuiltQuery[],
  state: {
    single: null as unknown,
    rows: [] as unknown[],
    error: null as { code: string; message: string } | null,
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
        inValues: [] as string[],
        limit: null as number | null,
        payload: undefined as unknown,
        onConflict: null as string | null,
        ignoreDuplicates: null as boolean | null,
      }

      const snapshot = () => ({ ...query, filters: [...query.filters] })

      const builder: Record<string, unknown> = {
        select: (value: string) => {
          query.select = value
          return builder
        },
        eq: (column: string, value: string) => {
          query.filters.push({ column, value })
          return builder
        },
        in: (column: string, values: string[]) => {
          query.inValues = values
          return builder
        },
        limit: (value: number) => {
          query.limit = value
          return builder
        },
        maybeSingle: () => {
          query.op = "maybeSingle"
          built.push(snapshot())
          return Promise.resolve({
            data: state.single,
            error: state.error,
          })
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
          return Promise.resolve({ data: null, error: state.error })
        },
        then: (
          onFulfilled: (value: { data: unknown; error: unknown }) => unknown,
        ) => {
          query.op = "then"
          built.push(snapshot())
          return Promise.resolve({
            data: state.rows,
            error: state.error,
          }).then(onFulfilled)
        },
      }

      return builder
    },
  }),
}))

import {
  findOrderBySession,
  findSoldListingIds,
  insertOrder,
  isListingSold,
} from "./queries"

const orderRow = {
  id: "018f6c2e-8f9a-7b8c-9d0e-1f2a3b4c5d6e",
  listing_id: "0190-0000",
  buyer_email: "buyer@example.com",
  stripe_checkout_session_id: "cs_test_1QwErTy",
  stripe_account_id: "acct_1QwErTy",
  amount_cents: 4250,
  fee_cents: 425,
  currency: "usd",
  status: "paid",
  created_at: "2026-11-26T00:00:00.000Z",
}

beforeEach(() => {
  built.length = 0
  state.single = null
  state.rows = []
  state.error = null
})

describe("findOrderBySession", () => {
  it("looks the order up by its checkout session", async () => {
    state.single = orderRow

    const order = await findOrderBySession("cs_test_1QwErTy")

    expect(built).toHaveLength(1)
    expect(built[0].table).toBe("orders")
    expect(built[0].filters).toEqual([
      { column: "stripe_checkout_session_id", value: "cs_test_1QwErTy" },
    ])
    expect(order?.amount_cents).toBe(4250)
    expect(order?.fee_cents).toBe(425)
  })

  it("returns null when the session has no order", async () => {
    expect(await findOrderBySession("cs_test_missing")).toBeNull()
  })
})

describe("insertOrder", () => {
  it("upserts on the checkout session so a retried event is a no-op", async () => {
    state.single = orderRow

    await insertOrder({ ...orderRow, listing_id: "0190-0001" })

    const upsert = built.find((entry) => entry.op === "upsert")
    expect(upsert).toBeDefined()
    expect(upsert?.table).toBe("orders")
    expect(upsert?.onConflict).toBe("stripe_checkout_session_id")
    expect(upsert?.ignoreDuplicates).toBe(true)
    expect(upsert?.payload).toMatchObject({
      stripe_checkout_session_id: "cs_test_1QwErTy",
      status: "paid",
      amount_cents: 4250,
    })
  })

  it("re-selects the stored order after upserting", async () => {
    state.single = orderRow

    await insertOrder(orderRow)

    expect(built.map((entry) => entry.op)).toEqual(["upsert", "maybeSingle"])
  })

  it("returns null instead of throwing when the listing is already sold", async () => {
    state.error = { code: "23505", message: "duplicate key value" }

    await expect(insertOrder(orderRow)).resolves.toBeNull()
  })

  it("throws for any other database error", async () => {
    state.error = { code: "42501", message: "permission denied" }

    await expect(insertOrder(orderRow)).rejects.toThrow(
      "Failed to record the order",
    )
  })

  it("throws when the order cannot be read back", async () => {
    state.single = null

    await expect(insertOrder(orderRow)).rejects.toThrow("Order was not stored")
  })
})

describe("isListingSold", () => {
  it("asks for a paid order only", async () => {
    state.single = { listing_id: "0190-0001" }

    await isListingSold("0190-0001")

    expect(built).toHaveLength(1)
    expect(built[0].table).toBe("orders")
    expect(built[0].filters).toEqual([
      { column: "listing_id", value: "0190-0001" },
      { column: "status", value: "paid" },
    ])
    expect(built[0].limit).toBe(1)
  })

  it("is false without an order", async () => {
    expect(await isListingSold("0190-0002")).toBe(false)
  })
})

describe("findSoldListingIds", () => {
  it("loads every sold id in one query", async () => {
    state.rows = [{ listing_id: "0190-0001" }, { listing_id: "0190-0003" }]

    const sold = await findSoldListingIds(["0190-0001", "0190-0002", "0190-0003"])

    expect(built).toHaveLength(1)
    expect(built[0].inValues).toEqual(["0190-0001", "0190-0002", "0190-0003"])
    expect([...sold].sort()).toEqual(["0190-0001", "0190-0003"])
  })

  it("skips the query entirely for an empty page", async () => {
    const sold = await findSoldListingIds([])

    expect(sold.size).toBe(0)
    expect(built).toHaveLength(0)
  })
})
