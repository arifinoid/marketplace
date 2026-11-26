"use client"

import { Suspense } from "react"
import { CategoryNav } from "./category-nav"
import { CreateListingButton } from "./create-listing-button"
import { Logo } from "./logo"

export function Sidebar() {
  return (
    <aside className="hidden w-72 shrink-0 border-r border-border bg-sidebar md:flex md:sticky md:top-0 md:h-screen md:flex-col">
      <div className="flex flex-col gap-4 px-4 py-5">
        <Logo />
        <CreateListingButton />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        <Suspense fallback={null}>
          <CategoryNav />
        </Suspense>
      </div>
    </aside>
  )
}
