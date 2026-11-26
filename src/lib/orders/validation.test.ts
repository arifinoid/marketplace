import { describe, expect, it } from "vitest"
import { validateCheckoutInput } from "./validation"

describe("validateCheckoutInput", () => {
  const valid = {
    listing_id: "018f6c2e-8f9a-7b8c-9d0e-1f2a3b4c5d6e",
    buyer_email: "buyer@example.com",
  }

  it("accepts a valid listing id and email", () => {
    const result = validateCheckoutInput(valid)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.listing_id).toBe(valid.listing_id)
      expect(result.value.buyer_email).toBe("buyer@example.com")
    }
  })

  it("trims and lowercases the buyer email", () => {
    const result = validateCheckoutInput({ ...valid, buyer_email: "  Buyer@Example.COM " })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.buyer_email).toBe("buyer@example.com")
  })

  it("rejects a listing id that is not a UUID", () => {
    const result = validateCheckoutInput({ ...valid, listing_id: "123" })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.listing_id).toBeDefined()
  })

  it("rejects a missing listing id", () => {
    const result = validateCheckoutInput({ buyer_email: "buyer@example.com" })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.listing_id).toBeDefined()
  })

  it("rejects an invalid buyer email", () => {
    const result = validateCheckoutInput({ ...valid, buyer_email: "nope" })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.buyer_email).toBeDefined()
  })

  it("reports both bad fields at once", () => {
    const result = validateCheckoutInput({})

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.listing_id).toBeDefined()
      expect(result.errors.buyer_email).toBeDefined()
    }
  })

  it("rejects a non-object body", () => {
    const result = validateCheckoutInput(null)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors._form).toBeDefined()
  })
})
