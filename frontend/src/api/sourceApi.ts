import {
  apiRequest,
  isRecord,
} from './apiClient'
import {
  isJobRecord,
  type JobRecord,
} from './jobApi'

export type SourceStatus =
  | 'receiving'
  | 'stored'
  | 'profiling'
  | 'ready'
  | 'failed'

export type ProfileCompleteness =
  | 'exact'
  | 'preliminary'

export type SourceHeaderCandidate = {
  row_number: number
  confidence: number
  values: string[]
}

export type SourceColumnProfile = {
  name: string
  position: number
  data_type: string
  null_count: number
  non_null_count: number
  null_percentage: number
  distinct_count: number | null
  sample_values: string[]
}

export type SourceSheetProfile = {
  name: string
  header_row_number: number | null
  header_confidence: number | null
  header_candidates: SourceHeaderCandidate[]
  row_count: number
  column_count: number
  duplicate_row_count: number
  total_cell_count: number
  null_cell_count: number
  null_percentage: number
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
  status: SourceStatus
  profile_version: string
  profile_engine: string
  completeness: ProfileCompleteness
  sheets: SourceSheetProfile[]
}

export type SourceSummary = {
  id: string
  original_name: string
  extension: string
  media_type: string | null
  size_bytes: number
  sha256: string | null
  status: SourceStatus
  stored_at: string
  updated_at: string
  error_code: string | null
  error_message: string | null
  profile_available: boolean
  sheet_count: number
  total_rows: number
}

export type SourceDetail = {
  id: string
  original_name: string
  extension: string
  media_type: string | null
  size_bytes: number
  sha256: string | null
  status: SourceStatus
  stored_at: string
  updated_at: string
  error_code: string | null
  error_message: string | null
  profile: SourceProfile | null
}

export type SourceList = {
  items: SourceSummary[]
  total: number
  limit: number
  offset: number
}

export type AsyncSourceIngestResult = {
  source: SourceSummary
  job: JobRecord
}

const sourceStatuses = new Set<SourceStatus>([
  'receiving',
  'stored',
  'profiling',
  'ready',
  'failed',
])

const profileCompletenessValues = new Set<ProfileCompleteness>([
  'exact',
  'preliminary',
])

function isNullableString(value: unknown) {
  return value === null || typeof value === 'string'
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(
    (item) => typeof item === 'string',
  )
}

function isSourceStatus(value: unknown): value is SourceStatus {
  return (
    typeof value === 'string'
    && sourceStatuses.has(value as SourceStatus)
  )
}

function isHeaderCandidate(
  value: unknown,
): value is SourceHeaderCandidate {
  return (
    isRecord(value)
    && typeof value.row_number === 'number'
    && typeof value.confidence === 'number'
    && isStringArray(value.values)
  )
}

function isColumnProfile(
  value: unknown,
): value is SourceColumnProfile {
  return (
    isRecord(value)
    && typeof value.name === 'string'
    && typeof value.position === 'number'
    && typeof value.data_type === 'string'
    && typeof value.null_count === 'number'
    && typeof value.non_null_count === 'number'
    && typeof value.null_percentage === 'number'
    && (
      value.distinct_count === null
      || typeof value.distinct_count === 'number'
    )
    && isStringArray(value.sample_values)
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
    && (
      value.header_confidence === null
      || typeof value.header_confidence === 'number'
    )
    && Array.isArray(value.header_candidates)
    && value.header_candidates.every(isHeaderCandidate)
    && typeof value.row_count === 'number'
    && typeof value.column_count === 'number'
    && typeof value.duplicate_row_count === 'number'
    && typeof value.total_cell_count === 'number'
    && typeof value.null_cell_count === 'number'
    && typeof value.null_percentage === 'number'
    && Array.isArray(value.columns)
    && value.columns.every(isColumnProfile)
  )
}

