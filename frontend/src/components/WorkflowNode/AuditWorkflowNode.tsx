import {
  Handle,
  Position,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import type { NodeDataType } from '../../data/toolCatalog'

export type AuditNodeData = {
  icon: string
  title: string
  description: string
  variant: 'excel' | 'mysql' | 'ai'
  toolId?: string
  actionId?: string
  outputType?: NodeDataType
}

export type AuditFlowNode = Node<AuditNodeData, 'auditNode'>

function AuditWorkflowNode({ data, selected }: NodeProps<AuditFlowNode>) {
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
