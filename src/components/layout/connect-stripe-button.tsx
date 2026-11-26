import Link from "next/link"
import { CircleDollarSignIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * The way into `/connect`. Rendered in the sidebar on desktop and in the
 * hamburger drawer on mobile, mirroring `CreateListingButton`.
 *
 * A `Link` carrying the button styles rather than `Button render={<Link />}`:
 * Base UI's button passes `type="button"` and `tabindex` onto the anchor.
 */
export function ConnectStripeButton() {
  return (
    <Link
      href="/connect"
      className={cn(buttonVariants({ variant: "outline", size: "lg" }), "w-full gap-2")}
    >
      <CircleDollarSignIcon aria-hidden="true" />
      Connect with Stripe
    </Link>
  )
}
