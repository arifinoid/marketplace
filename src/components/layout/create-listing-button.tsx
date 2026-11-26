import Link from "next/link"
import { PlusIcon } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * The way into `/create`. Rendered in the sidebar on desktop and in the
 * hamburger drawer on mobile, so the shell always exposes the one action the
 * brief is about — without it the create flow was only reachable by URL.
 *
 * A `Link` carrying the button styles rather than `Button render={<Link />}`:
 * Base UI's button passes `type="button"` and `tabindex` onto the anchor.
 */
export function CreateListingButton() {
  return (
    <Link
      href="/create"
      className={cn(buttonVariants({ size: "lg" }), "w-full gap-2")}
    >
      <PlusIcon aria-hidden="true" />
      Create new listing
    </Link>
  )
}
