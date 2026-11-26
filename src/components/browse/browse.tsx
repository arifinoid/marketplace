"use client"

import { useEffect, useRef, useState } from "react"
import { SearchIcon } from "lucide-react"
import { ApiError, apiGet } from "@/lib/api/client"
import { findCategoryBySlug } from "@/lib/categories"
import type { ListListingsResult } from "@/lib/listings/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ListingCard } from "./listing-card"

const SEARCH_DEBOUNCE_MS = 300
const SKELETON_COUNT = 8

interface BrowseProps {
  /** Category slug from `?category=`; "" means all listings. */
  initialCategory: string
  /** Keyword from `?q=`, used as the search box's starting value. */
  initialQuery: string
  /** Server-rendered first page so the grid paints without a round trip. */
  initialData: ListListingsResult
  initialError: string | null
}

function buildListingsUrl(category: string, q: string): string {
  const params = new URLSearchParams()
  if (category) params.set("category", category)
  if (q) params.set("q", q)

  const query = params.toString()
  return query ? `/api/listings?${query}` : "/api/listings"
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return "Could not load listings. Try again."
}

export function Browse({
  initialCategory,
  initialQuery,
  initialData,
  initialError,
}: BrowseProps) {
  const [query, setQuery] = useState(initialQuery)
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery)
  const [result, setResult] = useState<ListListingsResult>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialError)
  const [retryToken, setRetryToken] = useState(0)

  const heading = initialCategory
    ? (findCategoryBySlug(initialCategory)?.name ?? "Today's picks")
    : "Today's picks"

  const hasData = result.data.length > 0
  // Skip the very first fetch: the server already rendered this exact filter.
  const lastFetched = useRef<string | null>(
    `${initialCategory}|${initialQuery}`,
  )

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [query])

  // A hard navigation with a different `?q=` replaces the search term.
  const previousInitialQuery = useRef(initialQuery)
  useEffect(() => {
    if (previousInitialQuery.current === initialQuery) return
    previousInitialQuery.current = initialQuery
    setQuery(initialQuery)
    setDebouncedQuery(initialQuery)
  }, [initialQuery])

  useEffect(() => {
    const key = `${initialCategory}|${debouncedQuery}`
    if (lastFetched.current === key) return
    lastFetched.current = key

    let cancelled = false
    setLoading(true)
    setError(null)

    apiGet<ListListingsResult>(
      buildListingsUrl(initialCategory, debouncedQuery),
    )
      .then((data) => {
        if (cancelled) return
        setResult(data)
        setLoading(false)
      })
      .catch((caught: unknown) => {
        if (cancelled) return
        // Allow the retry button to re-run the same filter.
        lastFetched.current = null
        setError(errorMessage(caught))
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [initialCategory, debouncedQuery, retryToken])

  const showSkeletons = loading && !hasData
  const showError = error !== null && !hasData

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">{heading}</h1>
          <p
            role="status"
            aria-live="polite"
            className="min-h-5 text-sm text-muted-foreground"
          >
            {loading && hasData
              ? "Updating listings…"
              : `${result.total} ${result.total === 1 ? "listing" : "listings"}`}
          </p>
        </div>

        <div className="w-full sm:w-72">
          <label htmlFor="listing-search" className="sr-only">
            Search listings
          </label>
          <div className="relative">
            <SearchIcon
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="listing-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search listings"
              autoComplete="off"
              className="pl-8"
            />
          </div>
        </div>
      </div>

      {showError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRetryToken((token) => token + 1)}
          >
            Try again
          </Button>
        </div>
      )}

      {error !== null && hasData && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {showSkeletons ? (
        <div
          aria-busy="true"
          aria-label="Loading listings"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        >
          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              <Skeleton className="aspect-square w-full rounded-2xl" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : hasData ? (
        <div
          aria-busy={loading}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
        >
          {result.data.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        !showError && (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <p className="text-base font-medium">No listings yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {initialCategory
                ? "Nothing in this category yet — try another one or check back later."
                : "Be the first to post one. List an item with a photo, a price, and your email."}
            </p>
          </div>
        )
      )}
    </section>
  )
}
