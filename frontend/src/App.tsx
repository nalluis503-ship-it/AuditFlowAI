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
import type {
  NodeDataType,
  ToolAction,
  ToolDefinition,
} from './data/toolCatalog'
import {
  createWorkflowNodeTypes,
  type AuditFlowNode,
  type NodeFileMeta,
} from './components/WorkflowNode'

const sidebarItems = [
  { icon: 'IN', title: 'Inicio', description: 'Resumen general y actividad reciente.', active: false },
  { icon: 'WF', title: 'Workflows', description: 'Crea y gestiona tus flujos de trabajo.', active: false },
  { icon: 'DB', title: 'Laboratorio de Base de Datos', description: 'Analiza, consulta y cruza informacion de tus bases de datos.', active: true },
  { icon: 'AU', title: 'Procedimientos de Auditoria', description: 'Accede a metodologias y procedimientos.', active: false },
  { icon: 'DO', title: 'Documentos', description: 'Gestiona y consulta tus archivos y plantillas.', active: false },
  { icon: 'TL', title: 'Herramientas', description: 'Explora y utiliza herramientas disponibles.', active: false },
  { icon: 'IA', title: 'IA Auditora', description: 'Analisis inteligente y deteccion de anomalias.', active: false },
  { icon: 'RP', title: 'Reportes', description: 'Genera reportes y visualizaciones.', active: false },
  { icon: 'CF', title: 'Configuracion', description: 'Personaliza tu entorno y preferencias.', active: false },
]

const initialNodes: AuditFlowNode[] = []

const initialEdges: Edge[] = []

type SmartConnectContext = {
  nodeId: string
  outputType: NodeDataType
}

function getNodeVariant(tool: ToolDefinition): 'excel' | 'mysql' | 'ai' {
  if (tool.categoryId === 'ai') return 'ai'

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

  const handleAttachFiles = (nodeId: string, files: NodeFileMeta[]) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== nodeId) return node

        const previousFiles = node.data.files ?? []
        const nextFiles = [...previousFiles, ...files]

        return {
          ...node,
          data: {
            ...node.data,
            files: nextFiles,
            status: 'success',
            summary: `${nextFiles.length} archivo${nextFiles.length === 1 ? '' : 's'} cargado${nextFiles.length === 1 ? '' : 's'}`,
            resultSummary: [
              `${nextFiles.length} archivo${nextFiles.length === 1 ? '' : 's'} disponible${nextFiles.length === 1 ? '' : 's'} para análisis.`,
              'Pendiente perfilar contenido para generar recomendaciones específicas.',
            ],
          },
        }
      }),
    )
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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AF</div>
          <h1>AuditFlow AI</h1>
        </div>

        <nav className="main-nav">
          {sidebarItems.map((item) => (
            <button key={item.title} className={item.active ? 'nav-item active' : 'nav-item'}>
              <span className="nav-icon">{item.icon}</span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="user-card">
          <div className="avatar">AD</div>
          <div>
            <strong>Auditor Demo</strong>
            <small>auditor@demo.com</small>
          </div>
          <span className="chevron">⌄</span>
        </div>
      </aside>

      <main className="builder">
        <header className="topbar">
          <div className="workflow-title">
            <button className="back-button">←</button>
            <div>
              <h2>Nuevo workflow</h2>
              <span>Laboratorio de Base de Datos</span>
            </div>
            <button className="edit-button">Editar</button>
          </div>

          <div className="top-actions">
            <button className="ghost-button">Guardar</button>
            <button className="ghost-button">Ejecutar</button>
            <button className="primary-button" onClick={openLibrary}>
              + Agregar herramienta
            </button>
          </div>
        </header>

        <section
          className="workspace"
          onClick={() => {
            if (isLibraryOpen) closeLibrary()
            if (smartConnectContext) closeSmartConnect()
            if (openedNode) closeNodeEditor()
          }}
        >
          <div className="canvas-panel">
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

            {!isLibraryOpen && !smartConnectContext && !openedNode && nodes.length === 0 && (
              <button
                className="empty-workflow-card"
                onClick={(event) => {
                  event.stopPropagation()
                  openLibrary()
                }}
              >
                <span>+</span>
                <strong>Agregar primer nodo</strong>
                <small>Elige una herramienta o pídele a la IA que recomiende cómo iniciar</small>
              </button>
            )}

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
                onAttachFiles={handleAttachFiles}
                onSuggestNextNode={suggestNextNodeFromEditor}
              />
            )}

            {isLibraryOpen && (
              <ToolLibrary
                onCreateNode={addToolNode}
                onClose={closeLibrary}
              />
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
