import { useCallback, useMemo, useState } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './App.css'
import ToolLibrary from './components/ToolLibrary/ToolLibrary'
import SmartConnectMenu from './components/SmartConnect/SmartConnectMenu'
import NodeEditor from './components/NodeEditor'
import GuidedDataStage from './components/GuidedDataStage'
import AuditWorkspace, {
  type AuditWorkspaceFocus,
} from './components/workspaces/AuditWorkspace'
import {
  WorkspaceSourcesProvider,
} from './components/workspaces/AuditWorkspace/WorkspaceSources'
import {
  type NodeDataType,
  type ToolAction,
  type ToolDefinition,
} from './data/toolCatalog'
import {
  createWorkflowNodeTypes,
  type AuditFlowNode,
} from './components/WorkflowNode'

const initialNodes: AuditFlowNode[] = []

const initialEdges: Edge[] = []

type SmartConnectContext = {
  nodeId: string
  outputType: NodeDataType
}


type WorkspaceMode = AuditWorkspaceFocus


function getNodeVariant(tool: ToolDefinition): 'excel' | 'mysql' {
  if (
    tool.categoryId === 'documents' ||
    tool.categoryId === 'viewers' ||
    tool.outputType === 'excel' ||
    tool.outputType === 'document'
  ) {
    return 'excel'
  }

  return 'mysql'
}


function App() {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [smartConnectContext, setSmartConnectContext] = useState<SmartConnectContext | null>(null)
  const [openNodeId, setOpenNodeId] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<AuditFlowNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('command')

  const closeSmartConnect = useCallback(() => {
    setSmartConnectContext(null)
  }, [])

  const closeNodeEditor = useCallback(() => {
    setOpenNodeId(null)
  }, [])

  const openSmartConnect = useCallback((nodeId: string, outputType: NodeDataType) => {
    setIsLibraryOpen(false)
    setOpenNodeId(null)
    setSmartConnectContext({
      nodeId,
      outputType,
    })
  }, [])

  const openNodeEditor = useCallback((nodeId: string) => {
    setIsLibraryOpen(false)
    setSmartConnectContext(null)
    setOpenNodeId(nodeId)
  }, [])

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== nodeId))
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId),
    )

    setSmartConnectContext((currentContext) =>
      currentContext?.nodeId === nodeId ? null : currentContext,
    )

    setOpenNodeId((currentNodeId) => (currentNodeId === nodeId ? null : currentNodeId))
  }, [setEdges, setNodes])

  const nodeTypes = useMemo(
    () =>
      createWorkflowNodeTypes({
        onSmartConnect: openSmartConnect,
        onOpenNode: openNodeEditor,
        onDeleteNode: deleteNode,
      }),
    [deleteNode, openNodeEditor, openSmartConnect],
  )

  const openLibrary = () => {
    closeSmartConnect()
    closeNodeEditor()
    setIsLibraryOpen(true)
  }

  const closeLibrary = () => {
    setIsLibraryOpen(false)
  }


  const createNodeData = (tool: ToolDefinition, action: ToolAction) => ({
    icon: tool.icon,
    title: action.name,
    description: tool.name,
    variant: getNodeVariant(tool),
    toolId: tool.id,
    actionId: action.id,
    outputType: action.outputType,
    status: 'idle' as const,
    summary: action.name,
  })

  const addToolNode = (tool: ToolDefinition, action: ToolAction) => {
    const newNode: AuditFlowNode = {
      id: `${tool.id}-${action.id}-${Date.now()}`,
      type: 'auditNode',
      position: {
        x: 180 + nodes.length * 52,
        y: 180 + nodes.length * 36,
      },
      data: createNodeData(tool, action),
    }

    setNodes((currentNodes) => [...currentNodes, newNode])
  }


  const suggestNextNodeFromEditor = (nodeId: string) => {
    const node = nodes.find((currentNode) => currentNode.id === nodeId)

    if (!node) return

    openSmartConnect(node.id, node.data.outputType ?? 'unknown')
  }

  const addSmartConnectedNode = (tool: ToolDefinition, action: ToolAction) => {
    if (!smartConnectContext) return

    const sourceNode = nodes.find((node) => node.id === smartConnectContext.nodeId)
    const newNodeId = `${tool.id}-${action.id}-${Date.now()}`

    const newNode: AuditFlowNode = {
      id: newNodeId,
      type: 'auditNode',
      position: {
        x: sourceNode ? sourceNode.position.x + 320 : 320,
        y: sourceNode ? sourceNode.position.y : 220,
      },
      data: createNodeData(tool, action),
    }

    setNodes((currentNodes) => [...currentNodes, newNode])

    setEdges((currentEdges) =>
      addEdge(
        {
          id: `${smartConnectContext.nodeId}-${newNodeId}`,
          source: smartConnectContext.nodeId,
          target: newNodeId,
          animated: true,
        },
        currentEdges,
      ),
    )

    closeSmartConnect()
  }

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((currentEdges) => addEdge({ ...connection, animated: true }, currentEdges)),
    [setEdges],
  )

  const openedNode = openNodeId
    ? nodes.find((node) => node.id === openNodeId)
    : null


  return (
    <WorkspaceSourcesProvider>
      <AuditWorkspace
      activeFocus={workspaceMode}
      nodeCount={nodes.length}
      edgeCount={edges.length}
      onFocusChange={setWorkspaceMode}
      onOpenTools={openLibrary}
      dataLayer={<GuidedDataStage />}
      technicalLayer={(
        <div
          className="audit-technical-shell"
          onClick={() => {
            if (isLibraryOpen) closeLibrary()
            if (smartConnectContext) closeSmartConnect()
            if (openedNode) closeNodeEditor()
          }}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>

          {!isLibraryOpen && !smartConnectContext && !openedNode && nodes.length > 0 && (
            <button
              className="floating-add-tool"
              onClick={(event) => {
                event.stopPropagation()
                openLibrary()
              }}
            >
              + Agregar herramienta
            </button>
          )}
        </div>
      )}
      overlayLayer={(
        <>
          {smartConnectContext && (
            <div
              className="smart-connect-floating-panel"
              onClick={(event) => event.stopPropagation()}
            >
              <SmartConnectMenu
                outputType={smartConnectContext.outputType}
                onSelectSuggestion={addSmartConnectedNode}
                onClose={closeSmartConnect}
              />
            </div>
          )}

          {openedNode && (
            <NodeEditor
              node={openedNode}
              onClose={closeNodeEditor}
              onSuggestNextNode={suggestNextNodeFromEditor}
            />
          )}

          {isLibraryOpen && (
            <ToolLibrary
              onCreateNode={addToolNode}
              onClose={closeLibrary}
            />
          )}
        </>
      )}
      />
    </WorkspaceSourcesProvider>
  )

}

export default App
