export interface Category {
  id?: string
  slug: string
  name: string
  sort_order?: number
}

/**
 * Fixed category list shown in the sidebar and used to filter the grid.
 * Mirrors the seed in DATABASE.md / supabase/schema.sql; keep the order in
 * sync with `sort_order`.
 */
export const CATEGORIES: Category[] = [
  { slug: "vehicles", name: "Vehicles" },
  { slug: "property-rentals", name: "Property Rentals" },
  { slug: "apparel", name: "Apparel" },
  { slug: "classifieds", name: "Classifieds" },
  { slug: "electronics", name: "Electronics" },
  { slug: "entertainment", name: "Entertainment" },
  { slug: "family", name: "Family" },
  { slug: "free-stuff", name: "Free Stuff" },
  { slug: "garden-outdoor", name: "Garden & Outdoor" },
  { slug: "hobbies", name: "Hobbies" },
  { slug: "home-goods", name: "Home Goods" },
  { slug: "home-improvement", name: "Home Improvement" },
  { slug: "home-sales", name: "Home Sales" },
  { slug: "musical-instruments", name: "Musical Instruments" },
  { slug: "office-supplies", name: "Office Supplies" },
  { slug: "pet-supplies", name: "Pet Supplies" },
  { slug: "sporting-goods", name: "Sporting Goods" },
  { slug: "toys-games", name: "Toys & Games" },
  { slug: "buy-and-sell-groups", name: "Buy and sell groups" },
]

export const CATEGORY_SLUGS: string[] = CATEGORIES.map((category) => category.slug)

export function isCategorySlug(value: string): boolean {
  return CATEGORY_SLUGS.includes(value)
}

export function findCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find((category) => category.slug === slug)
}
