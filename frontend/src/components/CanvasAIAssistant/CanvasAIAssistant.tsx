import { useMemo, useState } from 'react'
import {
  analyzeAuditIntent,
  orchestrateWorkspace,
  saveLearningBacklogItem,
  type AuditIntent,
  type WorkspaceRecommendation,
} from '../../intelligence'
import './CanvasAIAssistant.css'

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
}

type CanvasAIAssistantProps = {
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

function detectRecommendation(prompt: string): CanvasAIRecommendation {
  const value = prompt.toLowerCase()

  if (
    value.includes('base') ||
    value.includes('sql') ||
    value.includes('mysql') ||
    value.includes('postgres') ||
    value.includes('datos')
  ) {
    return {
      type: 'database-analysis',
      title: 'Análisis inteligente de base de datos',
      summary:
        'Para analizar bases de datos conviene iniciar conectando la fuente, explorar tablas y perfilar columnas antes de cruzar o validar.',
      recommendedNode: 'Conectar base de datos',
      suggestedFlow: [
        'Conectar base de datos',
        'Explorar tablas',
        'Perfilar columnas',
        'Sugerir pruebas de auditoría',
      ],
      developerNeed:
        'Detectar motores y estructuras de base de datos solicitadas con frecuencia para priorizar conectores y plantillas.',
    }
  }

  if (
    value.includes('pago') ||
    value.includes('contrato') ||
    value.includes('factura') ||
    value.includes('proveedor')
  ) {
    return {
      type: 'payment-validation',
      title: 'Validación de pagos contra soporte',
      summary:
        'Para validar pagos, la IA recomienda cargar o conectar las fuentes, perfilar campos clave y después ejecutar una validación contra contratos, facturas o proveedores.',
      recommendedNode: 'Carga inteligente de archivos',
      suggestedFlow: [
        'Cargar fuentes de pagos y contratos',
        'Perfilar columnas y documentos',
        'Cruzar pagos contra contratos',
        'Generar hallazgos preliminares',
      ],
      developerNeed:
        'El auditor solicita validaciones de pagos contra contratos. Evaluar plantilla especializada o acción dentro de validación inteligente.',
    }
  }

  if (
    value.includes('excel') ||
    value.includes('archivo') ||
    value.includes('csv') ||
    value.includes('pdf')
  ) {
    return {
      type: 'file-review',
      title: 'Revisión inteligente de archivos',
      summary:
        'Para revisar archivos, inicia con una carga flexible, conserva trazabilidad por archivo y después perfila el contenido.',
      recommendedNode: 'Carga inteligente de archivos',
      suggestedFlow: [
        'Cargar archivos',
        'Perfilar contenido',
        'Visualizar resultados',
        'Sugerir análisis por contenido',
      ],
      developerNeed:
        'Registrar tipos de archivos recurrentes para mejorar lectores, vistas previas y extracción documental.',
    }
  }

  if (
    value.includes('hallazgo') ||
    value.includes('observacion') ||
    value.includes('observación') ||
    value.includes('evidencia')
  ) {
    return {
      type: 'findings',
      title: 'Construcción de hallazgos',
      summary:
        'Para generar hallazgos, primero se requiere un resultado, evidencia o fuente trazable.',
      recommendedNode: 'Generar hallazgos',
      suggestedFlow: [
        'Seleccionar resultado fuente',
        'Clasificar riesgo',
        'Redactar hallazgo',
        'Anexar trazabilidad',
      ],
      developerNeed:
        'Analizar patrones de redacción de hallazgos solicitados para mejorar plantillas institucionales.',
    }
  }

  if (
    value.includes('reporte') ||
    value.includes('informe') ||
    value.includes('word') ||
    value.includes('pdf')
  ) {
    return {
      type: 'report',
      title: 'Generación de reporte',
      summary:
        'Para generar un reporte sólido, conviene partir de hallazgos, resultados o anexos ya trazables.',
      recommendedNode: 'Generar reporte',
      suggestedFlow: [
        'Seleccionar hallazgos',
        'Elegir plantilla',
        'Agregar evidencia',
        'Generar documento editable',
      ],
      developerNeed:
        'Detectar formatos de reporte más usados para priorizar plantillas y exportadores.',
    }
  }

  return {
    type: 'general',
    title: 'Asistencia inteligente de workflow',
    summary:
      'Puedo ayudarte a elegir una herramienta inicial, construir un flujo sugerido o guardar esta necesidad para mejorar el sistema.',
    recommendedNode: 'IA auditora',
    suggestedFlow: [
      'Definir objetivo',
      'Elegir fuente de datos',
      'Seleccionar análisis',
      'Generar resultados',
    ],
    developerNeed:
      'Necesidad no clasificada. Revisar si debe convertirse en plantilla, acción o mejora de una herramienta existente.',
  }
}

function CanvasAIAssistant({
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

  const activeHint = aiHints[hintIndex % aiHints.length]

  const placeholder = useMemo(
    () => 'Ejemplo: quiero validar pagos contra contratos con dos bases de Excel...',
    [],
  )

  const processPrompt = (value: string) => {
    const cleanPrompt = value.trim()

    if (!cleanPrompt) return

    const nextRecommendation = detectRecommendation(cleanPrompt)
    const nextIntent = analyzeAuditIntent(cleanPrompt)
    const nextWorkspaceRecommendation = orchestrateWorkspace(nextIntent)

    setLastPrompt(cleanPrompt)
    setRecommendation(nextRecommendation)
    setAuditIntent(nextIntent)
    setWorkspaceRecommendation(nextWorkspaceRecommendation)
    setSavedMessage('')

    if (nextWorkspaceRecommendation.missingCapabilities.length > 0) {
      saveLearningBacklogItem(nextIntent, nextWorkspaceRecommendation)
    }
  }

  const askAI = () => {
    processPrompt(prompt)
  }

  const useQuickPrompt = (value: string) => {
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

  return (
    <>
      <div className="empty-workflow-start">
        <button
          type="button"
          className="manual-start-card"
          onClick={onOpenManualLibrary}
        >
          <span>+</span>
          <strong>Agregar nodo manual</strong>
          <small>Elige directamente una herramienta si ya sabes cómo quieres iniciar.</small>
        </button>

        <div className="quick-start-strip">
          {quickPrompts.slice(0, 4).map((quickPrompt) => (
            <button
              type="button"
              key={quickPrompt}
              onClick={() => useQuickPrompt(quickPrompt)}
            >
              {quickPrompt}
            </button>
          ))}
        </div>
      </div>

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
              <strong>Entiende intención, capacidades y brechas</strong>
              <small>No finge capacidades: detecta lo que existe y lo que falta.</small>
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
                  Analizar intención
                </button>

                <button type="button" className="canvas-ai-secondary" onClick={onOpenManualLibrary}>
                  + Agregar nodo manual
                </button>
              </div>
            </div>

            <div className="ai-copilot-quick-actions">
              {quickPrompts.map((quickPrompt) => (
                <button
                  type="button"
                  key={quickPrompt}
                  onClick={() => useQuickPrompt(quickPrompt)}
                >
                  {quickPrompt}
                </button>
              ))}
            </div>

            {auditIntent && workspaceRecommendation && (
              <section className="ai-intelligence-card">
                <span>Núcleo inteligente</span>
                <h3>{workspaceRecommendation.workspaceTitle}</h3>
                <p>{workspaceRecommendation.explanation}</p>

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

                {workspaceRecommendation.availableCapabilities.length > 0 && (
                  <div className="ai-capability-list available">
                    <strong>Disponible</strong>

                    {workspaceRecommendation.availableCapabilities.map((capability) => (
                      <small key={capability}>✓ {capability}</small>
                    ))}
                  </div>
                )}

                {workspaceRecommendation.simulatedCapabilities.length > 0 && (
                  <div className="ai-capability-list simulated">
                    <strong>Simulado</strong>

                    {workspaceRecommendation.simulatedCapabilities.map((capability) => (
                      <small key={capability}>◐ {capability}</small>
                    ))}
                  </div>
                )}

                {workspaceRecommendation.missingCapabilities.length > 0 && (
                  <div className="ai-capability-list missing">
                    <strong>Brechas detectadas</strong>

                    {workspaceRecommendation.missingCapabilities.map((capability) => (
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
              </section>
            )}

            {recommendation ? (
              <div className="ai-copilot-recommendation">
                <span>Recomendación IA</span>
                <h3>{recommendation.title}</h3>
                <p>{recommendation.summary}</p>

                <article className="ai-recommended-node-card">
                  <small>Nodo recomendado</small>
                  <strong>{recommendation.recommendedNode}</strong>
                </article>

                <article className="ai-suggested-flow-card">
                  <small>Flujo sugerido</small>

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
                    onClick={() => onCreateRecommendedNode(recommendation)}
                  >
                    Crear primer nodo
                  </button>

                  <button
                    type="button"
                    className="canvas-ai-secondary"
                    onClick={() => onCreateRecommendedFlow(recommendation)}
                  >
                    Crear flujo sugerido
                  </button>

                  <button
                    type="button"
                    className="canvas-ai-ghost"
                    onClick={saveLearning}
                  >
                    Guardar aprendizaje
                  </button>
                </div>

                {savedMessage && (
                  <div className="ai-learning-saved">
                    {savedMessage}
                  </div>
                )}
              </div>
            ) : (
              <div className="ai-copilot-empty-state">
                <strong>Estoy listo para interpretar la solicitud del auditor.</strong>
                <p>
                  Describe qué quieres auditar. Revisaré la intención, las capacidades disponibles,
                  las brechas técnicas y el espacio de trabajo recomendado.
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
