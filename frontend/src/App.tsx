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
import AuditWorkspace, {
  type AuditWorkspaceFocus,
} from './components/workspaces/AuditWorkspace'
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

type WorkspaceMode = AuditWorkspaceFocus

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
    setWorkspaceMode('technical')
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
    <AuditWorkspace
      activeFocus={workspaceMode}
      nodeCount={nodes.length}
      edgeCount={edges.length}
      learningNeedCount={learningNeeds.length}
      dataSourceCount={0}
      onFocusChange={setWorkspaceMode}
      onRunWorkflow={runWorkflow}
      onOpenTools={openLibrary}
      commandLayer={(
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
              <strong>
                {learningNeeds.length} necesidad{learningNeeds.length === 1 ? '' : 'es'} detectada{learningNeeds.length === 1 ? '' : 's'}
              </strong>

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
      dataLayer={(
        <GuidedDataStage onCreateAnalysisFlow={handleGuidedAnalysisFlow} />
      )}
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
    />
  )

}

export default App










