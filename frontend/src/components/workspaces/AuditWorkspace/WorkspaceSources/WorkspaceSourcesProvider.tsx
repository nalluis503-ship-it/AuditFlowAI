import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  listAllJobs,
  waitForJob,
  type JobRecord,
} from '../../../../api/jobApi'
import {
  getSource,
  ingestSourceAsync,
  listAllSources,
  type SourceDetail,
  type SourceSummary,
} from '../../../../api/sourceApi'
import {
  WorkspaceSourcesContext,
  type IngestFilesResult,
  type WorkspaceSource,
  type WorkspaceSourceRejection,
  type WorkspaceSourceStatus,
  type WorkspaceSourcesContextValue,
} from './workspaceSourcesContext'

const maximumFileSizeBytes = 25 * 1024 * 1024
const supportedExtensions = new Set(['csv', 'xlsx'])

function getFileExtension(fileName: string) {
  const segments = fileName.toLowerCase().split('.')

  return segments.length > 1
    ? segments.at(-1) ?? ''
    : ''
}

function toTimestamp(value: string) {
  const timestamp = Date.parse(value)
  return Number.isNaN(timestamp) ? Date.now() : timestamp
}

function getWorkspaceStatus(
  sourceStatus: SourceSummary['status'] | SourceDetail['status'],
  job?: JobRecord,
): WorkspaceSourceStatus {
  if (job?.status === 'failed' || job?.status === 'canceled') {
    return 'failed'
  }

  if (job?.status === 'running') {
    return 'uploading'
  }

  if (job?.status === 'queued') {
    return 'queued'
  }

  switch (sourceStatus) {
    case 'receiving':
    case 'profiling':
      return 'uploading'
    case 'stored':
      return 'queued'
    case 'ready':
      return 'ready'
    case 'failed':
      return 'failed'
  }
}

function getWorkspaceError(
  source: SourceSummary | SourceDetail,
  job?: JobRecord,
) {
  if (job?.status === 'canceled') {
    return 'El procesamiento durable fue cancelado.'
  }

  return (
    job?.error_message
    ?? source.error_message
    ?? undefined
  )
}

function createTransientSource(
  file: File,
  index: number,
): WorkspaceSource {
  return {
    localId: [
      file.name,
      file.size,
      file.lastModified,
      crypto.randomUUID(),
      index,
    ].join('-'),
    name: file.name,
    extension: getFileExtension(file.name),
    size: file.size,
    mimeType: file.type || 'no informado por el navegador',
    lastModified: file.lastModified,
    status: 'queued',
    createdAt: Date.now(),
  }
}

function fromSummary(
  summary: SourceSummary,
  job?: JobRecord,
  profile?: WorkspaceSource['profile'],
): WorkspaceSource {
  return {
    localId: summary.id,
    sourceId: summary.id,
    name: summary.original_name,
    extension: summary.extension,
    size: summary.size_bytes,
    mimeType: summary.media_type ?? 'no informado',
    lastModified: toTimestamp(summary.updated_at),
    status: getWorkspaceStatus(summary.status, job),
    summary,
    profile,
    job,
    progressPercent: job?.progress_percent,
    progressStage: job?.progress_stage ?? undefined,
    progressMessage: job?.progress_message ?? undefined,
    error: getWorkspaceError(summary, job),
    createdAt: toTimestamp(summary.stored_at),
    updatedAt: toTimestamp(summary.updated_at),
  }
}

function fromDetail(
  detail: SourceDetail,
  job?: JobRecord,
): WorkspaceSource {
  return {
    localId: detail.id,
    sourceId: detail.id,
    name: detail.original_name,
    extension: detail.extension,
    size: detail.size_bytes,
    mimeType: detail.media_type ?? 'no informado',
    lastModified: toTimestamp(detail.updated_at),
    status: getWorkspaceStatus(detail.status, job),
    profile: detail.profile ?? undefined,
    job,
    progressPercent: job?.progress_percent,
    progressStage: job?.progress_stage ?? undefined,
    progressMessage: job?.progress_message ?? undefined,
    error: getWorkspaceError(detail, job),
    createdAt: toTimestamp(detail.stored_at),
    updatedAt: toTimestamp(detail.updated_at),
  }
}

function newestJobsBySource(jobs: JobRecord[]) {
  const sorted = [...jobs].sort(
    (left, right) =>
      toTimestamp(right.created_at) - toTimestamp(left.created_at),
  )
  const bySource = new Map<string, JobRecord>()

  for (const job of sorted) {
    if (
      job.resource_type === 'source'
      && job.resource_id
      && !bySource.has(job.resource_id)
    ) {
      bySource.set(job.resource_id, job)
    }
  }

  return bySource
}

