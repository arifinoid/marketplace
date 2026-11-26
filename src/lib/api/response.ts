import { NextResponse } from "next/server"

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

export function serverError(): NextResponse<ErrorBody> {
  return errorResponse(500, "server_error", "Something went wrong")
}
