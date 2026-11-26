import { describe, expect, it } from "vitest"
import { formatListedAgo, formatPrice, formatRelativeTime } from "./format"

const NOW = new Date("2026-01-01T12:00:00Z").getTime()

function iso(msAgo: number): string {
  return new Date(NOW - msAgo).toISOString()
}

describe("formatPrice", () => {
  it("formats USD with two decimals", () => {
    expect(formatPrice(99)).toBe("$99.00")
    expect(formatPrice(2300)).toBe("$2,300.00")
  })
})

describe("formatRelativeTime", () => {
  it("returns 'just now' for under a minute", () => {
    expect(formatRelativeTime(iso(30_000), NOW)).toBe("just now")
  })

  it("formats minutes, hours and days in the past", () => {
    expect(formatRelativeTime(iso(5 * 60_000), NOW)).toBe("5 minutes ago")
    expect(formatRelativeTime(iso(2 * 3_600_000), NOW)).toBe("2 hours ago")
    expect(formatRelativeTime(iso(3 * 86_400_000), NOW)).toBe("3 days ago")
  })

  it("formats future times with 'in'", () => {
    expect(formatRelativeTime(iso(-2 * 3_600_000), NOW)).toBe("in 2 hours")
  })

  it("returns an empty string for an invalid date", () => {
    expect(formatRelativeTime("not-a-date", NOW)).toBe("")
  })
})

describe("formatListedAgo", () => {
  it("combines the relative time with the location", () => {
    expect(formatListedAgo(iso(3_600_000), "Palo Alto, CA", NOW)).toBe(
      "Listed 1 hour ago in Palo Alto, CA",
    )
  })
})
