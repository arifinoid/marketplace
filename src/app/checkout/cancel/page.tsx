import Link from "next/link"
import { notFound } from "next/navigation"
import { XCircleIcon } from "lucide-react"
import { parseUuid } from "@/lib/api/params"

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function CheckoutCancelPage({
  searchParams,
}: PageProps) {
  const params = await searchParams
  const sessionId = typeof params.session_id === "string" ? params.session_id : ""
  if (!sessionId) notFound()

  const listingId = parseUuid(
    typeof params.listing_id === "string" ? params.listing_id : null,
  )

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 py-6 md:px-6">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-12 text-center">
        <XCircleIcon aria-hidden="true" className="size-8 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Checkout cancelled</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          You were not charged, and the listing is still available.
        </p>
      </div>

      <div className="flex flex-col gap-2 text-sm">
        {listingId && (
          <Link href={`/item/${listingId}`} className="font-medium text-fb hover:underline">
            Back to the listing
          </Link>
        )}
        <Link href="/" className="text-muted-foreground hover:underline">
          Browse other listings
        </Link>
      </div>
    </section>
  )
}