export function isSourceProfile(
  value: unknown,
): value is SourceProfile {
  return (
    isRecord(value)
    && typeof value.id === 'string'
    && typeof value.original_name === 'string'
    && typeof value.extension === 'string'
    && isNullableString(value.media_type)
    && typeof value.size_bytes === 'number'
    && typeof value.sha256 === 'string'
    && typeof value.stored_at === 'string'
    && isSourceStatus(value.status)
    && typeof value.profile_version === 'string'
    && typeof value.profile_engine === 'string'
    && typeof value.completeness === 'string'
    && profileCompletenessValues.has(
      value.completeness as ProfileCompleteness,
    )
    && Array.isArray(value.sheets)
    && value.sheets.every(isSheetProfile)
  )
}

function isSourceSummary(
  value: unknown,
): value is SourceSummary {
  return (
    isRecord(value)
    && typeof value.id === 'string'
    && typeof value.original_name === 'string'
    && typeof value.extension === 'string'
    && isNullableString(value.media_type)
    && typeof value.size_bytes === 'number'
    && isNullableString(value.sha256)
    && isSourceStatus(value.status)
    && typeof value.stored_at === 'string'
    && typeof value.updated_at === 'string'
    && isNullableString(value.error_code)
    && isNullableString(value.error_message)
    && typeof value.profile_available === 'boolean'
    && typeof value.sheet_count === 'number'
    && typeof value.total_rows === 'number'
  )
}

function isSourceDetail(
  value: unknown,
): value is SourceDetail {
  return (
    isRecord(value)
    && typeof value.id === 'string'
    && typeof value.original_name === 'string'
    && typeof value.extension === 'string'
    && isNullableString(value.media_type)
    && typeof value.size_bytes === 'number'
    && isNullableString(value.sha256)
    && isSourceStatus(value.status)
    && typeof value.stored_at === 'string'
    && typeof value.updated_at === 'string'
    && isNullableString(value.error_code)
    && isNullableString(value.error_message)
    && (
      value.profile === null
      || isSourceProfile(value.profile)
    )
  )
}

function isSourceList(value: unknown): value is SourceList {
  return (
    isRecord(value)
    && Array.isArray(value.items)
    && value.items.every(isSourceSummary)
    && typeof value.total === 'number'
    && typeof value.limit === 'number'
    && typeof value.offset === 'number'
  )
}

function isAsyncSourceIngestResult(
  value: unknown,
): value is AsyncSourceIngestResult {
  return (
    isRecord(value)
    && isSourceSummary(value.source)
    && isJobRecord(value.job)
  )
}

export async function listSources(
  limit = 200,
  offset = 0,
  signal?: AbortSignal,
): Promise<SourceList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  return apiRequest(
    `/api/v1/sources?${query.toString()}`,
    { method: 'GET' },
    isSourceList,
    signal,
  )
}

export async function listAllSources(
  signal?: AbortSignal,
): Promise<SourceSummary[]> {
  const pageSize = 200
  const sources: SourceSummary[] = []
  let offset = 0
  let total = 0

  do {
    const page = await listSources(pageSize, offset, signal)
    sources.push(...page.items)
    total = page.total
    offset += page.items.length

    if (page.items.length === 0) break
  } while (offset < total)

  return sources
}

export async function getSource(
  sourceId: string,
  signal?: AbortSignal,
): Promise<SourceDetail> {
  return apiRequest(
    `/api/v1/sources/${encodeURIComponent(sourceId)}`,
    { method: 'GET' },
    isSourceDetail,
    signal,
  )
}

export async function ingestSourceAsync(
  file: File,
  signal?: AbortSignal,
): Promise<AsyncSourceIngestResult> {
  const formData = new FormData()
  formData.append('file', file)

  return apiRequest(
    '/api/v1/sources/ingest-async',
    {
      method: 'POST',
      body: formData,
    },
    isAsyncSourceIngestResult,
    signal,
  )
}
