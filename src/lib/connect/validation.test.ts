import { describe, expect, it } from "vitest"
import { parseEmailParam, validateConnectEmail } from "./validation"

describe("validateConnectEmail", () => {
  it("accepts a valid email", () => {
    const result = validateConnectEmail({ email: "wei@example.com" })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.email).toBe("wei@example.com")
  })

  it("trims and lowercases so one seller maps to one account", () => {
    const result = validateConnectEmail({ email: "  Wei@Example.COM  " })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.email).toBe("wei@example.com")
  })

  it("rejects an invalid email", () => {
    const result = validateConnectEmail({ email: "not-an-email" })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.email).toBeDefined()
  })

  it("rejects a missing email", () => {
    const result = validateConnectEmail({})

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.email).toBeDefined()
  })

  it("rejects a non-object body", () => {
    const result = validateConnectEmail(null)

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors._form).toBeDefined()
  })
})

describe("parseEmailParam", () => {
  it("normalises a usable email", () => {
    expect(parseEmailParam(" Wei@Example.com ")).toBe("wei@example.com")
  })

  it("returns null for an invalid email", () => {
    expect(parseEmailParam("nope")).toBeNull()
  })

  it("returns null for an absent email", () => {
    expect(parseEmailParam(null)).toBeNull()
  })
})
