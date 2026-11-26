"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircleIcon } from "lucide-react"

const RETRY_INTERVAL_MS = 2_000
const MAX_RETRIES = 10

/**
 * Stripe sends the buyer back as soon as Checkout finishes, which can beat the
 * `checkout.session.completed` webhook that records the order. Re-render a few
 * times so the confirmation appears without making the buyer refresh by hand.
 */
export function CheckoutPending() {
  const router = useRouter()

  useEffect(() => {
    let attempt = 0
    const id = setInterval(() => {
      attempt += 1
      if (attempt >= MAX_RETRIES) {
        clearInterval(id)
        return
      }
      router.refresh()
    }, RETRY_INTERVAL_MS)

    return () => clearInterval(id)
  }, [router])

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card px-6 py-16 text-center"
    >
      <LoaderCircleIcon
        aria-hidden="true"
        className="size-6 animate-spin motion-reduce:animate-none text-fb"
      />
      <p className="text-base font-medium">Confirming your payment…</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        This page updates as soon as Stripe reports the payment. Nothing else is
        needed from you.
      </p>
    </div>
  )
}
