import { useContext } from 'react'
import { WorkspaceSourcesContext } from './workspaceSourcesContext'

export default function useWorkspaceSources() {
  const context = useContext(WorkspaceSourcesContext)

  if (!context) {
    throw new Error(
      'useWorkspaceSources must be used within WorkspaceSourcesProvider.',
    )
  }

  return context
}
