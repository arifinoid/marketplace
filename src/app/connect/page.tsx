import { Suspense } from "react"
import { ConnectCard } from "@/components/connect/connect-card"

export default function ConnectPage() {
  return (
    <section className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 md:px-6">
      <h2 className="text-xl font-semibold tracking-tight">
        Connect with Stripe
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Link a Stripe account to the email on your listings. Buyers then get a
        Buy Now button, and the money lands in that account minus the 10%
        platform fee.
      </p>

      <div className="mt-6">
        {/* The card reads `?step=` and `?email=` from the URL. */}
        <Suspense fallback={null}>
          <ConnectCard />
        </Suspense>
      </div>
    </section>
  )
}
