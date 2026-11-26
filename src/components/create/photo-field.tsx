"use client"

import { useRef, useState } from "react"
import { ImagePlusIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PhotoFieldProps {
  previewUrl: string | null
  fileName: string | null
  onSelect: (file: File | null) => void
  error?: string
  disabled?: boolean
}

export function PhotoField({
  previewUrl,
  fileName,
  onSelect,
  error,
  disabled = false,
}: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function pick(files: FileList | null) {
    if (!files || files.length === 0) return
    onSelect(files[0])
  }

  return (
    <div className="flex flex-col gap-2">
      <span id="photo-field-label" className="text-sm font-medium">
        Add photos
      </span>

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          pick(event.dataTransfer.files)
        }}
        aria-describedby={error ? "photo-field-error" : undefined}
        className={cn(
          "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-6 text-center transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          dragging ? "border-fb bg-fb-soft" : "border-border bg-muted/40",
          error && "border-destructive",
        )}
      >
        {previewUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Selected photo preview"
              className="size-24 rounded-xl object-cover ring-1 ring-foreground/10"
            />
            <span className="max-w-full truncate px-2 text-sm text-foreground">
              {fileName ?? "Selected photo"}
            </span>
            <span className="text-xs text-muted-foreground">
              Click or drop a file to replace
            </span>
          </>
        ) : (
          <>
            <ImagePlusIcon
              aria-hidden="true"
              className="size-6 text-muted-foreground"
            />
            <span className="text-sm font-medium text-foreground">
              Add a photo
            </span>
            <span className="text-xs text-muted-foreground">
              JPEG, PNG, or WebP · up to 5 MB
            </span>
          </>
        )}
      </button>

      {previewUrl && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelect(null)}
          className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50"
        >
          <XIcon aria-hidden="true" className="size-3.5" />
          Remove photo
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          pick(event.target.files)
          event.target.value = ""
        }}
      />

      {error && (
        <p id="photo-field-error" role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
