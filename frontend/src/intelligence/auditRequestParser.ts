export type AuditSourceType =
  | 'sql'
  | 'excel'
  | 'csv'
  | 'pdf'
  | 'word'
  | 'dataset'
  | 'document'
  | 'unknown'

export type AuditOperationType =
  | 'analyze'
  | 'profile'
  | 'compare'
  | 'join'
  | 'validate'
  | 'detect-duplicates'
  | 'review-evidence'
  | 'generate-finding'
  | 'generate-report'
  | 'generate-cedula'
  | 'classify-risk'
  | 'export-results'

export type AuditEntityType =
  | 'payments'
  | 'contracts'
  | 'providers'
  | 'invoices'
  | 'documents'
  | 'databases'
  | 'findings'
  | 'risks'
  | 'generic'

export type AuditOutputArtifact =
  | 'finding'
  | 'report'
  | 'word'
  | 'excel'
  | 'cedula'
  | 'riskMatrix'
  | 'evidence'
  | 'none'

export type AuditRequestProfile = {
  normalizedPrompt: string
  sourceTypes: AuditSourceType[]
  sourceCount: number
  operations: AuditOperationType[]
  entities: AuditEntityType[]
  outputArtifacts: AuditOutputArtifact[]
  needsSql: boolean
  needsMultipleSources: boolean
  needsComparison: boolean
  needsWord: boolean
  needsCedula: boolean
  needsRiskMatrix: boolean
  needsExcelExport: boolean
  confidenceNotes: string[]
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

function addUnique<T>(items: T[], item: T) {
  if (!items.includes(item)) {
    items.push(item)
  }
}

function detectSourceTypes(value: string): AuditSourceType[] {
  const sourceTypes: AuditSourceType[] = []

  if (includesAny(value, ['sql', 'mysql', 'postgres', 'postgresql', 'sql server', 'oracle', 'sqlite', 'base de datos'])) {
    addUnique(sourceTypes, 'sql')
  }

  if (includesAny(value, ['excel', 'xlsx', 'xls', 'hoja de calculo'])) {
    addUnique(sourceTypes, 'excel')
  }

  if (includesAny(value, ['csv'])) {
    addUnique(sourceTypes, 'csv')
  }

  if (includesAny(value, ['pdf'])) {
    addUnique(sourceTypes, 'pdf')
  }

  if (includesAny(value, ['word', 'docx', 'documento editable'])) {
    addUnique(sourceTypes, 'word')
  }

  if (includesAny(value, ['documento', 'documentos', 'oficio', 'expediente', 'evidencia'])) {
    addUnique(sourceTypes, 'document')
  }

  if (
    sourceTypes.length === 0 &&
    includesAny(value, ['base', 'bases', 'tabla', 'tablas', 'dataset', 'datos'])
  ) {
    addUnique(sourceTypes, 'dataset')
  }

  if (sourceTypes.length === 0) {
    addUnique(sourceTypes, 'unknown')
  }

  return sourceTypes
}

function detectSourceCount(value: string, sourceTypes: AuditSourceType[]) {
  const numericMatch = value.match(/\b(\d+)\s+(base|bases|tabla|tablas|archivo|archivos|fuente|fuentes|sql|excel|pdf|documento|documentos)\b/)

  if (numericMatch) {
    return Math.max(1, Number(numericMatch[1]))
  }

  if (includesAny(value, ['dos bases', 'dos tablas', 'dos archivos', 'dos fuentes'])) {
    return 2
  }

  if (includesAny(value, ['tres bases', 'tres tablas', 'tres archivos', 'tres fuentes'])) {
    return 3
  }

  if (includesAny(value, ['varias bases', 'varias tablas', 'varios archivos', 'varias fuentes', 'multiples bases', 'multiples fuentes'])) {
    return 3
  }

  if (sourceTypes.length > 1) {
    return sourceTypes.length
  }

  return 1
}

function detectOperations(value: string): AuditOperationType[] {
  const operations: AuditOperationType[] = []

  if (includesAny(value, ['analiza', 'analizar', 'analizame', 'revisar', 'revision', 'evaluar'])) {
    addUnique(operations, 'analyze')
  }

  if (includesAny(value, ['perfilar', 'perfilado', 'columnas', 'estructura', 'tipos de dato'])) {
    addUnique(operations, 'profile')
  }

  if (includesAny(value, ['comparar', 'compara', 'diferencias', 'conciliar', 'coinciden', 'no coinciden'])) {
    addUnique(operations, 'compare')
  }

  if (includesAny(value, ['cruzar', 'cruza', 'relacionar', 'unir', 'match', 'campo clave'])) {
    addUnique(operations, 'join')
  }

  if (includesAny(value, ['validar', 'valida', 'verificar', 'cumplimiento'])) {
    addUnique(operations, 'validate')
  }

  if (includesAny(value, ['duplicado', 'duplicados', 'repetido', 'repetidos', 'doble pago'])) {
    addUnique(operations, 'detect-duplicates')
  }

  if (includesAny(value, ['evidencia', 'soporte documental', 'marcar evidencia', 'documentos soporte'])) {
    addUnique(operations, 'review-evidence')
  }

  if (includesAny(value, ['hallazgo', 'hallazgos', 'observacion', 'observaciones'])) {
    addUnique(operations, 'generate-finding')
  }

  if (includesAny(value, ['reporte', 'informe', 'resumen ejecutivo'])) {
    addUnique(operations, 'generate-report')
  }

  if (includesAny(value, ['cedula', 'cedulas', 'papel de trabajo', 'papeles de trabajo'])) {
    addUnique(operations, 'generate-cedula')
  }

  if (includesAny(value, ['matriz de riesgos', 'riesgo', 'riesgos', 'impacto', 'probabilidad'])) {
    addUnique(operations, 'classify-risk')
  }

  if (includesAny(value, ['exportar', 'excel de resultados', 'resultado a excel', 'diferencias a excel'])) {
    addUnique(operations, 'export-results')
  }

  if (operations.length === 0) {
    addUnique(operations, 'analyze')
  }

  return operations
}

function detectEntities(value: string): AuditEntityType[] {
  const entities: AuditEntityType[] = []

  if (includesAny(value, ['pago', 'pagos', 'poliza', 'polizas', 'erogacion'])) {
    addUnique(entities, 'payments')
  }

  if (includesAny(value, ['contrato', 'contratos', 'convenio', 'adjudicacion'])) {
    addUnique(entities, 'contracts')
  }

  if (includesAny(value, ['proveedor', 'proveedores', 'beneficiario', 'rfc'])) {
    addUnique(entities, 'providers')
  }

  if (includesAny(value, ['factura', 'facturas', 'comprobante', 'comprobantes'])) {
    addUnique(entities, 'invoices')
  }

  if (includesAny(value, ['documento', 'documentos', 'pdf', 'word', 'expediente', 'oficio'])) {
    addUnique(entities, 'documents')
  }

  if (includesAny(value, ['base', 'bases', 'tabla', 'tablas', 'sql', 'dataset'])) {
    addUnique(entities, 'databases')
  }

  if (includesAny(value, ['hallazgo', 'hallazgos', 'observacion', 'observaciones'])) {
    addUnique(entities, 'findings')
  }

  if (includesAny(value, ['riesgo', 'riesgos', 'matriz'])) {
    addUnique(entities, 'risks')
  }

  if (entities.length === 0) {
    addUnique(entities, 'generic')
  }

  return entities
}

function detectOutputArtifacts(value: string): AuditOutputArtifact[] {
  const artifacts: AuditOutputArtifact[] = []

  if (includesAny(value, ['hallazgo', 'hallazgos', 'observacion', 'observaciones'])) {
    addUnique(artifacts, 'finding')
  }

  if (includesAny(value, ['reporte', 'informe', 'resumen ejecutivo'])) {
    addUnique(artifacts, 'report')
  }

  if (
    includesAny(value, [
      'word editable',
      'docx editable',
      'informe word',
      'reporte word',
      'generar word',
      'crear word',
      'documento editable',
      'plantilla word',
      'insertar hallazgos en word',
    ])
  ) {
    addUnique(artifacts, 'word')
  }

  if (
    includesAny(value, [
      'exportar a excel',
      'exportar resultados a excel',
      'resultado a excel',
      'resultados a excel',
      'diferencias a excel',
      'excel de resultados',
      'reporte excel',
      'anexo excel',
      'generar excel',
    ])
  ) {
    addUnique(artifacts, 'excel')
  }

  if (includesAny(value, ['cedula', 'cedulas', 'papel de trabajo'])) {
    addUnique(artifacts, 'cedula')
  }

  if (includesAny(value, ['matriz de riesgos', 'riesgo', 'riesgos'])) {
    addUnique(artifacts, 'riskMatrix')
  }

  if (includesAny(value, ['evidencia', 'soporte'])) {
    addUnique(artifacts, 'evidence')
  }

  if (artifacts.length === 0) {
    addUnique(artifacts, 'none')
  }

  return artifacts
}

export function parseAuditRequest(prompt: string): AuditRequestProfile {
  const normalizedPrompt = normalize(prompt)
  const sourceTypes = detectSourceTypes(normalizedPrompt)
  const sourceCount = detectSourceCount(normalizedPrompt, sourceTypes)
  const operations = detectOperations(normalizedPrompt)
  const entities = detectEntities(normalizedPrompt)
  const outputArtifacts = detectOutputArtifacts(normalizedPrompt)

  const needsSql = sourceTypes.includes('sql')
  const needsMultipleSources = sourceCount > 1
  const needsComparison =
    needsMultipleSources ||
    operations.includes('compare') ||
    operations.includes('join')

  const needsWord = outputArtifacts.includes('word')

  const needsCedula =
    operations.includes('generate-cedula') ||
    outputArtifacts.includes('cedula')

  const needsRiskMatrix =
    operations.includes('classify-risk') ||
    outputArtifacts.includes('riskMatrix')

  const needsExcelExport =
    operations.includes('export-results') ||
    outputArtifacts.includes('excel')

  const confidenceNotes: string[] = []

  confidenceNotes.push(`Fuentes detectadas: ${sourceTypes.join(', ')}`)
  confidenceNotes.push(`Cantidad de fuentes: ${sourceCount}`)
  confidenceNotes.push(`Operaciones: ${operations.join(', ')}`)
  confidenceNotes.push(`Entidades: ${entities.join(', ')}`)
  confidenceNotes.push(`Salidas esperadas: ${outputArtifacts.join(', ')}`)

  return {
    normalizedPrompt,
    sourceTypes,
    sourceCount,
    operations,
    entities,
    outputArtifacts,
    needsSql,
    needsMultipleSources,
    needsComparison,
    needsWord,
    needsCedula,
    needsRiskMatrix,
    needsExcelExport,
    confidenceNotes,
  }
}

