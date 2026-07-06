import type { AuditIntent } from './auditIntentAnalyzer'
import type { WorkspaceRecommendation } from './workspaceOrchestrator'

export type LearningBacklogItem = {
  id: string
  prompt: string
  intentType: AuditIntent['type']
  intentTitle: string
  confidence: number
  missingCapabilities: string[]
  developerMessage: string
  createdAt: string
  priority: 'low' | 'medium' | 'high'
}

const storageKey = 'auditflow.intelligenceBacklog'

export function calculatePriority(
  intent: AuditIntent,
  recommendation: WorkspaceRecommendation,
): LearningBacklogItem['priority'] {
  if (recommendation.missingCapabilities.length >= 2 && intent.confidence >= 0.85) {
    return 'high'
  }

  if (recommendation.missingCapabilities.length >= 1) {
    return 'medium'
  }

  return 'low'
}

export function readLearningBacklog(): LearningBacklogItem[] {
  try {
    const storedValue = window.localStorage.getItem(storageKey)

    if (!storedValue) return []

    return JSON.parse(storedValue) as LearningBacklogItem[]
  } catch {
    return []
  }
}

export function saveLearningBacklogItem(
  intent: AuditIntent,
  recommendation: WorkspaceRecommendation,
): LearningBacklogItem {
  const item: LearningBacklogItem = {
    id: `${intent.type}-${Date.now()}`,
    prompt: intent.userPrompt,
    intentType: intent.type,
    intentTitle: intent.title,
    confidence: intent.confidence,
    missingCapabilities: recommendation.missingCapabilities,
    developerMessage:
      recommendation.developerMessage ?? `El auditor solicitó "${intent.title}".`,
    createdAt: new Date().toLocaleString(),
    priority: calculatePriority(intent, recommendation),
  }

  const currentItems = readLearningBacklog()
  const nextItems = [item, ...currentItems].slice(0, 30)

  window.localStorage.setItem(storageKey, JSON.stringify(nextItems))

  return item
}
