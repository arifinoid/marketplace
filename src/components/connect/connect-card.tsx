"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Loader2Icon, PartyPopperIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { ConnectStatus } from "@/lib/connect/types"

type Phase =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string }

export function ConnectCard() {
  const params = useSearchParams()
  // Stripe sends the seller back here after onboarding; the email rides along
  // in the return URL so the page knows whose status to show.
  const returnedEmail = params.get("email") ?? ""

  const [email, setEmail] = useState(returnedEmail)
  const [status, setStatus] = useState<ConnectStatus | null>(null)
  const [phase, setPhase] = useState<Phase>({ kind: "idle" })

  useEffect(() => {
    if (!returnedEmail) return
    let cancelled = false

    fetch(`/api/connect/status?email=${encodeURIComponent(returnedEmail)}`)
      .then((response) => response.json())
      .then((body: { data?: ConnectStatus }) => {
        if (!cancelled) setStatus(body.data ?? null)
      })
      .catch(() => {
        if (!cancelled) setStatus(null)
      })

    return () => {
      cancelled = true
    }
  }, [returnedEmail])

  async function startOnboarding(event: React.FormEvent) {
    event.preventDefault()
    setPhase({ kind: "submitting" })

    try {
      const response = await fetch("/api/connect/account-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const body = (await response.json().catch(() => null)) as {
        data?: { url?: string }
        error?: { message?: string }
      } | null

      if (!response.ok || !body?.data?.url) {
        throw new Error(body?.error?.message ?? "Could not start onboarding")
      }

      // Stripe hosts the onboarding pages, so leave the app entirely.
      window.location.href = body.data.url
    } catch (error) {
      setPhase({
        kind: "error",
        message:
          error instanceof Error ? error.message : "Could not start onboarding",
      })
    }
  }

  const connected = status?.connected === true
  const chargesEnabled = status?.chargesEnabled === true

  return (
    <div className="flex flex-col gap-4">
      {connected && chargesEnabled ? (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4"
        >
          <p className="flex items-center gap-2 font-medium text-foreground">
            <PartyPopperIcon aria-hidden="true" className="size-5 text-fb" />
            Your Stripe account is connected
          </p>
          <p className="text-sm text-muted-foreground">
            Buyers can now purchase your listings. The platform fee is 10% and the
            rest is paid out to your connected account.
          </p>
        </div>
      ) : (
        <form
          onSubmit={startOnboarding}
          className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4"
        >
          <div className="flex flex-col gap-1">
            <Label htmlFor="connect-email">Seller email</Label>
            <p className="text-sm text-muted-foreground">
              Use the email on your listings. Every listing with that email gets a
              Buy Now button once you are connected.
            </p>
          </div>

          <Input
            id="connect-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          {connected && !chargesEnabled && (
            <p className="text-sm text-muted-foreground">
              We found your account, but Stripe has not finished onboarding yet.
              Pick up where you left off.
            </p>
          )}

          {phase.kind === "error" && (
            <p role="alert" className="text-sm text-destructive">
              {phase.message}
            </p>
          )}

          <Button type="submit" disabled={phase.kind === "submitting"}>
            {phase.kind === "submitting" ? (
              <Loader2Icon aria-hidden="true" className="animate-spin" />
            ) : null}
            {connected ? "Continue onboarding" : "Connect with Stripe"}
          </Button>
        </form>
      )}
    </div>
  )
}
