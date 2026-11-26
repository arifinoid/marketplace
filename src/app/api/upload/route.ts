import { NextRequest } from "next/server"
import {
  badRequest,
  created,
  payloadTooLarge,
  serverError,
  unsupportedMediaType,
} from "@/lib/api/response"
import { getSupabase } from "@/lib/supabase/server"
import { assertUploadAllowed, buildStoragePath } from "@/lib/upload/guards"

const BUCKET = "listing-images"

export async function POST(request: NextRequest) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return badRequest("Expected multipart form data")
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    return badRequest("A photo file is required")
  }

  const guard = assertUploadAllowed(file)
  if (!guard.ok) {
    if (guard.status === 413) return payloadTooLarge(guard.message)
    if (guard.status === 415) return unsupportedMediaType(guard.message)
    return badRequest(guard.message)
  }

  const path = buildStoragePath(file.name, file.type, crypto.randomUUID())

  try {
    const supabase = getSupabase()
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

    if (error) {
      console.error(`POST /api/upload failed for ${path}:`, error)
      return serverError()
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return created({ url: data.publicUrl })
  } catch (error) {
    console.error("POST /api/upload failed:", error)
    return serverError()
  }
}
