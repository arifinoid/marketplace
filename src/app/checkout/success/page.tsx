import Link from "next/link"
import { notFound } from "next/navigation"
import { CheckCircle2Icon } from "lucide-react"
import { formatCents } from "@/lib/stripe/money"
import { findOrderBySession } from "@/lib/orders/queries"
import { getListing } from "@/lib/listings/queries"
import { CheckoutPending } from "@/components/checkout/checkout-pending"

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CheckoutSuccessPage({
  searchParams,
}: PageProps) {
  const params = await searchParams
  const sessionId = typeof params.session_id === "string" ? params.session_id : ""
  if (!sessionId) notFound()

  const order = await findOrderBySession(sessionId)
  if (!order) return <CheckoutPending />

  const listing = await getListing(order.listing_id)

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6 md:px-6">
      <div
        role="status"
        aria-live="polite"
        className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-center"
      >
        <CheckCircle2Icon aria-hidden="true" className="size-8 text-fb" />
        <h1 className="text-xl font-semibold tracking-tight">
          Payment confirmed
        </h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          The order is saved and the seller is paid out minus the 10% platform
          fee. {listing ? "The listing now shows as Sold." : ""}
        </p>
      </div>

      <div className="flex flex-col gap-1 rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Order</p>
        <p className="font-medium text-foreground">
          {listing?.title ?? "Listing removed"}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatCents(order.amount_cents)} · buyer {order.buyer_email}
        </p>
      </div>

      {listing && (
        <Link
          href={`/item/${listing.id}`}
          className="text-sm font-medium text-fb hover:underline"
        >
          View the listing
        </Link>
      )}
    </section>
  )
}
