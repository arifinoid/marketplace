"use client"

import { useState } from "react"
import { LoaderCircleIcon } from "lucide-react"
import { ApiError, apiPost } from "@/lib/api/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { validateCheckoutInput } from "@/lib/orders/validation"

interface BuyNowFormProps {
  listingId: string
}

/**
 * Starts Stripe Checkout for this listing. Stripe hosts the payment page, so a
 * successful response is a full-page redirect rather than an in-place update.
 */
export function BuyNowForm({ listingId }: BuyNowFormProps) {
  const [email, setEmail] = useState("")
  const [opening, setOpening] = useState(false)
  const [errors, setErrors] = useState<{ buyer_email?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (opening) return

    const result = validateCheckoutInput({ listing_id: listingId, buyer_email: email })
    if (!result.ok) {
      setErrors(result.errors as { buyer_email?: string })
      setFormError("Please fix the highlighted fields.")
      return
    }

    setErrors({})
    setFormError(null)
    setOpening(true)

    try {
      const { url } = await apiPost<{ url: string }>(
        "/api/checkout",
        result.value,
      )
      window.location.href = url
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors((caught.errors as { buyer_email?: string }) ?? {})
        setFormError(
          caught.errors ? "Please fix the highlighted fields." : caught.message,
        )
      } else {
        setFormError("Could not open checkout. Please try again.")
      }
      setOpening(false)
    }
  }

  const emailError = errors.buyer_email

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <h2 className="text-sm font-medium">Buy it now</h2>

      <div className="flex flex-col gap-2">
        {/* "Buyer email", not "Your email": the message form below uses that
            label, and two identical labels would be ambiguous for a screen
            reader and for tests. */}
        <Label htmlFor="buyer-email">Buyer email</Label>
        <Input
          id="buyer-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={254}
          disabled={opening}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "buyer-email-error" : undefined}
        />
        {emailError && (
          <p id="buyer-email-error" className="text-sm text-destructive">
            {emailError}
          </p>
        )}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={opening} className="w-full">
        {opening && (
          <LoaderCircleIcon
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
        )}
        {opening ? "Opening checkout…" : "Buy Now"}
      </Button>
    </form>
  )
}
