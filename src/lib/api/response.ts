import { NextResponse } from "next/server"
import { PUBLIC_CACHE_CONTROL } from "./cache-policy"

interface ErrorBody {
  error: {
    code: string
    message: string
    errors?: Record<string, string>
  }
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  errors?: Record<string, string>,
): NextResponse<ErrorBody> {
  return NextResponse.json<ErrorBody>(
    { error: { code, message, errors } },
    { status },
  )
}

export function ok<T>(data: T): NextResponse {
  return NextResponse.json({ data })
}

/** CDN-cache a successful GET response. See `cache-policy.ts`. */
export function okWithCache<T>(data: T): NextResponse {
  return NextResponse.json(
    { data },
    { headers: { "Cache-Control": PUBLIC_CACHE_CONTROL } },
  )
}

export function created<T>(data: T): NextResponse {
  return NextResponse.json({ data }, { status: 201 })
}

export function badRequest(
  message: string,
  errors?: Record<string, string>,
): NextResponse<ErrorBody> {
  return errorResponse(400, "bad_request", message, errors)
}

export function notFound(message = "Not found"): NextResponse<ErrorBody> {
  return errorResponse(404, "not_found", message)
}

/** 409 — the request is valid but conflicts with the current state. */
export function conflict(message: string): NextResponse<ErrorBody> {
  return errorResponse(409, "conflict", message)
}

export function payloadTooLarge(message: string): NextResponse<ErrorBody> {
  return errorResponse(413, "payload_too_large", message)
}

export function unsupportedMediaType(
  message: string,
): NextResponse<ErrorBody> {
  return errorResponse(415, "unsupported_media_type", message)
}

export function serverError(): NextResponse<ErrorBody> {
  return errorResponse(500, "server_error", "Something went wrong")
}
