export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number]

const EXTENSIONS: Record<AllowedImageType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export type UploadGuard =
  | { ok: true }
  | { ok: false; status: 400 | 413 | 415; message: string }

/**
 * Whitelist check on the declared mime type plus a size ceiling. The caller
 * must run this before handing the file to Supabase Storage.
 */
export function assertUploadAllowed(file: {
  type: string
  size: number
}): UploadGuard {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as AllowedImageType)) {
    return {
      ok: false,
      status: 415,
      message: "Only JPEG, PNG, or WebP images are allowed",
    }
  }

  if (file.size <= 0) {
    return { ok: false, status: 400, message: "The file is empty" }
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      status: 413,
      message: "Image must be 5 MB or smaller",
    }
  }

  return { ok: true }
}

/**
 * Build `listings/<uuid>/<name>` for Storage. The directory part of the client
 * filename is dropped and the extension comes from the validated mime type, so
 * a hostile filename cannot escape the folder or masquerade as another type.
 */
export function buildStoragePath(
  filename: string,
  mimeType: string,
  uuid: string,
): string {
  const base = filename.replace(/\\/g, "/").split("/").pop() ?? ""
  const stem = base
    .replace(/\.[^.]*$/, "")
    .replace(/[^A-Za-z0-9_-]/g, "-")
    .replace(/^-+/, "")
    .slice(0, 60)

  const extension = EXTENSIONS[mimeType as AllowedImageType] ?? "jpg"

  return `listings/${uuid}/${stem || "listing-image"}.${extension}`
}
