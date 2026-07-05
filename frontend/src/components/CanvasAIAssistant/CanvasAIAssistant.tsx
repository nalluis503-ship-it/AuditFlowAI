import { useMemo, useState } from 'react'
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
  'Quiero analizar bases de datos',
  'Quiero revisar archivos Excel',
  'Quiero validar pagos contra contratos',
  'Quiero detectar duplicados',
  'Quiero generar hallazgos',
  'Quiero crear un reporte',
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
        'Para iniciar con bases de datos, conviene conectar la fuente, explorar tablas y perfilar columnas antes de hacer cruces o validaciones.',
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
        'La IA puede ayudarte a iniciar con fuentes de pago, perfilar campos clave y sugerir una validación contra contratos, facturas o proveedores.',
      recommendedNode: 'Carga inteligente de archivos',
      suggestedFlow: [
        'Cargar archivos de pagos y contratos',
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
      title: 'Construcción de hallazgos de auditoría',
      summary:
        'Para generar hallazgos, primero se requiere una fuente de resultados o evidencia trazable.',
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
  const [prompt, setPrompt] = useState('')
  const [lastPrompt, setLastPrompt] = useState('')
  const [recommendation, setRecommendation] = useState<CanvasAIRecommendation | null>(null)

  const placeholder = useMemo(
    () => 'Ejemplo: quiero analizar bases de datos de pagos contra contratos...',
    [],
  )

  const askAI = () => {
    const cleanPrompt = prompt.trim()

    if (!cleanPrompt) return

    const nextRecommendation = detectRecommendation(cleanPrompt)
    setLastPrompt(cleanPrompt)
    setRecommendation(nextRecommendation)
  }

  const useQuickPrompt = (value: string) => {
    setPrompt(value)
    const nextRecommendation = detectRecommendation(value)
    setLastPrompt(value)
    setRecommendation(nextRecommendation)
  }

  return (
    <section className="canvas-ai-shell" onClick={(event) => event.stopPropagation()}>
      <div className="canvas-ai-glow" />

      <div className="canvas-ai-header">
        <div className="canvas-ai-orb">IA</div>

        <div>
          <span>Constructor inteligente</span>
          <h2>¿Qué quieres construir o analizar?</h2>
          <p>
            Puedes pedir ayuda a la IA o agregar un nodo manualmente si ya sabes qué herramienta usar.
          </p>
        </div>
      </div>

      <div className="canvas-ai-command">
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder={placeholder}
        />

        <div className="canvas-ai-command-actions">
          <button type="button" className="canvas-ai-primary" onClick={askAI}>
            Preguntar a IA
          </button>

          <button type="button" className="canvas-ai-secondary" onClick={onOpenManualLibrary}>
            + Agregar nodo manual
          </button>
        </div>
      </div>

      <div className="canvas-ai-quick-actions">
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

      {recommendation && (
        <div className="canvas-ai-recommendation">
          <div className="canvas-ai-recommendation-main">
            <span>Recomendación IA</span>
            <h3>{recommendation.title}</h3>
            <p>{recommendation.summary}</p>
          </div>

          <div className="canvas-ai-node-card">
            <small>Nodo recomendado</small>
            <strong>{recommendation.recommendedNode}</strong>
          </div>

          <div className="canvas-ai-flow-card">
            <small>Flujo sugerido</small>

            <ol>
              {recommendation.suggestedFlow.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="canvas-ai-result-actions">
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
              onClick={() => onSaveLearningNeed(recommendation, lastPrompt)}
            >
              Guardar aprendizaje
            </button>
          </div>
        </div>
      )}
    </section>
  )
}

export default CanvasAIAssistant
