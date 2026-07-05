import type { NodeProps } from '@xyflow/react'
import AuditWorkflowNode, {
  type AuditFlowNode,
  type WorkflowNodeActions,
} from './AuditWorkflowNode'

export function createWorkflowNodeTypes(actions: WorkflowNodeActions) {
  return {
    auditNode: (props: NodeProps<AuditFlowNode>) => (
      <AuditWorkflowNode {...props} {...actions} />
    ),
  }
}
