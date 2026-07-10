export type WorkspaceObjectKind =
  | 'source'
  | 'tool'
  | 'result'
  | 'evidence'
  | 'visualization'
  | 'finding'
  | 'report'

export type WorkspaceObjectStatus =
  | 'available'
  | 'ready'
  | 'draft'
  | 'warning'

export type WorkspacePosition = {
  x: number
  y: number
}

export type WorkspaceObject = {
  id: string
  kind: WorkspaceObjectKind
  title: string
  subtitle: string
  status: WorkspaceObjectStatus
  position: WorkspacePosition
  isOnStage: boolean
  isHidden: boolean
  format?: string
  file?: File
  previewUrl?: string
  sourceIds?: string[]
  previewLines?: string[]
  createdAt: number
}

export type WorkspaceMessage = {
  id: string
  role: 'user' | 'assistant'
  title: string
  text: string
  createdAt: number
}
