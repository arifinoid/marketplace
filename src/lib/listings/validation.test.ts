import { describe, expect, it } from "vitest"
import { validateMessageInput } from "@/lib/messages/validation"
import { parsePrice, validateListingInput } from "./validation"

const validListing = {
  title: "Bike 24 inch",
  description: "Lightly used, new tires.",
  price: 99,
  category: "sporting-goods",
  seller_email: "wei@example.com",
  image_url: "https://example.com/photo.jpg",
}

describe("validateListingInput", () => {
  it("accepts a valid listing", () => {
    const result = validateListingInput(validListing)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.title).toBe("Bike 24 inch")
      expect(result.value.price).toBe(99)
    }
  })

  it("trims surrounding whitespace", () => {
    const result = validateListingInput({ ...validListing, title: "  Bike  " })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.title).toBe("Bike")
  })

  it("rejects a title shorter than 3 characters", () => {
    const result = validateListingInput({ ...validListing, title: "ab" })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.title).toBeDefined()
  })

  it("rejects a missing description", () => {
    const result = validateListingInput({ ...validListing, description: "" })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.description).toBeDefined()
  })

  it("rejects a negative price", () => {
    const result = validateListingInput({ ...validListing, price: -1 })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.price).toBeDefined()
  })

  it("rejects a price with more than two decimals", () => {
    expect(parsePrice("1.999")).toBeNull()
    expect(parsePrice("1.99")).toBe(1.99)
    expect(parsePrice(20)).toBe(20)
  })

  it("rejects an unknown category", () => {
    const result = validateListingInput({ ...validListing, category: "nope" })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.category).toBeDefined()
  })

  it("rejects an invalid seller email", () => {
    const result = validateListingInput({
      ...validListing,
      seller_email: "not-an-email",
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.seller_email).toBeDefined()
  })

  it("rejects a missing or non-https photo", () => {
    const missing = validateListingInput({ ...validListing, image_url: "" })
    const http = validateListingInput({
      ...validListing,
      image_url: "http://example.com/photo.jpg",
    })

    expect(missing.ok).toBe(false)
    expect(http.ok).toBe(false)
  })

  it("rejects a non-object body", () => {
    const result = validateListingInput(null)

    expect(result.ok).toBe(false)
  })
})

describe("validateMessageInput", () => {
  const validMessage = {
    listing_id: "018f6c2e-8f9a-7b8c-9d0e-1f2a3b4c5d6e",
    buyer_email: "buyer@example.com",
    message: "I want to buy your bike!",
  }

  it("accepts a valid message", () => {
    const result = validateMessageInput(validMessage)

    expect(result.ok).toBe(true)
  })

  it("rejects a non-uuid listing id", () => {
    const result = validateMessageInput({ ...validMessage, listing_id: "123" })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.listing_id).toBeDefined()
  })

  it("rejects an empty message", () => {
    const result = validateMessageInput({ ...validMessage, message: "   " })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.message).toBeDefined()
  })
})
