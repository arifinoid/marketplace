import { Browse } from "@/components/browse/browse"
import { findCategoryBySlug } from "@/lib/categories"
import { listListings } from "@/lib/listings/queries"
import type { ListListingsResult } from "@/lib/listings/types"

const EMPTY_RESULT: ListListingsResult = { data: [], total: 0 }

interface HomePageProps {
  searchParams: Promise<{ category?: string; q?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { category, q } = await searchParams

  const activeCategory =
    category && findCategoryBySlug(category) ? category : undefined
  const query = q?.trim() ? q.trim().slice(0, 200) : undefined

  let initialData = EMPTY_RESULT
  let initialError: string | null = null

  try {
    initialData = await listListings({
      category: activeCategory,
      q: query,
    })
  } catch (caught) {
    console.error("Failed to load listings:", caught)
    initialError = "Could not load listings. Check your connection and try again."
  }

  return (
    <Browse
      initialCategory={activeCategory ?? ""}
      initialQuery={query ?? ""}
      initialData={initialData}
      initialError={initialError}
    />
  )
}
