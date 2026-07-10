import { useMemo, useState } from 'react'
import {
  analyzeAuditIntent,
  detectCanvasRecommendation,
  orchestrateWorkspace,
  saveLearningBacklogItem,
  type AuditIntent,
  type CanvasAIRecommendation,
  type WorkspaceRecommendation,
} from '../../intelligence'
import './CanvasAIAssistant.css'

type CanvasAIAssistantProps = {
  showStartActions?: boolean
  onOpenManualLibrary: () => void
  onCreateRecommendedNode: (recommendation: CanvasAIRecommendation) => void
  onCreateRecommendedFlow: (recommendation: CanvasAIRecommendation) => void
  onSaveLearningNeed: (recommendation: CanvasAIRecommendation, prompt: string) => void
}

const quickPrompts = [
  'Analizar bases de datos',
  'Revisar archivos Excel',
  'Validar pagos contra contratos',
  'Detectar duplicados',
  'Generar hallazgos',
  'Crear reporte',
]

const aiHints = [
  'Puedo detectar intención auditora',
  'Puedo revisar capacidades disponibles',
  'Puedo registrar brechas para desarrollo',
  'Puedo sugerir el espacio de trabajo adecuado',
]

function CanvasAIAssistant({
  showStartActions = true,
  onOpenManualLibrary,
  onCreateRecommendedNode,
  onCreateRecommendedFlow,
  onSaveLearningNeed,
}: CanvasAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [lastPrompt, setLastPrompt] = useState('')
  const [hintIndex, setHintIndex] = useState(0)
  const [recommendation, setRecommendation] = useState<CanvasAIRecommendation | null>(null)
  const [auditIntent, setAuditIntent] = useState<AuditIntent | null>(null)
  const [workspaceRecommendation, setWorkspaceRecommendation] =
    useState<WorkspaceRecommendation | null>(null)
  const [savedMessage, setSavedMessage] = useState('')
  const [showTechnicalDetail, setShowTechnicalDetail] = useState(false)

  const activeHint = aiHints[hintIndex % aiHints.length]

  const placeholder = useMemo(
    () => 'Ejemplo: quiero validar pagos contra contratos con dos bases de Excel...',
    [],
  )

  const processPrompt = (value: string) => {
    const cleanPrompt = value.trim()

    if (!cleanPrompt) return

    const nextRecommendation = detectCanvasRecommendation(cleanPrompt)
    const nextIntent = analyzeAuditIntent(cleanPrompt)
    const nextWorkspaceRecommendation = orchestrateWorkspace(nextIntent)

    setLastPrompt(cleanPrompt)
    setRecommendation(nextRecommendation)
    setAuditIntent(nextIntent)
    setWorkspaceRecommendation(nextWorkspaceRecommendation)
    setSavedMessage('')
    setShowTechnicalDetail(false)

    if (nextWorkspaceRecommendation.missingCapabilities.length > 0) {
      saveLearningBacklogItem(nextIntent, nextWorkspaceRecommendation)
    }
  }

  const askAI = () => {
    processPrompt(prompt)
  }

  const handleQuickPrompt = (value: string) => {
    setPrompt(value)
    setIsOpen(true)
    processPrompt(value)
  }

  const saveLearning = () => {
    if (!recommendation) return

    onSaveLearningNeed(recommendation, lastPrompt)
    setSavedMessage('Aprendizaje guardado para recomendaciones futuras.')
  }

  const rotateHint = () => {
    setHintIndex((currentIndex) => currentIndex + 1)
  }

  const hasTechnicalDetail = Boolean(auditIntent && workspaceRecommendation)
  const missingCapabilities = workspaceRecommendation?.missingCapabilities ?? []
  const simulatedCapabilities = workspaceRecommendation?.simulatedCapabilities ?? []
  const availableCapabilities = workspaceRecommendation?.availableCapabilities ?? []

  return (
    <>
      {showStartActions && (
        <div className="empty-workflow-start">
          <button
            type="button"
            className="manual-start-card"
            onClick={onOpenManualLibrary}
          >
            <span>+</span>
            <strong>Abrir herramientas</strong>
            <small>Usa herramientas manuales solo cuando quieras controlar el análisis directamente.</small>
          </button>

          <div className="quick-start-strip">
            {quickPrompts.slice(0, 4).map((quickPrompt) => (
              <button
                type="button"
                key={quickPrompt}
                onClick={() => handleQuickPrompt(quickPrompt)}
              >
                {quickPrompt}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        className={isOpen ? 'ai-copilot-launcher active' : 'ai-copilot-launcher'}
        onClick={() => setIsOpen(true)}
        onMouseEnter={rotateHint}
      >
        <span className="ai-copilot-orb">IA</span>

        <span className="ai-copilot-copy">
          <strong>AuditFlow IA</strong>
          <small>{activeHint}</small>
        </span>
      </button>

      {isOpen && (
        <aside className="ai-copilot-panel" onClick={(event) => event.stopPropagation()}>
          <header className="ai-copilot-header">
            <div className="ai-copilot-orb">IA</div>

            <div>
              <span>Copiloto inteligente</span>
              <strong>Asistente de auditoría</strong>
              <small>Convierte tu solicitud en análisis, pasos guiados y siguiente acción.</small>
            </div>

            <button
              type="button"
              className="ai-copilot-close"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </header>

          <div className="ai-copilot-body">
            <div className="ai-copilot-command">
              <textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={placeholder}
              />

              <div className="ai-copilot-command-actions">
                <button type="button" className="canvas-ai-primary" onClick={askAI}>
                  Analizar solicitud
                </button>

                <button type="button" className="canvas-ai-secondary" onClick={onOpenManualLibrary}>
                  Abrir herramientas
                </button>
              </div>
            </div>

            <div className="ai-copilot-quick-actions">
              {quickPrompts.map((quickPrompt) => (
                <button
                  type="button"
                  key={quickPrompt}
                  onClick={() => handleQuickPrompt(quickPrompt)}
                >
                  {quickPrompt}
                </button>
              ))}
            </div>

            {auditIntent && workspaceRecommendation && recommendation ? (
              <section className="ai-auditor-summary-card">
                <span>Qué entendí</span>
                <h3>{auditIntent.title}</h3>
                <p>{auditIntent.summary}</p>

                <div className="ai-auditor-next-step">
                  <strong>Qué puedo hacer ahora</strong>
                  <small>{workspaceRecommendation.primaryAction}</small>
                </div>

                {missingCapabilities.length > 0 ? (
                  <div className="ai-auditor-gap">
                    <strong>Para hacerlo real todavía falta</strong>

                    <ul>
                      {missingCapabilities.slice(0, 3).map((capability) => (
                        <li key={capability}>{capability}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="ai-auditor-ready">
                    <strong>Capacidad disponible</strong>
                    <small>La app puede preparar este análisis con las capacidades actuales.</small>
                  </div>
                )}

                <article className="ai-auditor-flow-preview">
                  <small>Ruta sugerida</small>

                  <ol>
                    {recommendation.suggestedFlow.map((step) => (
                      <li key={step}>{step}</li>
                    ))}
                  </ol>
                </article>

                <div className="ai-copilot-result-actions">
                  <button
                    type="button"
                    className="canvas-ai-primary"
                    onClick={() => onCreateRecommendedFlow(recommendation)}
                  >
                    Preparar análisis guiado
                  </button>

                  <button
                    type="button"
                    className="canvas-ai-secondary"
                    onClick={() => onCreateRecommendedNode(recommendation)}
                  >
                    Crear paso inicial
                  </button>

                  <button
                    type="button"
                    className="canvas-ai-ghost"
                    onClick={() => setShowTechnicalDetail((currentValue) => !currentValue)}
                  >
                    {showTechnicalDetail ? 'Ocultar detalle técnico' : 'Ver detalle técnico'}
                  </button>
                </div>

                <button
                  type="button"
                  className="ai-save-learning-link"
                  onClick={saveLearning}
                >
                  Guardar esta necesidad para aprendizaje
                </button>

                {savedMessage && (
                  <div className="ai-learning-saved">
                    {savedMessage}
                  </div>
                )}

                {showTechnicalDetail && hasTechnicalDetail && (
                  <div className="ai-technical-detail">
                    <div className="ai-intelligence-grid">
                      <article>
                        <small>Intención detectada</small>
                        <strong>{auditIntent.title}</strong>
                        <em>{Math.round(auditIntent.confidence * 100)}% confianza</em>
                      </article>

                      <article>
                        <small>Vista recomendada</small>
                        <strong>{workspaceRecommendation.workspaceMode}</strong>
                        <em>{workspaceRecommendation.primaryAction}</em>
                      </article>
                    </div>

                    {availableCapabilities.length > 0 && (
                      <div className="ai-capability-list available">
                        <strong>Disponible</strong>

                        {availableCapabilities.map((capability) => (
                          <small key={capability}>✓ {capability}</small>
                        ))}
                      </div>
                    )}

                    {simulatedCapabilities.length > 0 && (
                      <div className="ai-capability-list simulated">
                        <strong>Simulado</strong>

                        {simulatedCapabilities.map((capability) => (
                          <small key={capability}>◐ {capability}</small>
                        ))}
                      </div>
                    )}

                    {missingCapabilities.length > 0 && (
                      <div className="ai-capability-list missing">
                        <strong>Brechas detectadas</strong>

                        {missingCapabilities.map((capability) => (
                          <small key={capability}>× {capability}</small>
                        ))}
                      </div>
                    )}

                    {workspaceRecommendation.developerMessage && (
                      <div className="ai-developer-message">
                        <strong>Mensaje para desarrollo</strong>
                        <p>{workspaceRecommendation.developerMessage}</p>
                      </div>
                    )}
                  </div>
                )}
              </section>
            ) : (
              <div className="ai-copilot-empty-state">
                <strong>Describe qué quieres auditar.</strong>
                <p>
                  La IA identificará tu intención, preparará una ruta sugerida y señalará qué
                  capacidades faltan para convertirlo en análisis real.
                </p>
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  )
}

export default CanvasAIAssistant

