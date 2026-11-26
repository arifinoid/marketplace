import { notFound } from "next/navigation"
import { parseUuid } from "@/lib/api/params"
import { getListing } from "@/lib/listings/queries"
import { ListingDetail } from "@/components/item/listing-detail"
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

  return (
    <div className="mx-auto max-w-6xl">
      <ListingDetail listing={listing}>
        <MessageForm listingId={listing.id} />
      </ListingDetail>
    </div>
  )
}
