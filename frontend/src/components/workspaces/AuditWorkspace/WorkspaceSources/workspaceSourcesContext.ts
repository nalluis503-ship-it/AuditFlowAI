import { createContext } from 'react'
import type { SourceProfile } from '../../../../api/sourceApi'

export type WorkspaceSourceStatus =
  | 'queued'
  | 'uploading'
  | 'ready'
  | 'failed'

export type WorkspaceSource = {
  localId: string
  name: string
  extension: string
  size: number
  mimeType: string
  lastModified: number
  status: WorkspaceSourceStatus
  profile?: SourceProfile
  error?: string
  createdAt: number
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
  ingestFiles: (
    files: FileList | File[],
  ) => Promise<IngestFilesResult>
  selectSource: (sourceId: string | null) => void
}

export const WorkspaceSourcesContext =
  createContext<WorkspaceSourcesContextValue | null>(null)
