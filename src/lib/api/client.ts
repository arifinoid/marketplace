export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly errors?: Record<string, string>,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

interface ErrorBody {
  error?: {
    message?: string
    errors?: Record<string, string>
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as ErrorBody | null
  const error = body?.error

  return new ApiError(
    error?.message ?? `Request failed with status ${response.status}`,
    response.status,
    error?.errors,
  )
}

async function readData<T>(response: Response): Promise<T> {
  const body = (await response.json().catch(() => null)) as { data?: T } | null
  return body?.data as T
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })

  if (!response.ok) throw await toApiError(response)
  return readData<T>(response)
}

/**
 * Multipart upload. The browser sets the `Content-Type` boundary, so this must
 * not go through `request`, which forces a JSON header.
 */
export async function apiUpload<T = { url: string }>(
  path: string,
  file: File,
): Promise<T> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(path, { method: "POST", body: formData })

  if (!response.ok) throw await toApiError(response)
  return readData<T>(response)
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path)
}

export function apiPost<T>(path: string, payload: unknown): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(payload),
  })
}
