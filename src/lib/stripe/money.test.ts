import { describe, expect, it } from "vitest"
import {
  PLATFORM_FEE_BPS,
  platformFeeCents,
  priceToCents,
  sellerPayoutCents,
} from "./money"

describe("priceToCents", () => {
  it("converts the numeric(10,2) string form", () => {
    expect(priceToCents("42.50")).toBe(4250)
    expect(priceToCents("0.00")).toBe(0)
    expect(priceToCents("99999999.99")).toBe(9_999_999_999)
  })

  it("accepts one decimal place and no decimal point", () => {
    expect(priceToCents("1234.5")).toBe(123_450)
    expect(priceToCents("7")).toBe(700)
  })

  it("parses exactly where float multiplication would not", () => {
    // 0.1 * 100 === 10.000000000000002, so a float path would round wrongly.
    expect(priceToCents("0.1")).toBe(10)
    expect(priceToCents("0.07")).toBe(7)
    expect(priceToCents(0.1)).toBe(10)
  })

  it("rejects values that are not a plain two-decimal amount", () => {
    expect(() => priceToCents("abc")).toThrow("Invalid price")
    expect(() => priceToCents("1.234")).toThrow("Invalid price")
    expect(() => priceToCents("")).toThrow("Invalid price")
    expect(() => priceToCents("12,50")).toThrow("Invalid price")
  })
})

describe("platformFeeCents", () => {
  it("charges 10% by default", () => {
    expect(PLATFORM_FEE_BPS).toBe(1000)
    expect(platformFeeCents(4250)).toBe(425)
    expect(platformFeeCents(100)).toBe(10)
  })

  it("rounds to the nearest cent", () => {
    expect(platformFeeCents(101)).toBe(10)
    expect(platformFeeCents(333)).toBe(33)
  })

  it("never exceeds the charge", () => {
    for (const amount of [0, 1, 5, 99, 100, 2500, 9_999_999_999]) {
      expect(platformFeeCents(amount)).toBeLessThanOrEqual(amount)
    }
  })
})

describe("sellerPayoutCents", () => {
  it("is the charge minus the platform fee", () => {
    expect(sellerPayoutCents(4250)).toBe(3825)
    expect(sellerPayoutCents(100)).toBe(90)
  })

  it("keeps the fee and the payout summing to the charge", () => {
    const amount = 333
    expect(platformFeeCents(amount) + sellerPayoutCents(amount)).toBe(amount)
  })
})
