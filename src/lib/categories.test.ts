import { describe, expect, it } from "vitest"
import { CATEGORIES, findCategoryBySlug, isCategorySlug } from "./categories"

describe("categories", () => {
  it("contains the 19 mockup categories in order", () => {
    expect(CATEGORIES).toHaveLength(19)
    expect(CATEGORIES[0].slug).toBe("vehicles")
    expect(CATEGORIES.at(-1)?.slug).toBe("buy-and-sell-groups")
  })

  it("recognises known slugs only", () => {
    expect(isCategorySlug("electronics")).toBe(true)
    expect(isCategorySlug("nope")).toBe(false)
  })

  it("finds a category by slug", () => {
    expect(findCategoryBySlug("electronics")?.name).toBe("Electronics")
    expect(findCategoryBySlug("nope")).toBeUndefined()
  })
})
