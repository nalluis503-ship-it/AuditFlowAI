import {
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ingestSource } from '../../../../api/sourceApi'
import {
  WorkspaceSourcesContext,
  type IngestFilesResult,
  type WorkspaceSource,
  type WorkspaceSourceRejection,
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

function createWorkspaceSource(
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

export default function WorkspaceSourcesProvider({
  children,
}: {
  children: ReactNode
}) {
  const [sources, setSources] = useState<WorkspaceSource[]>([])
  const [selectedSourceId, setSelectedSourceId] =
    useState<string | null>(null)

  const updateSource = useCallback((
    localId: string,
    updates: Partial<WorkspaceSource>,
  ) => {
    setSources((currentSources) =>
      currentSources.map((source) =>
        source.localId === localId
          ? { ...source, ...updates }
          : source,
      ),
    )
  }, [])

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
      source: createWorkspaceSource(file, index),
    }))

    if (queue.length === 0) {
      return {
        acceptedIds: [],
        rejected,
      }
    }

    setSources((currentSources) => [
      ...currentSources,
      ...queue.map((item) => item.source),
    ])
    setSelectedSourceId(queue[0].source.localId)

    for (const item of queue) {
      updateSource(item.source.localId, {
        status: 'uploading',
        error: undefined,
      })

      try {
        const profile = await ingestSource(item.file)

        updateSource(item.source.localId, {
          status: 'ready',
          profile,
          error: undefined,
        })
      } catch (error) {
        updateSource(item.source.localId, {
          status: 'failed',
          error:
            error instanceof Error
              ? error.message
              : 'No fue posible procesar el archivo.',
        })
      }
    }

    return {
      acceptedIds: queue.map((item) => item.source.localId),
      rejected,
    }
  }, [updateSource])

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
    ingestFiles,
    selectSource: setSelectedSourceId,
  }), [
    ingestFiles,
    selectedSourceId,
    sources,
  ])

  return (
    <WorkspaceSourcesContext.Provider value={value}>
      {children}
    </WorkspaceSourcesContext.Provider>
  )
}
