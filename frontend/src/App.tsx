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
import { applyExecutionResultToNodeData, executeWorkflowNode, sortNodesForExecution } from './engine/workflowExecutionEngine'
import ToolLibrary from './components/ToolLibrary/ToolLibrary'
import SmartConnectMenu from './components/SmartConnect/SmartConnectMenu'
import NodeEditor from './components/NodeEditor'
import GuidedDataStage from './components/GuidedDataStage'
import CanvasAIAssistant, {
  type CanvasAIRecommendation,
} from './components/CanvasAIAssistant'
import {
  toolCatalog,
  type NodeDataType,
  type ToolAction,
  type ToolDefinition,
} from './data/toolCatalog'
import {
  createWorkflowNodeTypes,
  type AuditFlowNode,
  type NodeFileMeta,
} from './components/WorkflowNode'
import {
  getGuidedAnalysisActionIds,
  type GuidedAnalysisFlowIntent,
} from './intelligence/guidedAnalysisFlowPlanner'

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

type LearningNeed = {
  id: string
  prompt: string
  type: CanvasAIRecommendation['type']
  title: string
  developerNeed?: string
  createdAt: string
}

type ToolActionSelection = {
  tool: ToolDefinition
  action: ToolAction
}

type WorkspaceMode = 'canvas' | 'guided-data-stage'

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
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

function findToolActionByKeywords(
  toolKeywords: string[],
  actionKeywords: string[] = [],
): ToolActionSelection | null {
  const normalizedToolKeywords = toolKeywords.map(normalize)
  const normalizedActionKeywords = actionKeywords.map(normalize)

  const tool = toolCatalog.find((candidateTool) => {
    const searchableTool = normalize(
      `${candidateTool.id} ${candidateTool.name} ${candidateTool.categoryId} ${candidateTool.outputType ?? ''}`,
    )

    return normalizedToolKeywords.some((keyword) => searchableTool.includes(keyword))
  })

  if (!tool) return null

  const action =
    tool.actions.find((candidateAction) => {
      const searchableAction = normalize(
        `${candidateAction.id} ${candidateAction.name} ${candidateAction.outputType ?? ''}`,
      )

      return normalizedActionKeywords.some((keyword) => searchableAction.includes(keyword))
    }) ?? tool.actions[0]

  if (!action) return null

  return {
    tool,
    action,
  }
}

function findToolActionByActionId(actionId: string): ToolActionSelection | null {
  for (const tool of toolCatalog) {
    const action = tool.actions.find((candidateAction) => candidateAction.id === actionId)

    if (action) {
      return {
        tool,
        action,
      }
    }
  }

  return null
}
function getRecommendationPlan(
  recommendation: CanvasAIRecommendation,
): ToolActionSelection[] {
  const removeDuplicateSelections = (selections: ToolActionSelection[]) =>
    selections.filter((selection, index, currentSelections) => {
      const key = `${selection.tool.id}-${selection.action.id}`

      return currentSelections.findIndex((currentSelection) =>
        `${currentSelection.tool.id}-${currentSelection.action.id}` === key
      ) === index
    })

  if (recommendation.workflowPlan?.toolSteps?.length) {
    const plannedSelections = recommendation.workflowPlan.toolSteps
      .map((step) =>
        step.actionId
          ? findToolActionByActionId(step.actionId) ?? findToolActionByKeywords(step.toolKeywords, step.actionKeywords)
          : findToolActionByKeywords(step.toolKeywords, step.actionKeywords),
      )
      .filter((selection): selection is ToolActionSelection => Boolean(selection))

    if (plannedSelections.length > 0) return plannedSelections
  }

  const blueprints: Record<CanvasAIRecommendation['type'], Array<{
    toolKeywords: string[]
    actionKeywords?: string[]
  }>> = {
    'database-analysis': [
      { toolKeywords: ['sql', 'mysql', 'base', 'database'], actionKeywords: ['conectar', 'consultar', 'sql'] },
      { toolKeywords: ['viewer', 'visualizador', 'vista', 'datos'], actionKeywords: ['visualizar', 'perfil', 'ver'] },
      { toolKeywords: ['ai', 'ia', 'auditor'], actionKeywords: ['sugerir', 'analizar'] },
    ],
    'file-review': [
      { toolKeywords: ['pdf', 'documento', 'evidencia', 'archivo'], actionKeywords: ['pdf', 'documento', 'cargar', 'visualizar'] },
      { toolKeywords: ['viewer', 'visualizador', 'vista', 'datos'], actionKeywords: ['visualizar', 'perfil', 'ver'] },
      { toolKeywords: ['ai', 'ia', 'auditor'], actionKeywords: ['analizar', 'sugerir'] },
    ],
    'payment-validation': [
      { toolKeywords: ['upload', 'subir', 'excel', 'archivo'], actionKeywords: ['subir', 'cargar'] },
      { toolKeywords: ['payment-validation', 'validar pagos', 'pago'], actionKeywords: ['validar pagos contra contratos', 'validar pagos', 'pago'] },
      { toolKeywords: ['audit-finding', 'hallazgo', 'finding'], actionKeywords: ['crear hallazgo', 'hallazgo', 'generar'] },
    ],
    findings: [
      { toolKeywords: ['hallazgo', 'finding', 'audit'], actionKeywords: ['hallazgo', 'generar'] },
      { toolKeywords: ['report', 'reporte', 'informe'], actionKeywords: ['reporte', 'generar'] },
    ],
    report: [
      { toolKeywords: ['report', 'reporte', 'informe'], actionKeywords: ['reporte', 'generar'] },
    ],
    general: [
      { toolKeywords: ['ai', 'ia', 'auditor'], actionKeywords: ['sugerir', 'analizar'] },
    ],
  }

  const selections = blueprints[recommendation.type]
    .map((blueprint) =>
      findToolActionByKeywords(blueprint.toolKeywords, blueprint.actionKeywords),
    )
    .filter((selection): selection is ToolActionSelection => Boolean(selection))

  const uniqueSelections = removeDuplicateSelections(selections)

  if (uniqueSelections.length > 0) return uniqueSelections

  const fallbackTool = toolCatalog[0]
  const fallbackAction = fallbackTool?.actions[0]

  if (!fallbackTool || !fallbackAction) return []

  return [
    {
      tool: fallbackTool,
      action: fallbackAction,
    },
  ]
}

