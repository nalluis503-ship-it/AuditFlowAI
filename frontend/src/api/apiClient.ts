export type ApiErrorBody = {
  code?: string
  details?: Record<string, unknown>
}

type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
  error?: ApiErrorBody | null
}

type ErrorDetail = {
  msg?: string
}

export class ApiClientError extends Error {
  readonly status: number
  readonly code: string | null
  readonly details: Record<string, unknown>

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    details: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
    this.code = code
    this.details = details
  }
}

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? ''
).replace(/\/+$/, '')

export function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getErrorMessage(
  payload: unknown,
  fallback: string,
) {
  if (!isRecord(payload)) return fallback

  if (typeof payload.detail === 'string') {
    return payload.detail
  }

  if (Array.isArray(payload.detail)) {
    const messages = payload.detail
      .filter(isRecord)
      .map((detail) => (detail as ErrorDetail).msg)
      .filter((message): message is string =>
        typeof message === 'string',
      )

    if (messages.length > 0) {
      return messages.join('. ')
    }
  }

  if (typeof payload.message === 'string') {
    return payload.message
  }

  return fallback
}

async function readJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    return null
  }

  try {
    return await response.json() as unknown
  } catch {
    return null
  }
}

function readApiError(
  payload: unknown,
): ApiErrorBody | null {
  if (!isRecord(payload) || !isRecord(payload.error)) {
    return null
  }

  return {
    code:
      typeof payload.error.code === 'string'
        ? payload.error.code
        : undefined,
    details: isRecord(payload.error.details)
      ? payload.error.details
      : undefined,
  }
}

function isApiEnvelope<T>(
  value: unknown,
  isData: (data: unknown) => data is T,
): value is ApiEnvelope<T> {
  return (
    isRecord(value)
    && typeof value.success === 'boolean'
    && typeof value.message === 'string'
    && isData(value.data)
  )
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit,
  isData: (data: unknown) => data is T,
  signal?: AbortSignal,
): Promise<T> {
  let response: Response

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }

    throw new ApiClientError(
      'No fue posible conectar con el backend de AuditFlow.',
      0,
    )
  }

  const payload = await readJsonResponse(response)
  const apiError = readApiError(payload)

  if (!response.ok) {
    throw new ApiClientError(
      getErrorMessage(
        payload,
        `La solicitud falló con HTTP ${response.status}.`,
      ),
      response.status,
      apiError?.code ?? null,
      apiError?.details ?? {},
    )
  }

  if (!isApiEnvelope(payload, isData) || payload.success !== true) {
    throw new ApiClientError(
      getErrorMessage(
        payload,
        'El backend respondió con un formato inesperado.',
      ),
      response.status,
      apiError?.code ?? null,
      apiError?.details ?? {},
    )
  }

  return payload.data
}
