import { beforeEach, describe, expect, it, vi } from "vitest"

interface BuiltQuery {
  table: string
  select: string
  filters: Array<{ column: string; value: string }>
  ors: string[]
}

/**
 * The query builder is captured rather than executed: what matters here is the
 * PostgREST payload (`select` string and filters), not the rows it returns.
 */
const { built, rows } = vi.hoisted(() => ({
  built: [] as BuiltQuery[],
  // Two rows so the sold-flags lookup has ids to ask about.
  rows: [{ id: "0190-0001" }, { id: "0190-0002" }],
}))

vi.mock("@/lib/supabase/server", () => ({
  getSupabase: () => ({
    from: (table: string) => {
      const query: {
        select: string
        filters: BuiltQuery["filters"]
        ors: string[]
      } = { select: "", filters: [], ors: [] }
      const builder: Record<string, unknown> = {
        select: (value: string) => {
          query.select = value
          return builder
        },
        order: () => builder,
        range: () => builder,
        limit: () => builder,
        in: () => builder,
        eq: (column: string, value: string) => {
          query.filters.push({ column, value })
          return builder
        },
        or: (value: string) => {
          query.ors.push(value)
          return builder
        },
      }
      builder.then = (
        onFulfilled: (value: { data: unknown; error: null; count: number }) => unknown,
      ) => {
        built.push({
          table,
          select: query.select,
          filters: [...query.filters],
          ors: [...query.ors],
        })
        return Promise.resolve({ data: rows, error: null, count: rows.length }).then(
          onFulfilled,
        )
      }
      return builder
    },
  }),
}))

import { listListings } from "./queries"

beforeEach(() => {
  built.length = 0
})

/** The listings query is the one that joins the category. */
function listingsQuery(): BuiltQuery {
  const query = built.find(
    (entry) => entry.table === "listings" && entry.select.includes("categories"),
  )
  if (!query) throw new Error("The listings query was not built")
  return query
}

describe("listListings", () => {
  it("filters on the embedded category in the same round trip", async () => {
    await listListings({ category: "vehicles" })

    // `!inner` is what makes PostgREST restrict the parent rows; without it the
    // filter only nulls out the embed and every listing is returned.
    expect(listingsQuery().select).toContain(
      "category:categories!inner(slug,name)",
    )
    expect(listingsQuery().filters).toEqual([
      { column: "category.slug", value: "vehicles" },
    ])
  })

  it("leaves the category filter out when none is requested", async () => {
    await listListings({})

    expect(listingsQuery().filters).toEqual([])
  })

  it("adds the keyword search filter on the base columns", async () => {
    await listListings({ q: "keyboard" })

    expect(listingsQuery().filters).toEqual([])
    expect(listingsQuery().ors).toEqual([
      "title.ilike.%keyboard%,description.ilike.%keyboard%",
    ])
  })

  it("also asks which listings are sold, so cards can show the badge", async () => {
    await listListings({})

    const orders = built.filter((entry) => entry.table === "orders")
    expect(orders).toHaveLength(1)
    expect(orders[0].filters).toEqual([{ column: "status", value: "paid" }])
  })
})