function readLearningNeedsFromStorage(): LearningNeed[] {
  try {
    const storedValue = window.localStorage.getItem('auditflow.learningNeeds')

    if (!storedValue) return []

    return JSON.parse(storedValue) as LearningNeed[]
  } catch {
    return []
  }
}

function App() {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [smartConnectContext, setSmartConnectContext] = useState<SmartConnectContext | null>(null)
  const [openNodeId, setOpenNodeId] = useState<string | null>(null)
  const [learningNeeds, setLearningNeeds] = useState<LearningNeed[]>(readLearningNeedsFromStorage)
  const [nodes, setNodes, onNodesChange] = useNodesState<AuditFlowNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('canvas')

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
    setWorkspaceMode('canvas')
    closeSmartConnect()
    closeNodeEditor()
    setIsLibraryOpen(true)
  }

  const closeLibrary = () => {
    setIsLibraryOpen(false)
  }

  const openCanvasWorkspace = () => {
    setWorkspaceMode('canvas')
  }

  const openGuidedDataStage = () => {
    closeSmartConnect()
    closeNodeEditor()
    closeLibrary()
    setWorkspaceMode('guided-data-stage')
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

  const addRecommendedNode = (recommendation: CanvasAIRecommendation) => {
    const [selection] = getRecommendationPlan(recommendation)

    if (!selection) return

    addToolNode(selection.tool, selection.action)
  }

  const addFlowFromSelections = (selections: ToolActionSelection[]) => {
    if (selections.length === 0) return

    const timestamp = Date.now()
    const baseX = nodes.length > 0 ? 220 + nodes.length * 80 : 180
    const baseY = nodes.length > 0 ? 380 : 230

    const recommendedNodes: AuditFlowNode[] = selections.map((selection, index) => ({
      id: `ai-${selection.tool.id}-${selection.action.id}-${timestamp}-${index}`,
      type: 'auditNode',
      position: {
        x: baseX + index * 300,
        y: baseY + (index % 2) * 36,
      },
      data: createNodeData(selection.tool, selection.action),
    }))

    const recommendedEdges: Edge[] = recommendedNodes.slice(1).map((node, index) => ({
      id: `${recommendedNodes[index].id}-${node.id}`,
      source: recommendedNodes[index].id,
      target: node.id,
      animated: true,
    }))

    setNodes((currentNodes) => [...currentNodes, ...recommendedNodes])
    setEdges((currentEdges) => [...currentEdges, ...recommendedEdges])
  }

  const addRecommendedFlow = (recommendation: CanvasAIRecommendation) => {
    addFlowFromSelections(getRecommendationPlan(recommendation))
  }

  const handleGuidedAnalysisFlow = (intent: GuidedAnalysisFlowIntent) => {
    const selections = getGuidedAnalysisActionIds(intent)
      .map(findToolActionByActionId)
      .filter((selection): selection is ToolActionSelection => Boolean(selection))

    addFlowFromSelections(selections)
    setWorkspaceMode('canvas')
  }

  const saveLearningNeed = (
    recommendation: CanvasAIRecommendation,
    prompt: string,
  ) => {
    const need: LearningNeed = {
      id: `${recommendation.type}-${Date.now()}`,
      prompt,
      type: recommendation.type,
      title: recommendation.title,
      developerNeed: recommendation.developerNeed,
      createdAt: new Date().toLocaleString(),
    }

    setLearningNeeds((currentNeeds) => {
      const nextNeeds = [need, ...currentNeeds].slice(0, 6)

      window.localStorage.setItem('auditflow.learningNeeds', JSON.stringify(nextNeeds))

      return nextNeeds
    })
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

  const showCanvasAssistant =
    workspaceMode === 'canvas' && !isLibraryOpen && !smartConnectContext && !openedNode


  const sleep = (milliseconds: number) =>
    new Promise((resolve) => window.setTimeout(resolve, milliseconds))

  const runWorkflow = async () => {
    if (nodes.length === 0) return

    const orderedNodes = sortNodesForExecution(nodes)
    const completedNodeIds = new Set<string>()

    for (const workflowNode of orderedNodes) {
      setNodes((currentNodes) =>
        currentNodes.map((currentNode) =>
          currentNode.id === workflowNode.id
            ? {
                ...currentNode,
                data: {
                  ...currentNode.data,
                  status: 'running',
                  summary: 'Ejecutando...',
                  resultSummary: ['Nodo en ejecución visual.'],
                },
              }
            : currentNode,
        ),
      )

      await sleep(650)

      const currentSnapshotNode =
        nodes.find((node) => node.id === workflowNode.id) ?? workflowNode

      const result = executeWorkflowNode(currentSnapshotNode, {
        nodes: orderedNodes,
        edges,
        completedNodeIds,
      })

      setNodes((currentNodes) =>
        currentNodes.map((currentNode) =>
          currentNode.id === workflowNode.id
            ? {
                ...currentNode,
                data: applyExecutionResultToNodeData(currentNode.data, result),
              }
            : currentNode,
        ),
      )

      if (result.status === 'success') {
        completedNodeIds.add(workflowNode.id)
      }

      await sleep(220)
    }
  }

  const runSingleNode = async (nodeId: string) => {
    const targetNode = nodes.find((node) => node.id === nodeId)

    if (!targetNode) return

    setNodes((currentNodes) =>
      currentNodes.map((currentNode) =>
        currentNode.id === nodeId
          ? {
              ...currentNode,
              data: {
                ...currentNode.data,
                status: 'running',
                summary: 'Ejecutando...',
                resultSummary: ['Nodo en ejecución visual.'],
              },
            }
          : currentNode,
      ),
    )

    await sleep(650)

    const completedNodeIds = new Set(
      nodes
        .filter((node) => node.id !== nodeId && node.data.status === 'success')
        .map((node) => node.id),
    )

    const currentSnapshotNode =
      nodes.find((node) => node.id === nodeId) ?? targetNode

    const result = executeWorkflowNode(currentSnapshotNode, {
      nodes,
      edges,
      completedNodeIds,
    })

    setNodes((currentNodes) =>
      currentNodes.map((currentNode) =>
        currentNode.id === nodeId
          ? {
              ...currentNode,
              data: applyExecutionResultToNodeData(currentNode.data, result),
            }
          : currentNode,
      ),
    )
  }
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

            <button className="ghost-button" type="button" onClick={runWorkflow}>
              Ejecutar
            </button>

            <button
              className={workspaceMode === 'guided-data-stage' ? 'ghost-button active' : 'ghost-button'}
              type="button"
              onClick={workspaceMode === 'guided-data-stage' ? openCanvasWorkspace : openGuidedDataStage}
            >
              {workspaceMode === 'guided-data-stage' ? 'Volver al canvas' : 'Mesa de análisis'}
            </button>

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
          <div className={`canvas-panel ${workspaceMode === 'guided-data-stage' ? 'guided-stage-panel' : ''}`}>
            {workspaceMode === 'guided-data-stage' ? (
              <div className="guided-stage-shell" onClick={(event) => event.stopPropagation()}>
                <GuidedDataStage onCreateAnalysisFlow={handleGuidedAnalysisFlow} />
              </div>
            ) : (
              <>
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

            {showCanvasAssistant && (
              <>
                <CanvasAIAssistant
                  showStartActions={nodes.length === 0}
                  onOpenManualLibrary={openLibrary}
                  onCreateRecommendedNode={addRecommendedNode}
                  onCreateRecommendedFlow={addRecommendedFlow}
                  onSaveLearningNeed={saveLearningNeed}
                />

                {learningNeeds.length > 0 && (
                  <aside className="learning-memory-dock">
                    <span>Memoria de aprendizaje</span>
                    <strong>{learningNeeds.length} necesidad{learningNeeds.length === 1 ? '' : 'es'} detectada{learningNeeds.length === 1 ? '' : 's'}</strong>

                    <div>
                      {learningNeeds.slice(0, 3).map((need) => (
                        <article key={need.id}>
                          <small>{need.type}</small>
                          <p>{need.prompt || need.title}</p>
                        </article>
                      ))}
                    </div>
                  </aside>
                )}
              </>
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
                onRunNode={runSingleNode}
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
          </div>
        </section>
      </main>
    </div>
  )
}

export default App










