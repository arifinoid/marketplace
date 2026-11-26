import Link from "next/link"
import { formatPrice } from "@/lib/listings/format"
import type { Listing } from "@/lib/listings/types"

export function ListingCard({ listing }: { listing: Listing }) {
  return (
    <Link
      href={`/item/${listing.id}`}
      className="group flex min-w-0 flex-col rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted transition-shadow hover:shadow-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.image_url}
          alt={listing.title}
          loading="lazy"
          className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-0.5 px-1 pt-2">
        <span className="text-base font-semibold tracking-tight text-foreground">
          {formatPrice(listing.price)}
        </span>
        <span className="line-clamp-2 text-sm text-foreground">
          {listing.title}
        </span>
        <span className="truncate text-sm text-muted-foreground">
          {listing.location}
        </span>
      </div>
    </Link>
  )
}
