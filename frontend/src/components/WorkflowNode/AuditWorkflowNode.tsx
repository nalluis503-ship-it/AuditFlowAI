import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import type { NodeDataType } from '../../data/toolCatalog'
import './WorkflowNode.css'

export type NodeExecutionStatus =
  | 'idle'
  | 'pending'
  | 'running'
  | 'success'
  | 'warning'
  | 'error'

export type NodeFileMeta = {
  id: string
  name: string
  size: number
  type: string
  lastModified: number
}

export type AuditNodeData = {
  icon: string
  title: string
  description: string
  variant: 'excel' | 'mysql' | 'ai'
  toolId?: string
  actionId?: string
  outputType?: NodeDataType
  status?: NodeExecutionStatus
  summary?: string
  files?: NodeFileMeta[]
  resultSummary?: string[]
}

export type AuditFlowNode = Node<AuditNodeData, 'auditNode'>

export type WorkflowNodeActions = {
  onSmartConnect?: (nodeId: string, outputType: NodeDataType) => void
  onOpenNode?: (nodeId: string) => void
  onDeleteNode?: (nodeId: string) => void
}

type AuditWorkflowNodeProps = NodeProps<AuditFlowNode> & WorkflowNodeActions

const statusLabel: Record<NodeExecutionStatus, string> = {
  idle: 'Sin ejecutar',
  pending: 'Pendiente',
  running: 'Ejecutando',
  success: 'Correcto',
  warning: 'Revisión',
  error: 'Error',
}

function AuditWorkflowNode({
  id,
  data,
  selected,
  onSmartConnect,
  onOpenNode,
  onDeleteNode,
}: AuditWorkflowNodeProps) {
  const outputType = data.outputType
  const status = data.status ?? 'idle'
  const canSuggestNextStep = Boolean(outputType && onSmartConnect)

  return (
    <div
      className={`audit-node ${selected ? 'selected-node' : ''} node-status-${status}`}
      onDoubleClick={(event) => {
        event.stopPropagation()
        onOpenNode?.(id)
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="audit-handle audit-handle-left"
      />

      <div className="node-action-bar">
        {onOpenNode && (
          <button
            className="node-icon-action"
            title="Abrir nodo"
            onClick={(event) => {
              event.stopPropagation()
              onOpenNode(id)
            }}
          >
            ⚙
          </button>
        )}

        {onDeleteNode && (
          <button
            className="node-icon-action danger"
            title="Eliminar nodo"
            onClick={(event) => {
              event.stopPropagation()
              onDeleteNode(id)
            }}
          >
            🗑
          </button>
        )}
      </div>

      <div className={`audit-node-icon ${data.variant}`}>{data.icon}</div>
      <strong>{data.title}</strong>
      <small>{data.summary ?? data.description}</small>

      <div className="node-status-row">
        <span className={`node-status-dot ${status}`} />
        <span>{statusLabel[status]}</span>
      </div>

      {canSuggestNextStep && outputType && (
        <button
          className="smart-node-add-button"
          title="Sugerir siguiente acción compatible"
          onClick={(event) => {
            event.stopPropagation()
            onSmartConnect?.(id, outputType)
          }}
        >
          +
        </button>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="audit-handle audit-handle-right"
      />
    </div>
  )
}

export default AuditWorkflowNode
