import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import type { NodeDataType } from '../../data/toolCatalog'
import './WorkflowNode.css'

export type AuditNodeData = {
  icon: string
  title: string
  description: string
  variant: 'excel' | 'mysql' | 'ai'
  toolId?: string
  actionId?: string
  outputType?: NodeDataType
  onSmartConnect?: (nodeId: string, outputType: NodeDataType) => void
}

export type AuditFlowNode = Node<AuditNodeData, 'auditNode'>

function AuditWorkflowNode({ id, data, selected }: NodeProps<AuditFlowNode>) {
  const outputType = data.outputType ?? 'unknown'

  return (
    <div className={selected ? 'audit-node selected-node' : 'audit-node'}>
      <Handle
        type="target"
        position={Position.Left}
        className="audit-handle audit-handle-left"
      />

      <div className={`audit-node-icon ${data.variant}`}>{data.icon}</div>
      <strong>{data.title}</strong>
      <small>{data.description}</small>

      {data.onSmartConnect && (
        <button
          className="smart-node-add-button"
          title="Sugerir siguiente acción"
          onClick={(event) => {
            event.stopPropagation()
            data.onSmartConnect?.(id, outputType)
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

export const nodeTypes = {
  auditNode: AuditWorkflowNode,
}

export default AuditWorkflowNode
