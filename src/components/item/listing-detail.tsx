import { formatListedAgo, formatPrice } from "@/lib/listings/format"
import type { Listing } from "@/lib/listings/types"
import { Badge } from "@/components/ui/badge"

interface ListingDetailProps {
  listing: Listing
  /** Message form (client) rendered at the bottom of the right rail. */
  children: React.ReactNode
}

export function ListingDetail({ listing, children }: ListingDetailProps) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="overflow-hidden rounded-2xl border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={listing.image_url}
          alt={listing.title}
          className="aspect-square size-full object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {listing.title}
            </h1>
            {listing.sold && <Badge variant="secondary">Sold</Badge>}
          </div>
          <p className="text-xl font-semibold text-foreground">
            {formatPrice(listing.price)}
          </p>
          <p className="text-sm text-muted-foreground">
            {formatListedAgo(listing.created_at, listing.location)}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">Description</h2>
          <p className="text-sm whitespace-pre-wrap text-foreground">
            {listing.description}
          </p>
        </div>

        <div className="flex flex-col gap-1 border-t border-border pt-4">
          <h2 className="text-sm font-medium">Seller information</h2>
          <p className="text-sm break-all text-muted-foreground">
            {listing.seller_email}
          </p>
        </div>

        {children}
      </div>
    </div>
  )
}
