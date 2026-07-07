export type SemanticAuditIntentType =
  | 'payment-contract-validation'
  | 'duplicate-detection'
  | 'document-evidence-review'
  | 'data-comparison'
  | 'report-generation'
  | 'finding-generation'
  | 'general-audit-analysis'

export type SemanticAuditSubtype =
  | 'amount-difference'
  | 'missing-support'
  | 'duplicate-payment'
  | 'contract-compliance'
  | 'provider-review'
  | 'document-review'
  | 'generic'

export type SemanticAuditIntent = {
  type: SemanticAuditIntentType
  subtype: SemanticAuditSubtype
  title: string
  summary: string
  confidence: number
  detectedSignals: string[]
  requiredData: string[]
  risks: string[]
  userPrompt: string
}

type IntentSignalGroup = {
  terms: string[]
  weight: number
}

type IntentDefinition = {
  type: SemanticAuditIntentType
  title: string
  summary: string
  signalGroups: IntentSignalGroup[]
  requiredData: string[]
  risks: string[]
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function collectMatchedSignals(value: string, groups: IntentSignalGroup[]) {
  const matchedSignals: string[] = []
  let score = 0
  let maxScore = 0

  for (const group of groups) {
    maxScore += group.weight

    const matchedTerm = group.terms.find((term) => value.includes(normalize(term)))

    if (matchedTerm) {
      score += group.weight
      matchedSignals.push(matchedTerm)
    }
  }

  return {
    score,
    maxScore,
    matchedSignals,
  }
}

const intentDefinitions: IntentDefinition[] = [
  {
    type: 'payment-contract-validation',
    title: 'Validación de pagos, contratos y proveedores',
    summary:
      'El auditor busca revisar pagos, contratos, facturas, proveedores, montos, fechas o soporte documental.',
    signalGroups: [
      {
        terms: ['pago', 'pagos', 'erogacion', 'erogaciones', 'cobro', 'cobros', 'poliza', 'polizas'],
        weight: 3,
      },
      {
        terms: ['contrato', 'contratos', 'convenio', 'convenios', 'adjudicacion', 'orden de compra'],
        weight: 3,
      },
      {
        terms: ['proveedor', 'proveedores', 'beneficiario', 'beneficiarios', 'rfc'],
        weight: 2,
      },
      {
        terms: ['factura', 'facturas', 'comprobante', 'comprobantes', 'soporte', 'evidencia'],
        weight: 2,
      },
      {
        terms: ['monto', 'importe', 'total', 'cobro de mas', 'pagado de mas', 'diferencia'],
        weight: 2,
      },
    ],
    requiredData: ['Base de pagos', 'Base de contratos', 'Proveedores', 'Montos', 'Fechas'],
    risks: ['Pagos sin contrato', 'Diferencias de monto', 'Pagos sin soporte', 'Proveedores no coincidentes'],
  },
  {
    type: 'duplicate-detection',
    title: 'Detección de duplicados',
    summary:
      'El auditor quiere detectar registros, pagos, facturas, folios o proveedores repetidos.',
    signalGroups: [
      {
        terms: ['duplicado', 'duplicados', 'repetido', 'repetidos', 'doble pago', 'doble cobro'],
        weight: 4,
      },
      {
        terms: ['pago', 'pagos', 'factura', 'facturas', 'folio', 'folios', 'proveedor'],
        weight: 2,
      },
      {
        terms: ['mismo monto', 'misma fecha', 'mismo proveedor', 'coincidencia'],
        weight: 2,
      },
    ],
    requiredData: ['Base de registros', 'Campos de identificación', 'Montos', 'Fechas'],
    risks: ['Pagos duplicados', 'Facturas repetidas', 'Folios repetidos', 'Coincidencias sospechosas'],
  },
  {
    type: 'document-evidence-review',
    title: 'Revisión de evidencia documental',
    summary:
      'El auditor necesita revisar documentos, oficios, contratos, PDFs o evidencia soporte.',
    signalGroups: [
      {
        terms: ['pdf', 'documento', 'documentos', 'oficio', 'oficios', 'archivo digital'],
        weight: 3,
      },
      {
        terms: ['evidencia', 'soporte', 'comprobante', 'anexo', 'expediente'],
        weight: 3,
      },
      {
        terms: ['pagina', 'paginas', 'texto', 'extraer', 'leer documento', 'marcar evidencia'],
        weight: 2,
      },
    ],
    requiredData: ['Documentos PDF/Word', 'Evidencia', 'Referencias por página'],
    risks: ['Evidencia faltante', 'Soporte incompleto', 'Diferencias entre documento y base'],
  },
  {
    type: 'data-comparison',
    title: 'Cruce y comparación de bases',
    summary:
      'El auditor requiere comparar dos o más bases para detectar coincidencias, diferencias o faltantes.',
    signalGroups: [
      {
        terms: ['cruzar', 'comparar', 'relacionar', 'conciliar', 'match', 'unir bases'],
        weight: 4,
      },
      {
        terms: ['base', 'bases', 'excel', 'tabla', 'tablas', 'dataset'],
        weight: 2,
      },
      {
        terms: ['coinciden', 'no coinciden', 'faltantes', 'diferencias', 'sin correspondencia'],
        weight: 2,
      },
    ],
    requiredData: ['Dos o más bases', 'Campos clave', 'Reglas de comparación'],
    risks: ['Registros sin correspondencia', 'Diferencias entre fuentes', 'Campos clave incorrectos'],
  },
  {
    type: 'finding-generation',
    title: 'Generación de hallazgos',
    summary:
      'El auditor busca convertir resultados o evidencia en observaciones, cédulas o hallazgos.',
    signalGroups: [
      {
        terms: ['hallazgo', 'hallazgos', 'observacion', 'observaciones', 'cedula', 'cedulas'],
        weight: 4,
      },
      {
        terms: ['condicion', 'criterio', 'causa', 'efecto', 'recomendacion'],
        weight: 2,
      },
      {
        terms: ['redactar', 'generar', 'preparar', 'sustentar'],
        weight: 1,
      },
    ],
    requiredData: ['Resultado fuente', 'Evidencia', 'Criterio normativo'],
    risks: ['Hallazgo sin evidencia', 'Redacción sin trazabilidad', 'Falta de criterio'],
  },
  {
    type: 'report-generation',
    title: 'Generación de reporte',
    summary:
      'El auditor requiere generar un informe, reporte, anexo o documento final.',
    signalGroups: [
      {
        terms: ['reporte', 'informe', 'word', 'pdf final', 'exportar', 'documento final'],
        weight: 4,
      },
      {
        terms: ['resumen ejecutivo', 'anexo', 'entregable', 'plantilla'],
        weight: 2,
      },
      {
        terms: ['hallazgos', 'resultados', 'evidencia', 'trazabilidad'],
        weight: 1,
      },
    ],
    requiredData: ['Hallazgos', 'Resultados', 'Evidencia', 'Plantilla'],
    risks: ['Reporte sin soporte', 'Resultados no trazables', 'Falta de anexos'],
  },
]

function detectSubtype(value: string): SemanticAuditSubtype {
  if (
    value.includes('duplicado') ||
    value.includes('repetido') ||
    value.includes('doble pago')
  ) {
    return 'duplicate-payment'
  }

  if (
    value.includes('sin soporte') ||
    value.includes('sin comprobante') ||
    value.includes('sin evidencia') ||
    value.includes('faltante')
  ) {
    return 'missing-support'
  }

  if (
    value.includes('cobro de mas') ||
    value.includes('pagado de mas') ||
    value.includes('monto') ||
    value.includes('importe') ||
    value.includes('diferencia')
  ) {
    return 'amount-difference'
  }

  if (
    value.includes('contrato') ||
    value.includes('convenio') ||
    value.includes('contratado') ||
    value.includes('adjudicacion')
  ) {
    return 'contract-compliance'
  }

  if (
    value.includes('proveedor') ||
    value.includes('beneficiario') ||
    value.includes('rfc')
  ) {
    return 'provider-review'
  }

  if (
    value.includes('pdf') ||
    value.includes('documento') ||
    value.includes('evidencia') ||
    value.includes('oficio')
  ) {
    return 'document-review'
  }

  return 'generic'
}

export function analyzeSemanticAuditIntent(prompt: string): SemanticAuditIntent {
  const value = normalize(prompt)

  const scoredDefinitions = intentDefinitions.map((definition) => {
    const result = collectMatchedSignals(value, definition.signalGroups)
    const confidence = result.maxScore === 0 ? 0 : result.score / result.maxScore

    return {
      definition,
      score: result.score,
      confidence,
      matchedSignals: result.matchedSignals,
    }
  })

  const bestMatch = scoredDefinitions
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence)[0]

  if (!bestMatch || bestMatch.score === 0) {
    return {
      type: 'general-audit-analysis',
      subtype: 'generic',
      title: 'Análisis general de auditoría',
      summary:
        'La solicitud requiere más contexto. AuditFlow puede iniciar con un flujo general y pedir fuentes de información.',
      confidence: 0.45,
      detectedSignals: [],
      requiredData: ['Objetivo de auditoría', 'Fuente de información'],
      risks: ['Intención ambigua', 'Falta de datos iniciales'],
      userPrompt: prompt,
    }
  }

  const confidence = Math.min(0.96, Math.max(0.52, bestMatch.confidence))

  return {
    type: bestMatch.definition.type,
    subtype: detectSubtype(value),
    title: bestMatch.definition.title,
    summary: bestMatch.definition.summary,
    confidence,
    detectedSignals: bestMatch.matchedSignals,
    requiredData: bestMatch.definition.requiredData,
    risks: bestMatch.definition.risks,
    userPrompt: prompt,
  }
}
