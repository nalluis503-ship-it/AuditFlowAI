import {
  analyzeSemanticAuditIntent,
  type SemanticAuditIntent,
} from './semanticAuditIntentEngine'
import {
  planWorkflowFromIntent,
  type WorkflowPlan,
} from './workflowPlanner'
import {
  parseAuditRequest,
  type AuditRequestProfile,
} from './auditRequestParser'

export type CanvasAIRecommendationType =
  | 'database-analysis'
  | 'file-review'
  | 'payment-validation'
  | 'findings'
  | 'report'
  | 'general'

export type CanvasAIRecommendation = {
  type: CanvasAIRecommendationType
  title: string
  summary: string
  recommendedNode: string
  suggestedFlow: string[]
  developerNeed?: string
  semanticIntent?: SemanticAuditIntent
  requestProfile?: AuditRequestProfile
  workflowPlan?: WorkflowPlan
}

function mapSemanticIntentToCanvasType(
  intentType: SemanticAuditIntent['type'],
): CanvasAIRecommendationType {
  if (intentType === 'payment-contract-validation') {
    return 'payment-validation'
  }

  if (intentType === 'duplicate-detection' || intentType === 'data-comparison') {
    return 'database-analysis'
  }

  if (intentType === 'document-evidence-review') {
    return 'file-review'
  }

  if (intentType === 'finding-generation') {
    return 'findings'
  }

  if (intentType === 'report-generation') {
    return 'report'
  }

  return 'general'
}

function buildDeveloperNeed(
  intent: SemanticAuditIntent,
  requestProfile: AuditRequestProfile,
  plan: WorkflowPlan,
) {
  return [
    `Intención detectada: ${intent.title}`,
    `Subtipo: ${intent.subtype}`,
    `Confianza: ${Math.round(intent.confidence * 100)}%`,
    `Fuentes detectadas: ${requestProfile.sourceTypes.join(', ')}`,
    `Cantidad de fuentes: ${requestProfile.sourceCount}`,
    `Operaciones: ${requestProfile.operations.join(', ')}`,
    `Entidades: ${requestProfile.entities.join(', ')}`,
    `Salidas esperadas: ${requestProfile.outputArtifacts.join(', ')}`,
    `Datos requeridos: ${intent.requiredData.join(', ')}`,
    `Riesgos a revisar: ${intent.risks.join(', ')}`,
    `Flujo planeado: ${plan.steps.join(' → ')}`,
  ].join('\n')
}

export function detectCanvasRecommendation(prompt: string): CanvasAIRecommendation {
  const semanticIntent = analyzeSemanticAuditIntent(prompt)
  const requestProfile = parseAuditRequest(prompt)
  const workflowPlan = planWorkflowFromIntent(semanticIntent, requestProfile)

  return {
    type: mapSemanticIntentToCanvasType(semanticIntent.type),
    title: workflowPlan.title,
    summary: `${semanticIntent.summary} ${workflowPlan.summary}`,
    recommendedNode: workflowPlan.recommendedNode,
    suggestedFlow: workflowPlan.steps,
    developerNeed: buildDeveloperNeed(semanticIntent, requestProfile, workflowPlan),
    semanticIntent,
    requestProfile,
    workflowPlan,
  }
}
