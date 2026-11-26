"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { CATEGORIES } from "@/lib/categories"
import { cn } from "@/lib/utils"

export function CategoryNav() {
  const searchParams = useSearchParams()
  const activeSlug = searchParams.get("category")

  return (
    <nav aria-label="Categories" className="flex flex-col">
      <p className="px-3 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Categories
      </p>
      <ul className="flex flex-col">
        {CATEGORIES.map((category) => {
          const isActive = activeSlug === category.slug

          return (
            <li key={category.slug}>
              <Link
                href={`/?category=${category.slug}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "block rounded-md px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted",
                  isActive && "bg-fb-soft font-medium text-fb hover:bg-fb-soft",
                )}
              >
                {category.name}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
