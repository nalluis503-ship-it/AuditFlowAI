import type { AuditIntent } from './auditIntentAnalyzer'
import { capabilityRegistry } from './capabilityRegistry'

export type WorkspaceRecommendation = {
  workspaceTitle: string
  workspaceMode: AuditIntent['suggestedWorkspace']
  primaryAction: string
  explanation: string
  availableCapabilities: string[]
  simulatedCapabilities: string[]
  missingCapabilities: string[]
  developerMessage?: string
}

export function orchestrateWorkspace(intent: AuditIntent): WorkspaceRecommendation {
  const requiredCapabilities = capabilityRegistry.filter((capability) =>
    intent.requiredCapabilities.includes(capability.id),
  )

  const availableCapabilities = requiredCapabilities
    .filter((capability) => capability.status === 'available')
    .map((capability) => capability.title)

  const simulatedCapabilities = requiredCapabilities
    .filter((capability) => capability.status === 'simulated')
    .map((capability) => capability.title)

  const missingCapabilities = requiredCapabilities
    .filter((capability) => capability.status === 'missing')
    .map((capability) => capability.title)

  const developerMessage =
    missingCapabilities.length > 0
      ? `El auditor solicita "${intent.title}", pero faltan capacidades: ${missingCapabilities.join(', ')}.`
      : undefined

  return {
    workspaceTitle: intent.title,
    workspaceMode: intent.suggestedWorkspace,
    primaryAction: missingCapabilities.length > 0
      ? 'Preparar flujo visual y registrar brecha'
      : 'Abrir espacio de trabajo recomendado',
    explanation: intent.summary,
    availableCapabilities,
    simulatedCapabilities,
    missingCapabilities,
    developerMessage,
  }
}
