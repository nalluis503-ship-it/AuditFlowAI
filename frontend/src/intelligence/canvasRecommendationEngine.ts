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

export function detectCanvasRecommendation(prompt: string): CanvasAIRecommendation {
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
