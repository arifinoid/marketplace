import { describe, expect, it } from "vitest"
import { MAX_LIMIT, parseListingsQuery, parseUuid } from "./params"

describe("parseUuid", () => {
  it("accepts a canonical uuid", () => {
    const uuid = "018f6c2e-8f9a-7b8c-9d0e-1f2a3b4c5d6e"
    expect(parseUuid(uuid)).toBe(uuid)
  })

  it("rejects missing or malformed values", () => {
    expect(parseUuid(null)).toBeNull()
    expect(parseUuid("")).toBeNull()
    expect(parseUuid("123")).toBeNull()
    expect(parseUuid("not-a-uuid")).toBeNull()
  })
})

describe("parseListingsQuery", () => {
  it("returns empty params for no query string", () => {
    const result = parseListingsQuery(new URLSearchParams())

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toEqual({})
  })

  it("parses a known category", () => {
    const result = parseListingsQuery(
      new URLSearchParams({ category: "sporting-goods" }),
    )

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.category).toBe("sporting-goods")
  })

  it("rejects an unknown category", () => {
    const result = parseListingsQuery(
      new URLSearchParams({ category: "nope" }),
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.category).toBeDefined()
  })

  it("trims and truncates the search text", () => {
    const result = parseListingsQuery(
      new URLSearchParams({ q: "  bike  " }),
    )

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.q).toBe("bike")
  })

  it("ignores a blank search text", () => {
    const result = parseListingsQuery(new URLSearchParams({ q: "   " }))

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.q).toBeUndefined()
  })

  it("clamps the limit into the supported range", () => {
    const tooSmall = parseListingsQuery(new URLSearchParams({ limit: "0" }))
    const tooLarge = parseListingsQuery(
      new URLSearchParams({ limit: String(MAX_LIMIT + 50) }),
    )

    expect(tooSmall.ok).toBe(true)
    expect(tooLarge.ok).toBe(true)
    if (tooSmall.ok) expect(tooSmall.value.limit).toBe(1)
    if (tooLarge.ok) expect(tooLarge.value.limit).toBe(MAX_LIMIT)
  })

  it("clamps a negative offset to zero", () => {
    const result = parseListingsQuery(new URLSearchParams({ offset: "-5" }))

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.offset).toBe(0)
  })

  it("rejects a non-numeric limit", () => {
    const result = parseListingsQuery(new URLSearchParams({ limit: "abc" }))

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.limit).toBeDefined()
  })
})
