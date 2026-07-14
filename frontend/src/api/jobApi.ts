import {
  apiRequest,
  isRecord,
} from './apiClient'

export type JobStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'canceled'

export type JobRecord = {
  id: string
  job_type: string
  payload: Record<string, unknown>
  resource_type: string | null
  resource_id: string | null
  status: JobStatus
  priority: number
  max_attempts: number
  attempt_count: number
  available_at: string
  lease_owner: string | null
  lease_expires_at: string | null
  cancellation_requested_at: string | null
  created_at: string
  updated_at: string
  started_at: string | null
  finished_at: string | null
  progress_percent: number
  progress_stage: string | null
  progress_message: string | null
  result: Record<string, unknown> | null
  error_code: string | null
  error_message: string | null
  idempotency_key: string | null
  cancel_requested?: boolean
}

export type JobList = {
  items: JobRecord[]
  total: number
  limit: number
  offset: number
  status: JobStatus | null
  job_type: string | null
}

export type ListJobsOptions = {
  limit?: number
  offset?: number
  status?: JobStatus
  jobType?: string
  signal?: AbortSignal
}

export type WaitForJobOptions = {
  signal?: AbortSignal
  intervalMilliseconds?: number
  onUpdate?: (job: JobRecord) => void
}

const jobStatuses = new Set<JobStatus>([
  'queued',
  'running',
  'succeeded',
  'failed',
  'canceled',
])

function isNullableString(value: unknown) {
  return value === null || typeof value === 'string'
}

export function isJobRecord(
  value: unknown,
): value is JobRecord {
  return (
    isRecord(value)
    && typeof value.id === 'string'
    && typeof value.job_type === 'string'
    && isRecord(value.payload)
    && isNullableString(value.resource_type)
    && isNullableString(value.resource_id)
    && typeof value.status === 'string'
    && jobStatuses.has(value.status as JobStatus)
    && typeof value.priority === 'number'
    && typeof value.max_attempts === 'number'
    && typeof value.attempt_count === 'number'
    && typeof value.available_at === 'string'
    && isNullableString(value.lease_owner)
    && isNullableString(value.lease_expires_at)
    && isNullableString(value.cancellation_requested_at)
    && typeof value.created_at === 'string'
    && typeof value.updated_at === 'string'
    && isNullableString(value.started_at)
    && isNullableString(value.finished_at)
    && typeof value.progress_percent === 'number'
    && isNullableString(value.progress_stage)
    && isNullableString(value.progress_message)
    && (value.result === null || isRecord(value.result))
    && isNullableString(value.error_code)
    && isNullableString(value.error_message)
    && isNullableString(value.idempotency_key)
    && (
      value.cancel_requested === undefined
      || typeof value.cancel_requested === 'boolean'
    )
  )
}

function isJobList(value: unknown): value is JobList {
  return (
    isRecord(value)
    && Array.isArray(value.items)
    && value.items.every(isJobRecord)
    && typeof value.total === 'number'
    && typeof value.limit === 'number'
    && typeof value.offset === 'number'
    && (
      value.status === null
      || (
        typeof value.status === 'string'
        && jobStatuses.has(value.status as JobStatus)
      )
    )
    && isNullableString(value.job_type)
  )
}

export function isTerminalJobStatus(status: JobStatus) {
  return (
    status === 'succeeded'
    || status === 'failed'
    || status === 'canceled'
  )
}

export async function getJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<JobRecord> {
  return apiRequest(
    `/api/v1/jobs/${encodeURIComponent(jobId)}`,
    { method: 'GET' },
    isJobRecord,
    signal,
  )
}

export async function listJobs({
  limit = 200,
  offset = 0,
  status,
  jobType,
  signal,
}: ListJobsOptions = {}): Promise<JobList> {
  const query = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  })

  if (status) query.set('status', status)
  if (jobType) query.set('job_type', jobType)

  return apiRequest(
    `/api/v1/jobs?${query.toString()}`,
    { method: 'GET' },
    isJobList,
    signal,
  )
}

export async function listAllJobs(
  options: Omit<ListJobsOptions, 'limit' | 'offset'> = {},
): Promise<JobRecord[]> {
  const pageSize = 200
  const jobs: JobRecord[] = []
  let offset = 0
  let total = 0

  do {
    const page = await listJobs({
      ...options,
      limit: pageSize,
      offset,
    })

    jobs.push(...page.items)
    total = page.total
    offset += page.items.length

    if (page.items.length === 0) break
  } while (offset < total)

  return jobs
}

function delay(
  milliseconds: number,
  signal?: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }

    const abort = () => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', abort)
      resolve()
    }, milliseconds)

    signal?.addEventListener('abort', abort, { once: true })
  })
}

export async function waitForJob(
  jobId: string,
  {
    signal,
    intervalMilliseconds = 750,
    onUpdate,
  }: WaitForJobOptions = {},
): Promise<JobRecord> {
  while (true) {
    const job = await getJob(jobId, signal)
    onUpdate?.(job)

    if (isTerminalJobStatus(job.status)) {
      return job
    }

    await delay(intervalMilliseconds, signal)
  }
}

export async function cancelJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<JobRecord> {
  return apiRequest(
    `/api/v1/jobs/${encodeURIComponent(jobId)}/cancel`,
    { method: 'POST' },
    isJobRecord,
    signal,
  )
}

export async function retryJob(
  jobId: string,
  signal?: AbortSignal,
): Promise<JobRecord> {
  return apiRequest(
    `/api/v1/jobs/${encodeURIComponent(jobId)}/retry`,
    { method: 'POST' },
    isJobRecord,
    signal,
  )
}
