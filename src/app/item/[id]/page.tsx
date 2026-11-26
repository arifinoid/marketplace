import { notFound } from "next/navigation"
import { parseUuid } from "@/lib/api/params"
import { getListing } from "@/lib/listings/queries"
import { canAcceptPayments } from "@/lib/connect/queries"
import { ListingDetail } from "@/components/item/listing-detail"
import { BuyNowForm } from "@/components/item/buy-now-form"
import { MessageForm } from "@/components/item/message-form"

interface ItemPageProps {
  params: Promise<{ id: string }>
}

export default async function ItemPage({ params }: ItemPageProps) {
  const { id } = await params
  const listingId = parseUuid(id)
  if (!listingId) notFound()

  const listing = await getListing(listingId)
  if (!listing) notFound()

  // Buy Now is only offered when the seller's Stripe account can take charges.
  const sellerReady = await canAcceptPayments(listing.seller_email)

  return (
    <div className="mx-auto max-w-6xl">
      <ListingDetail listing={listing}>
        {sellerReady && !listing.sold && <BuyNowForm listingId={listing.id} />}
        <MessageForm listingId={listing.id} />
      </ListingDetail>
    </div>
  )
}
