export {
  capabilityRegistry,
  getCapabilitiesByStatus,
  getCapabilityById,
  type AuditCapability,
  type CapabilityStatus,
} from './capabilityRegistry'

export {
  analyzeAuditIntent,
  type AuditIntent,
  type AuditIntentType,
} from './auditIntentAnalyzer'

export {
  orchestrateWorkspace,
  type WorkspaceRecommendation,
} from './workspaceOrchestrator'

export {
  readLearningBacklog,
  saveLearningBacklogItem,
  calculatePriority,
  type LearningBacklogItem,
} from './learningBacklog'

export {
  detectCanvasRecommendation,
  type CanvasAIRecommendation,
  type CanvasAIRecommendationType,
} from './canvasRecommendationEngine'
