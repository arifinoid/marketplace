"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { LoaderCircleIcon } from "lucide-react"
import { ApiError, apiPost, apiUpload } from "@/lib/api/client"
import { CATEGORIES } from "@/lib/categories"
import type { Listing } from "@/lib/listings/types"
import { validateListingInput } from "@/lib/listings/validation"
import { assertUploadAllowed } from "@/lib/upload/guards"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PhotoField } from "./photo-field"
import { ListingSummary, PhotoPreview } from "./listing-preview"

type FieldName =
  | "title"
  | "description"
  | "price"
  | "category"
  | "seller_email"
  | "image_url"

type FieldErrors = Partial<Record<FieldName, string>>

function fieldErrorProps(name: FieldName, errors: FieldErrors) {
  const message = errors[name]

  return {
    "aria-invalid": message ? true : undefined,
    "aria-describedby": message ? `listing-${name}-error` : undefined,
  }
}

export function ListingForm() {
  const router = useRouter()

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [price, setPrice] = useState("")
  const [category, setCategory] = useState("")
  const [email, setEmail] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null)
      return
    }

    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  function selectPhoto(file: File | null) {
    setPhotoFile(file)
    setErrors((previous) => ({ ...previous, image_url: undefined }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const result = validateListingInput({
      title,
      description,
      price,
      category,
      seller_email: email,
      image_url: photoFile ? "https://pending.local/photo" : "",
    })

    if (!result.ok) {
      setErrors(result.errors as FieldErrors)
      setFormError("Please fix the highlighted fields.")
      return
    }

    setErrors({})
    setFormError(null)
    setSubmitting(true)

    try {
      const value = result.value
      const guard = assertUploadAllowed(photoFile as File)
      if (!guard.ok) {
        setErrors({ image_url: guard.message })
        setFormError("Please fix the highlighted fields.")
        setSubmitting(false)
        return
      }

      const { url } = await apiUpload<{ url: string }>(
        "/api/upload",
        photoFile as File,
      )
      const listing = await apiPost<Listing>("/api/listings", {
        title: value.title,
        description: value.description,
        price: value.price,
        category: value.category,
        seller_email: value.seller_email,
        image_url: url,
      })

      router.push(`/item/${listing.id}`)
    } catch (caught) {
      if (caught instanceof ApiError) {
        setErrors((caught.errors as FieldErrors) ?? {})
        setFormError(
          caught.errors
            ? "Please fix the highlighted fields."
            : caught.message,
        )
      } else {
        setFormError("Something went wrong. Please try again.")
      }
      setSubmitting(false)
    }
  }

  const uploading = submitting

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="grid items-start gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_20rem]"
    >
      <section
        aria-label="Listing details"
        className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4"
      >
        <h2 className="text-base font-medium">Listing details</h2>

        <PhotoField
          previewUrl={photoPreview}
          fileName={photoFile?.name ?? null}
          onSelect={selectPhoto}
          error={errors.image_url}
          disabled={submitting}
        />

        <div className="flex flex-col gap-2">
          <Label htmlFor="listing-title">Title</Label>
          <Input
            id="listing-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Bike 24 inch"
            maxLength={255}
            disabled={submitting}
            {...fieldErrorProps("title", errors)}
          />
          {errors.title && (
            <p
              id="listing-title-error"
              className="text-sm text-destructive"
            >
              {errors.title}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="listing-price">Price</Label>
            <Input
              id="listing-price"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="99"
              inputMode="decimal"
              autoComplete="off"
              disabled={submitting}
              {...fieldErrorProps("price", errors)}
            />
            {errors.price && (
              <p
                id="listing-price-error"
                className="text-sm text-destructive"
              >
                {errors.price}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="listing-category">Category</Label>
            <Select
              value={category || undefined}
              onValueChange={(value) => {
                if (value) setCategory(value)
              }}
              disabled={submitting}
            >
              <SelectTrigger
                id="listing-category"
                className="w-full"
                aria-invalid={errors.category ? true : undefined}
                aria-describedby={
                  errors.category ? "listing-category-error" : undefined
                }
              >
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((item) => (
                  <SelectItem key={item.slug} value={item.slug}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && (
              <p
                id="listing-category-error"
                className="text-sm text-destructive"
              >
                {errors.category}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="listing-email">Your email</Label>
          <Input
            id="listing-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            maxLength={254}
            disabled={submitting}
            {...fieldErrorProps("seller_email", errors)}
          />
          {errors.seller_email && (
            <p
              id="listing-seller_email-error"
              className="text-sm text-destructive"
            >
              {errors.seller_email}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="listing-description">Description</Label>
          <Textarea
            id="listing-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Condition, what is included, and pickup details."
            maxLength={5000}
            disabled={submitting}
            {...fieldErrorProps("description", errors)}
          />
          {errors.description && (
            <p
              id="listing-description-error"
              className="text-sm text-destructive"
            >
              {errors.description}
            </p>
          )}
        </div>

        {formError && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </p>
        )}

        <Button
          type="submit"
          disabled={submitting}
          className="w-full sm:self-start sm:w-auto"
        >
          {uploading && (
            <LoaderCircleIcon
              aria-hidden="true"
              className="animate-spin motion-reduce:animate-none"
            />
          )}
          {uploading ? "Posting…" : "Next"}
        </Button>
      </section>

      <PhotoPreview photoUrl={photoPreview} title={title.trim()} />

      <ListingSummary title={title.trim()} price={price} email={email.trim()} />
    </form>
  )
}
