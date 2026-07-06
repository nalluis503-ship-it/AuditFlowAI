export type AuditIntentType =
  | 'upload-data'
  | 'view-data'
  | 'profile-data'
  | 'join-data'
  | 'validate-payments'
  | 'find-duplicates'
  | 'review-documents'
  | 'create-findings'
  | 'generate-report'
  | 'general-analysis'

export type AuditIntent = {
  type: AuditIntentType
  title: string
  confidence: number
  summary: string
  requiredCapabilities: string[]
  suggestedWorkspace: 'data-table' | 'data-profile' | 'comparison' | 'document-viewer' | 'findings' | 'report' | 'workflow'
  userPrompt: string
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function includesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

export function analyzeAuditIntent(prompt: string): AuditIntent {
  const value = normalize(prompt)

  if (includesAny(value, ['subir', 'cargar', 'importar', 'excel', 'csv', 'base'])) {
    return {
      type: 'upload-data',
      title: 'Carga de información',
      confidence: 0.82,
      summary: 'El auditor necesita cargar una o varias fuentes de datos para iniciar el análisis.',
      requiredCapabilities: ['file-upload-metadata', 'excel-real-reader'],
      suggestedWorkspace: 'data-table',
      userPrompt: prompt,
    }
  }

  if (includesAny(value, ['ver base', 'visualizar', 'tabla', 'columnas', 'registros', 'hojas'])) {
    return {
      type: 'view-data',
      title: 'Visualización de datos',
      confidence: 0.84,
      summary: 'El auditor necesita revisar la información cargada en una vista amplia y comprensible.',
      requiredCapabilities: ['excel-real-reader'],
      suggestedWorkspace: 'data-table',
      userPrompt: prompt,
    }
  }

  if (includesAny(value, ['perfilar', 'tipos', 'vacios', 'vacíos', 'calidad', 'campos', 'detectar columnas'])) {
    return {
      type: 'profile-data',
      title: 'Perfilado de datos',
      confidence: 0.86,
      summary: 'El auditor requiere entender estructura, calidad y campos clave de las bases.',
      requiredCapabilities: ['excel-real-reader', 'automatic-column-profiling'],
      suggestedWorkspace: 'data-profile',
      userPrompt: prompt,
    }
  }

  if (includesAny(value, ['cruzar', 'comparar bases', 'relacionar', 'match', 'coinciden', 'no coinciden'])) {
    return {
      type: 'join-data',
      title: 'Cruce de bases',
      confidence: 0.88,
      summary: 'El auditor necesita relacionar dos o más fuentes y detectar coincidencias o diferencias.',
      requiredCapabilities: ['excel-real-reader', 'automatic-column-profiling', 'dataset-join-engine'],
      suggestedWorkspace: 'comparison',
      userPrompt: prompt,
    }
  }

  if (includesAny(value, ['pago', 'pagos', 'contrato', 'contratos', 'factura', 'proveedor', 'monto'])) {
    return {
      type: 'validate-payments',
      title: 'Validación de pagos contra contratos',
      confidence: 0.92,
      summary: 'El auditor busca validar pagos, contratos, proveedores, facturas, fechas o montos.',
      requiredCapabilities: ['excel-real-reader', 'automatic-column-profiling', 'payment-contract-validation'],
      suggestedWorkspace: 'comparison',
      userPrompt: prompt,
    }
  }

  if (includesAny(value, ['duplicado', 'duplicados', 'repetido', 'repetidos'])) {
    return {
      type: 'find-duplicates',
      title: 'Búsqueda de duplicados',
      confidence: 0.86,
      summary: 'El auditor necesita identificar registros repetidos o posibles coincidencias anómalas.',
      requiredCapabilities: ['excel-real-reader', 'automatic-column-profiling', 'dataset-join-engine'],
      suggestedWorkspace: 'comparison',
      userPrompt: prompt,
    }
  }

  if (includesAny(value, ['pdf', 'documento', 'evidencia', 'oficio', 'contrato digital', 'pagina', 'página'])) {
    return {
      type: 'review-documents',
      title: 'Revisión documental',
      confidence: 0.82,
      summary: 'El auditor necesita revisar documentos, extraer evidencia o relacionar contenido con hallazgos.',
      requiredCapabilities: ['document-evidence-viewer'],
      suggestedWorkspace: 'document-viewer',
      userPrompt: prompt,
    }
  }

  if (includesAny(value, ['hallazgo', 'observacion', 'observación', 'cedula', 'cédula'])) {
    return {
      type: 'create-findings',
      title: 'Construcción de hallazgos',
      confidence: 0.88,
      summary: 'El auditor quiere transformar resultados o evidencia en hallazgos revisables.',
      requiredCapabilities: ['finding-generator'],
      suggestedWorkspace: 'findings',
      userPrompt: prompt,
    }
  }

  if (includesAny(value, ['reporte', 'informe', 'word', 'pdf final', 'exportar'])) {
    return {
      type: 'generate-report',
      title: 'Generación de reporte',
      confidence: 0.84,
      summary: 'El auditor requiere generar una salida documental con resultados, hallazgos o anexos.',
      requiredCapabilities: ['finding-generator', 'report-export'],
      suggestedWorkspace: 'report',
      userPrompt: prompt,
    }
  }

  return {
    type: 'general-analysis',
    title: 'Análisis general de auditoría',
    confidence: 0.55,
    summary: 'La solicitud requiere orientación general. La aplicación debe proponer un flujo o pedir más contexto.',
    requiredCapabilities: ['visual-workflow-execution', 'node-level-results'],
    suggestedWorkspace: 'workflow',
    userPrompt: prompt,
  }
}