function mergeCatalog(
  currentSources: WorkspaceSource[],
  catalogSources: WorkspaceSource[],
) {
  const currentBySourceId = new Map(
    currentSources
      .filter((source) => source.sourceId)
      .map((source) => [source.sourceId!, source]),
  )

  const mergedCatalog = catalogSources.map((source) => {
    const current = source.sourceId
      ? currentBySourceId.get(source.sourceId)
      : undefined

    if (!current) return source

    return {
      ...source,
      profile: source.profile ?? current.profile,
    }
  })

  const transientSources = currentSources.filter(
    (source) => !source.sourceId,
  )

  return [...transientSources, ...mergedCatalog]
}

export default function WorkspaceSourcesProvider({
  children,
}: {
  children: ReactNode
}) {
  const [sources, setSources] = useState<WorkspaceSource[]>([])
  const [selectedSourceId, setSelectedSourceId] =
    useState<string | null>(null)
  const [isCatalogLoading, setIsCatalogLoading] =
    useState(true)
  const [catalogError, setCatalogError] =
    useState<string | null>(null)

  const monitoringJobs = useRef(new Set<string>())
  const activeControllers = useRef(new Set<AbortController>())
  const disposed = useRef(false)

  useEffect(() => {
    disposed.current = false
    const controllers = activeControllers.current

    return () => {
      disposed.current = true

      for (const controller of controllers) {
        controller.abort()
      }

      controllers.clear()
    }
  }, [])

  const updateSourceByLocalId = useCallback((
    localId: string,
    updates: Partial<WorkspaceSource>,
  ) => {
    if (disposed.current) return

    setSources((currentSources) =>
      currentSources.map((source) =>
        source.localId === localId
          ? { ...source, ...updates }
          : source,
      ),
    )
  }, [])

  const updateSourceByBackendId = useCallback((
    sourceId: string,
    updates: Partial<WorkspaceSource>,
  ) => {
    if (disposed.current) return

    setSources((currentSources) =>
      currentSources.map((source) =>
        source.sourceId === sourceId
          ? { ...source, ...updates }
          : source,
      ),
    )
  }, [])

  const refreshSource = useCallback(async (
    sourceId: string,
    job?: JobRecord,
    signal?: AbortSignal,
  ) => {
    const detail = await getSource(sourceId, signal)
    const refreshed = fromDetail(detail, job)

    if (disposed.current) return refreshed

    setSources((currentSources) => [
      ...currentSources.filter(
        (source) => source.sourceId !== sourceId,
      ),
      refreshed,
    ])

    return refreshed
  }, [])

  const monitorSourceJob = useCallback((
    sourceId: string,
    jobId: string,
  ) => {
    if (monitoringJobs.current.has(jobId)) return

    monitoringJobs.current.add(jobId)
    const controller = new AbortController()
    activeControllers.current.add(controller)

    void waitForJob(jobId, {
      signal: controller.signal,
      onUpdate: (job) => {
        updateSourceByBackendId(sourceId, {
          status:
            job.status === 'queued'
              ? 'queued'
              : job.status === 'failed' || job.status === 'canceled'
                ? 'failed'
                : 'uploading',
          job,
          progressPercent: job.progress_percent,
          progressStage: job.progress_stage ?? undefined,
          progressMessage: job.progress_message ?? undefined,
          error:
            job.status === 'failed' || job.status === 'canceled'
              ? job.error_message
                ?? (job.status === 'canceled'
                  ? 'El procesamiento durable fue cancelado.'
                  : 'El procesamiento durable falló.')
              : undefined,
        })
      },
    }).then(async (job) => {
      await refreshSource(sourceId, job, controller.signal)
    }).catch((error: unknown) => {
      if (
        error instanceof DOMException
        && error.name === 'AbortError'
      ) {
        return
      }

      updateSourceByBackendId(sourceId, {
        progressMessage:
          'No fue posible actualizar el estado del job. Recarga el catálogo para reintentar.',
        error:
          error instanceof Error
            ? error.message
            : 'No fue posible consultar el job durable.',
      })
    }).finally(() => {
      monitoringJobs.current.delete(jobId)
      activeControllers.current.delete(controller)
    })
  }, [refreshSource, updateSourceByBackendId])

  const reloadSources = useCallback(async () => {
    setIsCatalogLoading(true)
    setCatalogError(null)

    const controller = new AbortController()
    activeControllers.current.add(controller)

    try {
      const [summaries, jobs] = await Promise.all([
        listAllSources(controller.signal),
        listAllJobs({
          jobType: 'source.profile',
          signal: controller.signal,
        }),
      ])
      const jobsBySource = newestJobsBySource(jobs)

      const catalogSources = await Promise.all(
        summaries.map(async (summary) => {
          const job = jobsBySource.get(summary.id)

          if (!summary.profile_available) {
            return fromSummary(summary, job)
          }

          try {
            const detail = await getSource(
              summary.id,
              controller.signal,
            )
            return fromDetail(detail, job)
          } catch (error) {
            if (
              error instanceof DOMException
              && error.name === 'AbortError'
            ) {
              throw error
            }

            return fromSummary(summary, job)
          }
        }),
      )

      if (disposed.current) return

      setSources((currentSources) =>
        mergeCatalog(currentSources, catalogSources),
      )

      setSelectedSourceId((currentSelection) => {
        if (
          currentSelection
          && catalogSources.some(
            (source) => source.localId === currentSelection,
          )
        ) {
          return currentSelection
        }

        return catalogSources[0]?.localId ?? currentSelection
      })

      for (const source of catalogSources) {
        if (
          source.sourceId
          && source.job
          && (
            source.job.status === 'queued'
            || source.job.status === 'running'
          )
        ) {
          monitorSourceJob(source.sourceId, source.job.id)
        }
      }
    } catch (error) {
      if (
        error instanceof DOMException
        && error.name === 'AbortError'
      ) {
        return
      }

      if (!disposed.current) {
        setCatalogError(
          error instanceof Error
            ? error.message
            : 'No fue posible recuperar las fuentes persistentes.',
        )
      }
    } finally {
      activeControllers.current.delete(controller)

      if (!disposed.current) {
        setIsCatalogLoading(false)
      }
    }
  }, [monitorSourceJob])

  useEffect(() => {
    void reloadSources()
  }, [reloadSources])

  const ingestFiles = useCallback(async (
    filesInput: FileList | File[],
  ): Promise<IngestFilesResult> => {
    const files = Array.from(filesInput)
    const rejected: WorkspaceSourceRejection[] = []
    const acceptedFiles: File[] = []

    for (const file of files) {
      const extension = getFileExtension(file.name)

      if (!supportedExtensions.has(extension)) {
        rejected.push({
          name: file.name,
          reason: 'formato no admitido; usa CSV o XLSX',
        })
        continue
      }

      if (file.size > maximumFileSizeBytes) {
        rejected.push({
          name: file.name,
          reason: 'supera el límite de 25 MB',
        })
        continue
      }

      acceptedFiles.push(file)
    }

    const queue = acceptedFiles.map((file, index) => ({
      file,
      source: createTransientSource(file, index),
    }))

    if (queue.length === 0) {
      return {
        acceptedIds: [],
        rejected,
      }
    }

    setSources((currentSources) => [
      ...queue.map((item) => item.source),
      ...currentSources,
    ])
    setSelectedSourceId(queue[0].source.localId)

    const acceptedIds: string[] = []

    for (const item of queue) {
      updateSourceByLocalId(item.source.localId, {
        status: 'uploading',
        error: undefined,
        progressMessage: 'Enviando archivo al backend.',
      })

      try {
        const submission = await ingestSourceAsync(item.file)
        const persisted = fromSummary(
          submission.source,
          submission.job,
        )

        if (!disposed.current) {
          setSources((currentSources) => [
            persisted,
            ...currentSources.filter(
              (source) =>
                source.localId !== item.source.localId
                && source.sourceId !== persisted.sourceId,
            ),
          ])

          setSelectedSourceId((currentSelection) =>
            currentSelection === item.source.localId
              ? persisted.localId
              : currentSelection,
          )
        }

        acceptedIds.push(persisted.localId)
        monitorSourceJob(
          submission.source.id,
          submission.job.id,
        )
      } catch (error) {
        updateSourceByLocalId(item.source.localId, {
          status: 'failed',
          error:
            error instanceof Error
              ? error.message
              : 'No fue posible procesar el archivo.',
          progressMessage: undefined,
        })
      }
    }

    return {
      acceptedIds,
      rejected,
    }
  }, [monitorSourceJob, updateSourceByLocalId])

  const value = useMemo<WorkspaceSourcesContextValue>(() => ({
    sources,
    selectedSourceId,
    readySourceCount: sources.filter(
      (source) => source.status === 'ready',
    ).length,
    isProcessing: sources.some(
      (source) =>
        source.status === 'queued'
        || source.status === 'uploading',
    ),
    isCatalogLoading,
    catalogError,
    ingestFiles,
    reloadSources,
    selectSource: setSelectedSourceId,
  }), [
    catalogError,
    ingestFiles,
    isCatalogLoading,
    reloadSources,
    selectedSourceId,
    sources,
  ])

  return (
    <WorkspaceSourcesContext.Provider value={value}>
      {children}
    </WorkspaceSourcesContext.Provider>
  )
}
