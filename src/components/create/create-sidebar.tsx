"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { XIcon } from "lucide-react"
import { Logo } from "@/components/layout/logo"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const LISTING_TYPES = [
  { value: "item", label: "Item for sale" },
  { value: "multiple", label: "Create multiple listings" },
  { value: "vehicle", label: "Vehicle for sale" },
  { value: "home", label: "Home for sale or rent" },
]

export function CreateSidebar() {
  const router = useRouter()

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 border-b border-border bg-surface p-5 lg:h-screen lg:w-80 lg:border-r lg:border-b-0">
      <div className="flex items-center justify-between gap-3">
        <Logo />
        <Link
          href="/"
          aria-label="Close create listing"
          className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <XIcon aria-hidden="true" className="size-4" />
        </Link>
      </div>

      <h1 className="text-lg font-semibold tracking-tight">
        Create new listing
      </h1>

      <div className="flex flex-col gap-2">
        <Label htmlFor="listing-type">Choose listing type</Label>
        <Select
          value="item"
          onValueChange={(value) => {
            if (value === "item") router.push("/create/item")
          }}
        >
          <SelectTrigger id="listing-type" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LISTING_TYPES.map((type) => (
              <SelectItem
                key={type.value}
                value={type.value}
                disabled={type.value !== "item"}
              >
                {type.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
        <span className="px-2 py-1.5">Your listings</span>
        <span className="px-2 py-1.5">Seller help</span>
      </div>
    </aside>
  )
}
