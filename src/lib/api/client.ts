export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

interface ErrorBody {
  error?: { message?: string }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...init,
  })

  const body = (await response.json().catch(() => null)) as ErrorBody | null

  if (!response.ok) {
    throw new ApiError(
      body?.error?.message ?? `Request failed with status ${response.status}`,
      response.status,
    )
  }

  return (body as { data?: T } | null)?.data as T
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
