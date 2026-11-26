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
const { built } = vi.hoisted(() => ({ built: [] as BuiltQuery[] }))

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
        return Promise.resolve({ data: [], error: null, count: 0 }).then(onFulfilled)
      }
      return builder
    },
  }),
}))

import { listListings } from "./queries"

beforeEach(() => {
  built.length = 0
})

describe("listListings", () => {
  it("filters on the embedded category in the same round trip", async () => {
    await listListings({ category: "vehicles" })

    expect(built).toHaveLength(1)
    expect(built[0].table).toBe("listings")
    // `!inner` is what makes PostgREST restrict the parent rows; without it the
    // filter only nulls out the embed and every listing is returned.
    expect(built[0].select).toContain("category:categories!inner(slug,name)")
    expect(built[0].filters).toEqual([
      { column: "category.slug", value: "vehicles" },
    ])
  })

  it("leaves the category filter out when none is requested", async () => {
    await listListings({})

    expect(built).toHaveLength(1)
    expect(built[0].filters).toEqual([])
  })

  it("adds the keyword search filter on the base columns", async () => {
    await listListings({ q: "keyboard" })

    expect(built).toHaveLength(1)
    expect(built[0].filters).toEqual([])
    expect(built[0].ors).toEqual([
      "title.ilike.%keyboard%,description.ilike.%keyboard%",
    ])
  })
})
