export type SourceColumnProfile = {
  name: string
  position: number
  null_count: number
  non_null_count: number
}

export type SourceSheetProfile = {
  name: string
  header_row_number: number | null
  row_count: number
  column_count: number
  duplicate_row_count: number
  columns: SourceColumnProfile[]
}

export type SourceProfile = {
  id: string
  original_name: string
  extension: string
  media_type: string | null
  size_bytes: number
  sha256: string
  stored_at: string
  sheets: SourceSheetProfile[]
}

type ApiResponse<T> = {
  success: boolean
  message: string
  data: T
}

type ErrorDetail = {
  msg?: string
}

export class SourceApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'SourceApiError'
    this.status = status
  }
}

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL ?? ''
).replace(/\/+$/, '')

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isColumnProfile(
  value: unknown,
): value is SourceColumnProfile {
  return (
    isRecord(value)
    && typeof value.name === 'string'
    && typeof value.position === 'number'
    && typeof value.null_count === 'number'
    && typeof value.non_null_count === 'number'
  )
}

function isSheetProfile(
  value: unknown,
): value is SourceSheetProfile {
  return (
    isRecord(value)
    && typeof value.name === 'string'
    && (
      value.header_row_number === null
      || typeof value.header_row_number === 'number'
    )
    && typeof value.row_count === 'number'
    && typeof value.column_count === 'number'
    && typeof value.duplicate_row_count === 'number'
    && Array.isArray(value.columns)
    && value.columns.every(isColumnProfile)
  )
}

function isSourceProfile(value: unknown): value is SourceProfile {
  return (
    isRecord(value)
    && typeof value.id === 'string'
    && typeof value.original_name === 'string'
    && typeof value.extension === 'string'
    && (
      value.media_type === null
      || typeof value.media_type === 'string'
    )
    && typeof value.size_bytes === 'number'
    && typeof value.sha256 === 'string'
    && typeof value.stored_at === 'string'
    && Array.isArray(value.sheets)
    && value.sheets.every(isSheetProfile)
  )
}

function isApiResponse(
  value: unknown,
): value is ApiResponse<SourceProfile> {
  return (
    isRecord(value)
    && typeof value.success === 'boolean'
    && typeof value.message === 'string'
    && isSourceProfile(value.data)
  )
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

export async function ingestSource(
  file: File,
  signal?: AbortSignal,
): Promise<SourceProfile> {
  const formData = new FormData()
  formData.append('file', file)

  let response: Response

  try {
    response = await fetch(
      `${apiBaseUrl}/api/v1/sources/ingest`,
      {
        method: 'POST',
        body: formData,
        signal,
      },
    )
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }

    throw new SourceApiError(
      'No fue posible conectar con el backend de AuditFlow.',
      0,
    )
  }

  const payload = await readJsonResponse(response)

  if (!response.ok) {
    throw new SourceApiError(
      getErrorMessage(
        payload,
        `La ingestión falló con HTTP ${response.status}.`,
      ),
      response.status,
    )
  }

  if (!isApiResponse(payload) || payload.success !== true) {
    throw new SourceApiError(
      'El backend respondió con un formato inesperado.',
      response.status,
    )
  }

  return payload.data
}
