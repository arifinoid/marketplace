import { formatPrice } from "@/lib/listings/format"
import { DEFAULT_LOCATION } from "@/lib/listings/constants"
import { parsePrice } from "@/lib/listings/validation"

interface PhotoPreviewProps {
  photoUrl: string | null
  title: string
}

export function PhotoPreview({ photoUrl, title }: PhotoPreviewProps) {
  return (
    <section aria-label="Preview" className="flex flex-col gap-2">
      <span className="text-sm font-medium">Preview</span>
      <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
        {photoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={photoUrl}
            alt={title ? `Photo of ${title}` : "Selected photo"}
            className="size-full object-cover"
          />
        ) : (
          <div className="grid size-full place-items-center px-6 text-center text-sm text-muted-foreground">
            No photo selected
          </div>
        )}
      </div>
    </section>
  )
}

interface ListingSummaryProps {
  title: string
  price: string
  email: string
}

export function ListingSummary({
  title,
  price,
  email,
}: ListingSummaryProps) {
  const parsedPrice = parsePrice(price)

  return (
    <section aria-label="Summary" className="flex flex-col gap-4">
      <span className="text-sm font-medium">Summary</span>

      <dl className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Title</dt>
          <dd className="text-sm text-foreground">{title || "—"}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Price</dt>
          <dd className="text-sm font-medium text-foreground">
            {parsedPrice === null ? "—" : formatPrice(parsedPrice)}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs text-muted-foreground">Listed</dt>
          <dd className="text-sm text-foreground">
            Listed 1 hour ago in {DEFAULT_LOCATION}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-1 border-t border-border pt-4">
        <h3 className="text-sm font-medium">Seller information</h3>
        <p className="text-sm text-muted-foreground break-all">
          {email || "Your email"}
        </p>
      </div>
    </section>
  )
}
