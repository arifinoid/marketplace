"use client"

import { Suspense } from "react"
import { MenuIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { CategoryNav } from "./category-nav"
import { CreateListingButton } from "./create-listing-button"
import { Logo } from "./logo"

export function MobileNav() {
  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="outline" size="icon" aria-label="Open categories" />}
      >
        <MenuIcon />
      </DialogTrigger>
      <DialogContent className="flex flex-col gap-5 sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>
            <Logo />
          </DialogTitle>
        </DialogHeader>
        <CreateListingButton />
        <Suspense fallback={null}>
          <CategoryNav />
        </Suspense>
      </DialogContent>
    </Dialog>
  )
}
