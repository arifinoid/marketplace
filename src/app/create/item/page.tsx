import Link from "next/link"
import { XIcon } from "lucide-react"
import { ListingForm } from "@/components/create/listing-form"

export default function CreateItemPage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">
          Create new listing
        </h1>
        <Link
          href="/"
          aria-label="Close create listing"
          className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <XIcon aria-hidden="true" className="size-4" />
        </Link>
      </div>

      <ListingForm />
    </div>
  )
}
