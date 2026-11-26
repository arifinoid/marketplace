import { describe, expect, it } from "vitest"
import {
  assertUploadAllowed,
  buildStoragePath,
  MAX_UPLOAD_BYTES,
} from "./guards"

describe("assertUploadAllowed", () => {
  it("accepts a small jpeg", () => {
    expect(assertUploadAllowed({ type: "image/jpeg", size: 1024 }).ok).toBe(
      true,
    )
  })

  it("accepts png and webp", () => {
    expect(assertUploadAllowed({ type: "image/png", size: 1 }).ok).toBe(true)
    expect(assertUploadAllowed({ type: "image/webp", size: 1 }).ok).toBe(true)
  })

  it("rejects an unsupported mime type with 415", () => {
    const result = assertUploadAllowed({
      type: "application/pdf",
      size: 1024,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(415)
      expect(result.message).toMatch(/JPEG/)
    }
  })

  it("rejects an empty file with 400", () => {
    const result = assertUploadAllowed({ type: "image/png", size: 0 })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(400)
  })

  it("rejects a file over 5 MB with 413", () => {
    const result = assertUploadAllowed({
      type: "image/png",
      size: MAX_UPLOAD_BYTES + 1,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(413)
  })

  it("accepts a file exactly at the limit", () => {
    expect(
      assertUploadAllowed({ type: "image/png", size: MAX_UPLOAD_BYTES }).ok,
    ).toBe(true)
  })
})

describe("buildStoragePath", () => {
  it("drops directory traversal and sanitizes the name", () => {
    const path = buildStoragePath(
      "../../etc/passwd",
      "image/png",
      "abc-123",
    )

    expect(path).toBe("listings/abc-123/passwd.png")
  })

  it("uses the mime type for the extension", () => {
    const path = buildStoragePath("photo.jpeg", "image/webp", "id-1")

    expect(path).toBe("listings/id-1/photo.webp")
  })

  it("falls back to a generic name when the filename is empty", () => {
    const path = buildStoragePath("", "image/jpeg", "id-1")

    expect(path).toBe("listings/id-1/listing-image.jpg")
  })

  it("never contains a backslash or a leading dot", () => {
    const path = buildStoragePath("..\\..\\secret", "image/png", "id-1")

    expect(path).not.toContain("\\")
    expect(path).not.toContain("..")
  })
})
