import { useCallback, useState } from 'react'
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
import type {
  ToolAction,
  ToolDefinition,
} from './data/toolCatalog'
import {
  nodeTypes,
  type AuditFlowNode,
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
  const [nodes, setNodes, onNodesChange] = useNodesState<AuditFlowNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const openLibrary = () => {
    setIsLibraryOpen(true)
  }

  const closeLibrary = () => {
    setIsLibraryOpen(false)
  }

  const addToolNode = (tool: ToolDefinition, action: ToolAction) => {
    const newNode: AuditFlowNode = {
      id: `${tool.id}-${action.id}-${Date.now()}`,
      type: 'auditNode',
      position: {
        x: 180 + nodes.length * 52,
        y: 180 + nodes.length * 36,
      },
      data: {
        icon: tool.icon,
        title: action.name,
        description: tool.name,
        variant: getNodeVariant(tool),
        toolId: tool.id,
        actionId: action.id,
        outputType: action.outputType,
      },
    }

    setNodes((currentNodes) => [...currentNodes, newNode])
  }

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((currentEdges) => addEdge({ ...connection, animated: true }, currentEdges)),
    [setEdges],
  )

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

        <section className="workspace" onClick={() => isLibraryOpen && closeLibrary()}>
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

            {!isLibraryOpen && nodes.length === 0 && (
              <button
                className="empty-workflow-card"
                onClick={(event) => {
                  event.stopPropagation()
                  openLibrary()
                }}
              >
                <span>+</span>
                <strong>Agregar primer nodo</strong>
                <small>Elige lo que quieres construir o analizar</small>
              </button>
            )}

            {!isLibraryOpen && nodes.length > 0 && (
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

