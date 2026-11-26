"use client"

import { useState } from "react"
import { LoaderCircleIcon } from "lucide-react"
import { ApiError, apiPost } from "@/lib/api/client"
import type { Message } from "@/lib/messages/types"
import { validateMessageInput } from "@/lib/messages/validation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface MessageFormProps {
  listingId: string
}

type FieldErrors = Partial<Record<"buyer_email" | "message", string>>

export function MessageForm({ listingId }: MessageFormProps) {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return

    const result = validateMessageInput({
      listing_id: listingId,
      buyer_email: email,
      message,
    })

    if (!result.ok) {
      setErrors(result.errors as FieldErrors)
      setFormError("Please fix the highlighted fields.")
      return
    }

    setErrors({})
    setFormError(null)
    setSending(true)

    try {
      await apiPost<Message>("/api/messages", result.value)
      setSent(true)
      setMessage("")
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors((caught.errors as FieldErrors) ?? {})
        setFormError(
          caught.errors ? "Please fix the highlighted fields." : caught.message,
        )
      } else {
        setFormError("Something went wrong. Please try again.")
      }
    } finally {
      setSending(false)
    }
  }

  const emailError = errors.buyer_email
  const messageError = errors.message

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4"
    >
      <h2 className="text-sm font-medium">Send seller a message</h2>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message-email">Your email</Label>
        <Input
          id="message-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          maxLength={254}
          disabled={sending}
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? "message-email-error" : undefined}
        />
        {emailError && (
          <p id="message-email-error" className="text-sm text-destructive">
            {emailError}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message-text">Message</Label>
        <Textarea
          id="message-text"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="I want to buy your bike!"
          maxLength={2000}
          disabled={sending}
          aria-invalid={messageError ? true : undefined}
          aria-describedby={messageError ? "message-text-error" : undefined}
        />
        {messageError && (
          <p id="message-text-error" className="text-sm text-destructive">
            {messageError}
          </p>
        )}
      </div>

      <p
        role="status"
        aria-live="polite"
        className="min-h-5 text-sm text-fb"
      >
        {sent ? "Message sent. The seller will reply to your email." : ""}
      </p>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <Button type="submit" disabled={sending} className="w-full sm:self-start">
        {sending && (
          <LoaderCircleIcon
            aria-hidden="true"
            className="animate-spin motion-reduce:animate-none"
          />
        )}
        {sending ? "Sending…" : "Send"}
      </Button>
    </form>
  )
}
