import { createContext } from 'react'
import type { JobRecord } from '../../../../api/jobApi'
import type {
  SourceProfile,
  SourceSummary,
} from '../../../../api/sourceApi'

export type WorkspaceSourceStatus =
  | 'queued'
  | 'uploading'
  | 'ready'
  | 'failed'

export type WorkspaceSource = {
  localId: string
  sourceId?: string
  name: string
  extension: string
  size: number
  mimeType: string
  lastModified: number
  status: WorkspaceSourceStatus
  summary?: SourceSummary
  profile?: SourceProfile
  job?: JobRecord
  progressPercent?: number
  progressStage?: string
  progressMessage?: string
  error?: string
  createdAt: number
  updatedAt?: number
}

export type WorkspaceSourceRejection = {
  name: string
  reason: string
}

export type IngestFilesResult = {
  acceptedIds: string[]
  rejected: WorkspaceSourceRejection[]
}

export type WorkspaceSourcesContextValue = {
  sources: WorkspaceSource[]
  selectedSourceId: string | null
  readySourceCount: number
  isProcessing: boolean
  isCatalogLoading: boolean
  catalogError: string | null
  ingestFiles: (
    files: FileList | File[],
  ) => Promise<IngestFilesResult>
  reloadSources: () => Promise<void>
  selectSource: (sourceId: string | null) => void
}

export const WorkspaceSourcesContext =
  createContext<WorkspaceSourcesContextValue | null>(null)
