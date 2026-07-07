export type NodeDataType =
  | 'file'
  | 'excel'
  | 'pdf'
  | 'word'
  | 'dataset'
  | 'sqlDataset'
  | 'document'
  | 'auditResult'
  | 'report'
  | 'control'
  | 'unknown'

export type ToolCategory = {
  id: string
  icon: string
  title: string
  description: string
}

export type ToolAction = {
  id: string
  icon: string
  name: string
  description: string
  inputTypes: NodeDataType[]
  outputType: NodeDataType
  aiSuggested: boolean
  requiresConfiguration: boolean
}

export type ToolDefinition = {
  id: string
  icon: string
  name: string
  categoryId: string
  description: string
  inputTypes: NodeDataType[]
  outputType: NodeDataType
  capabilities: string[]
  actions: ToolAction[]
}

export const toolCategories: ToolCategory[] = [
  {
    id: 'ai',
    icon: 'AI',
    title: 'IA',
    description: 'Agentes, analisis, redaccion, riesgos y ayuda inteligente.',
  },
  {
    id: 'data-analysis',
    icon: 'DATA',
    title: 'Analisis de datos',
    description: 'Convertir, visualizar, limpiar, cruzar y analizar bases.',
  },
  {
    id: 'documents',
    icon: 'DOC',
    title: 'Archivos y documentos',
    description: 'Excel, Word, PDF, CSV, JSON y evidencia documental.',
  },
  {
    id: 'viewers',
    icon: 'VIS',
    title: 'Visualizadores',
    description: 'Ver tablas, documentos, imagenes, evidencia y resultados.',
  },
  {
    id: 'audit',
    icon: 'AUD',
    title: 'Auditoria',
    description: 'Hallazgos, cedulas, matriz de riesgos y cumplimiento.',
  },
  {
    id: 'reports',
    icon: 'REP',
    title: 'Reportes',
    description: 'PDF, Word, Excel, graficas, dashboard y resumen ejecutivo.',
  },
  {
    id: 'logic',
    icon: 'IF',
    title: 'Flujo y logica',
    description: 'Condiciones, aprobaciones, rutas, merge y manejo de errores.',
  },
  {
    id: 'integrations',
    icon: 'API',
    title: 'Integraciones',
    description: 'APIs, correo, Google, Microsoft, webhooks y sistemas externos.',
  },
]

export const toolCatalog: ToolDefinition[] = [
  {
    id: 'upload-excel',
    icon: 'XLS',
    name: 'Subir Excel',
    categoryId: 'documents',
    description: 'Carga una base de datos desde un archivo Excel.',
    inputTypes: ['file', 'unknown'],
    outputType: 'excel',
    capabilities: ['upload', 'excel', 'dataset-source', 'profile-columns'],
    actions: [
      {
        id: 'upload-excel-file',
        icon: 'UP',
        name: 'Cargar archivo Excel',
        description: 'Seleccionar un archivo Excel para usarlo como fuente de datos.',
        inputTypes: ['file', 'unknown'],
        outputType: 'excel',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'preview-excel-sheets',
        icon: 'VIS',
        name: 'Visualizar hojas',
        description: 'Ver hojas, columnas y primeras filas del Excel cargado.',
        inputTypes: ['excel'],
        outputType: 'excel',
        aiSuggested: true,
        requiresConfiguration: false,
      },
    ],
  },
  {
    id: 'excel-to-sql',
    icon: 'SQL',
    name: 'Excel a SQL',
    categoryId: 'data-analysis',
    description: 'Convierte un Excel en una tabla SQL temporal para analisis.',
    inputTypes: ['excel'],
    outputType: 'sqlDataset',
    capabilities: ['convert', 'excel', 'sql', 'normalize-columns', 'dataset'],
    actions: [
      {
        id: 'convert-excel-to-sql',
        icon: 'SQL',
        name: 'Convertir Excel a SQL',
        description: 'Crear una tabla SQL temporal a partir del archivo Excel.',
        inputTypes: ['excel'],
        outputType: 'sqlDataset',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'normalize-excel-columns',
        icon: 'NORM',
        name: 'Normalizar columnas',
        description: 'Renombrar y limpiar columnas para analisis posterior.',
        inputTypes: ['excel'],
        outputType: 'dataset',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'data-viewer',
    icon: 'TBL',
    name: 'Visualizar datos',
    categoryId: 'viewers',
    description: 'Muestra tablas, columnas, registros y vista previa de una base.',
    inputTypes: ['dataset', 'sqlDataset', 'excel'],
    outputType: 'dataset',
    capabilities: ['preview', 'table', 'columns', 'filters', 'profile'],
    actions: [
      {
        id: 'view-table',
        icon: 'VIS',
        name: 'Ver tabla',
        description: 'Visualizar registros, columnas y filtros basicos.',
        inputTypes: ['dataset', 'sqlDataset', 'excel'],
        outputType: 'dataset',
        aiSuggested: true,
        requiresConfiguration: false,
      },
      {
        id: 'profile-dataset',
        icon: 'PROF',
        name: 'Perfilar datos',
        description: 'Detectar columnas, tipos, nulos y valores unicos.',
        inputTypes: ['dataset', 'sqlDataset', 'excel'],
        outputType: 'dataset',
        aiSuggested: true,
        requiresConfiguration: false,
      },
    ],
  },
  {
    id: 'duplicate-analysis',
    icon: 'DU',
    name: 'Buscar duplicados',
    categoryId: 'data-analysis',
    description: 'Detecta registros repetidos o posibles coincidencias.',
    inputTypes: ['dataset', 'sqlDataset'],
    outputType: 'auditResult',
    capabilities: ['duplicates', 'rfc', 'curp', 'folio', 'amount', 'date', 'similarity'],
    actions: [
      {
        id: 'find-exact-duplicates',
        icon: 'EX',
        name: 'Duplicados exactos',
        description: 'Buscar duplicados por campos identicos.',
        inputTypes: ['dataset', 'sqlDataset'],
        outputType: 'auditResult',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'find-rfc-duplicates',
        icon: 'RFC',
        name: 'Duplicados por RFC',
        description: 'Buscar registros repetidos por RFC o identificador fiscal.',
        inputTypes: ['dataset', 'sqlDataset'],
        outputType: 'auditResult',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'find-payment-duplicates',
        icon: 'PAY',
        name: 'Pagos duplicados',
        description: 'Buscar pagos repetidos por beneficiario, monto, fecha o folio.',
        inputTypes: ['dataset', 'sqlDataset'],
        outputType: 'auditResult',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'payment-validation',
    icon: 'PAY',
    name: 'Validar pagos',
    categoryId: 'data-analysis',
    description: 'Valida pagos especificos contra bases, contratos o evidencia.',
    inputTypes: ['dataset', 'sqlDataset'],
    outputType: 'auditResult',
    capabilities: ['payments', 'contract', 'evidence', 'amount', 'date', 'compliance'],
    actions: [
      {
        id: 'validate-payments-against-contracts',
        icon: 'PAY',
        name: 'Validar pagos contra contratos',
        description: 'Cruzar pagos contra contratos, proveedores, facturas, montos, fechas y soporte documental.',
        inputTypes: ['dataset', 'sqlDataset', 'excel'],
        outputType: 'auditResult',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'validate-payment-evidence',
        icon: 'EVI',
        name: 'Validar pagos contra evidencia',
        description: 'Cruzar pagos contra comprobantes o documentos de soporte.',
        inputTypes: ['dataset', 'sqlDataset'],
        outputType: 'auditResult',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'join-datasets',
    icon: 'JOIN',
    name: 'Cruzar bases',
    categoryId: 'data-analysis',
    description: 'Cruza dos o mas bases por campos clave.',
    inputTypes: ['dataset', 'sqlDataset'],
    outputType: 'dataset',
    capabilities: ['join', 'compare', 'match', 'rfc', 'folio', 'provider'],
    actions: [
      {
        id: 'join-by-key',
        icon: 'KEY',
        name: 'Cruzar por campo clave',
        description: 'Cruzar bases por folio, RFC, CURP, proveedor u otro campo.',
        inputTypes: ['dataset', 'sqlDataset'],
        outputType: 'dataset',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'find-unmatched-records',
        icon: 'MISS',
        name: 'Detectar registros sin correspondencia',
        description: 'Encontrar registros que no aparecen en otra base.',
        inputTypes: ['dataset', 'sqlDataset'],
        outputType: 'auditResult',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'pdf-tools',
    icon: 'PDF',
    name: 'PDF',
    categoryId: 'documents',
    description: 'Visualiza, extrae texto y analiza documentos PDF.',
    inputTypes: ['file', 'pdf', 'document'],
    outputType: 'document',
    capabilities: ['pdf', 'text-extraction', 'evidence', 'viewer'],
    actions: [
      {
        id: 'upload-pdf-document',
        icon: 'UP',
        name: 'Cargar documentos PDF',
        description: 'Seleccionar documentos PDF o evidencia documental para revision.',
        inputTypes: ['file', 'unknown'],
        outputType: 'pdf',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'view-pdf',
        icon: 'VIS',
        name: 'Visualizar PDF',
        description: 'Abrir visor de PDF con busqueda y navegacion por paginas.',
        inputTypes: ['pdf', 'document', 'file'],
        outputType: 'document',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'extract-pdf-text',
        icon: 'TXT',
        name: 'Extraer texto',
        description: 'Extraer texto del PDF para analisis.',
        inputTypes: ['pdf', 'document', 'file'],
        outputType: 'document',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'ai-auditor',
    icon: 'AI',
    name: 'IA Auditora',
    categoryId: 'ai',
    description: 'Analiza datos, documentos y resultados para sugerir acciones.',
    inputTypes: ['dataset', 'sqlDataset', 'document', 'auditResult', 'unknown'],
    outputType: 'auditResult',
    capabilities: ['ai', 'risk', 'explain', 'suggest-nodes', 'draft-observation'],
    actions: [
      {
        id: 'ai-suggest-next-step',
        icon: 'NEXT',
        name: 'Sugerir siguiente nodo',
        description: 'La IA recomienda que accion agregar al workflow.',
        inputTypes: ['dataset', 'sqlDataset', 'document', 'auditResult', 'unknown'],
        outputType: 'control',
        aiSuggested: true,
        requiresConfiguration: false,
      },
      {
        id: 'ai-explain-results',
        icon: 'EX',
        name: 'Explicar resultado',
        description: 'Explica hallazgos, tablas o inconsistencias detectadas.',
        inputTypes: ['dataset', 'sqlDataset', 'auditResult'],
        outputType: 'auditResult',
        aiSuggested: true,
        requiresConfiguration: false,
      },
      {
        id: 'ai-draft-observation',
        icon: 'OBS',
        name: 'Redactar observacion',
        description: 'Redacta una observacion tecnica con base en evidencia.',
        inputTypes: ['auditResult', 'document', 'dataset'],
        outputType: 'auditResult',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'audit-finding',
    icon: 'HAL',
    name: 'Hallazgo',
    categoryId: 'audit',
    description: 'Crea hallazgos preliminares vinculados con evidencia.',
    inputTypes: ['auditResult', 'document', 'dataset'],
    outputType: 'auditResult',
    capabilities: ['finding', 'evidence', 'risk', 'recommendation'],
    actions: [
      {
        id: 'create-finding',
        icon: 'NEW',
        name: 'Crear hallazgo',
        description: 'Crear hallazgo preliminar desde un resultado de analisis.',
        inputTypes: ['auditResult', 'document', 'dataset'],
        outputType: 'auditResult',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'link-evidence',
        icon: 'EVI',
        name: 'Vincular evidencia',
        description: 'Relacionar documentos, tablas o resultados con un hallazgo.',
        inputTypes: ['auditResult', 'document', 'dataset'],
        outputType: 'auditResult',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'report-generator',
    icon: 'REP',
    name: 'Generar reporte',
    categoryId: 'reports',
    description: 'Genera reportes, anexos y salidas ejecutivas.',
    inputTypes: ['auditResult', 'dataset', 'document'],
    outputType: 'report',
    capabilities: ['report', 'pdf', 'word', 'excel', 'executive-summary'],
    actions: [
      {
        id: 'generate-executive-summary',
        icon: 'SUM',
        name: 'Resumen ejecutivo',
        description: 'Generar resumen ejecutivo del analisis.',
        inputTypes: ['auditResult', 'dataset', 'document'],
        outputType: 'report',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'export-report-pdf',
        icon: 'PDF',
        name: 'Exportar reporte PDF',
        description: 'Exportar resultados en un reporte PDF.',
        inputTypes: ['auditResult', 'dataset', 'document'],
        outputType: 'report',
        aiSuggested: false,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'sql-connector',
    icon: 'SQL',
    name: 'Conectar SQL',
    categoryId: 'data-analysis',
    description: 'Conecta bases de datos SQL para consultar tablas, vistas y registros auditables.',
    inputTypes: ['unknown'],
    outputType: 'sqlDataset',
    capabilities: ['sql', 'database', 'connection', 'tables', 'queries', 'dataset-source'],
    actions: [
      {
        id: 'connect-sql-database',
        icon: 'DB',
        name: 'Conectar base SQL',
        description: 'Configurar conexión a MySQL, PostgreSQL, SQL Server, Oracle o SQLite.',
        inputTypes: ['unknown'],
        outputType: 'sqlDataset',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'inspect-sql-schema',
        icon: 'SCH',
        name: 'Explorar estructura SQL',
        description: 'Listar tablas, columnas, tipos de dato, llaves y relaciones posibles.',
        inputTypes: ['sqlDataset'],
        outputType: 'sqlDataset',
        aiSuggested: true,
        requiresConfiguration: false,
      },
      {
        id: 'run-readonly-sql-query',
        icon: 'QRY',
        name: 'Ejecutar consulta de solo lectura',
        description: 'Ejecutar consultas SELECT para análisis sin modificar la base.',
        inputTypes: ['sqlDataset'],
        outputType: 'dataset',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'csv-tools',
    icon: 'CSV',
    name: 'CSV',
    categoryId: 'documents',
    description: 'Importa, visualiza y normaliza archivos CSV para análisis.',
    inputTypes: ['file', 'unknown'],
    outputType: 'dataset',
    capabilities: ['csv', 'upload', 'delimiter-detection', 'dataset-source'],
    actions: [
      {
        id: 'upload-csv-file',
        icon: 'UP',
        name: 'Cargar archivo CSV',
        description: 'Seleccionar un archivo CSV como fuente de datos.',
        inputTypes: ['file', 'unknown'],
        outputType: 'dataset',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'detect-csv-structure',
        icon: 'DET',
        name: 'Detectar estructura CSV',
        description: 'Detectar delimitador, encabezados, columnas y codificación.',
        inputTypes: ['dataset', 'file'],
        outputType: 'dataset',
        aiSuggested: true,
        requiresConfiguration: false,
      },
    ],
  },
  {
    id: 'data-cleaning',
    icon: 'CLN',
    name: 'Limpiar datos',
    categoryId: 'data-analysis',
    description: 'Limpia, estandariza y prepara datos antes del cruce o validación.',
    inputTypes: ['dataset', 'sqlDataset', 'excel'],
    outputType: 'dataset',
    capabilities: ['cleaning', 'normalize', 'deduplicate', 'trim', 'format-dates', 'format-amounts'],
    actions: [
      {
        id: 'clean-dataset-values',
        icon: 'CLN',
        name: 'Limpiar valores',
        description: 'Eliminar espacios, caracteres extraños, nulos, formatos inconsistentes y duplicados simples.',
        inputTypes: ['dataset', 'sqlDataset', 'excel'],
        outputType: 'dataset',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'standardize-column-names',
        icon: 'COL',
        name: 'Estandarizar columnas',
        description: 'Normalizar nombres de columnas para facilitar cruces y validaciones.',
        inputTypes: ['dataset', 'sqlDataset', 'excel'],
        outputType: 'dataset',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'audit-sampling',
    icon: 'MUE',
    name: 'Muestreo auditor',
    categoryId: 'audit',
    description: 'Selecciona muestras por riesgo, monto, proveedor, periodo o criterios configurables.',
    inputTypes: ['dataset', 'sqlDataset', 'auditResult'],
    outputType: 'dataset',
    capabilities: ['sampling', 'risk-based', 'amount', 'provider', 'period'],
    actions: [
      {
        id: 'create-risk-sample',
        icon: 'RSK',
        name: 'Crear muestra por riesgo',
        description: 'Generar una muestra priorizando montos altos, recurrencia, proveedores o anomalías.',
        inputTypes: ['dataset', 'sqlDataset', 'auditResult'],
        outputType: 'dataset',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'create-random-sample',
        icon: 'RND',
        name: 'Crear muestra aleatoria',
        description: 'Generar una muestra aleatoria documentada para revisión.',
        inputTypes: ['dataset', 'sqlDataset'],
        outputType: 'dataset',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'risk-matrix',
    icon: 'RSK',
    name: 'Matriz de riesgos',
    categoryId: 'audit',
    description: 'Clasifica resultados por impacto, probabilidad, prioridad y tipo de riesgo.',
    inputTypes: ['auditResult', 'dataset', 'document'],
    outputType: 'auditResult',
    capabilities: ['risk', 'impact', 'probability', 'priority', 'classification'],
    actions: [
      {
        id: 'classify-risk-matrix',
        icon: 'MAT',
        name: 'Clasificar matriz de riesgos',
        description: 'Clasificar hallazgos o resultados por impacto, probabilidad y prioridad.',
        inputTypes: ['auditResult', 'dataset', 'document'],
        outputType: 'auditResult',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'audit-working-papers',
    icon: 'CED',
    name: 'Cédulas de auditoría',
    categoryId: 'audit',
    description: 'Genera cédulas, papeles de trabajo y anexos con trazabilidad.',
    inputTypes: ['auditResult', 'dataset', 'document'],
    outputType: 'document',
    capabilities: ['working-papers', 'cedula', 'traceability', 'evidence', 'annex'],
    actions: [
      {
        id: 'generate-audit-cedula',
        icon: 'CED',
        name: 'Generar cédula de auditoría',
        description: 'Crear cédula con objetivo, procedimiento, resultado, evidencia y conclusión.',
        inputTypes: ['auditResult', 'dataset', 'document'],
        outputType: 'document',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'generate-traceability-annex',
        icon: 'TRZ',
        name: 'Generar anexo de trazabilidad',
        description: 'Crear anexo con archivo, tabla, fila, documento, página y evidencia relacionada.',
        inputTypes: ['auditResult', 'dataset', 'document'],
        outputType: 'document',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'word-editor',
    icon: 'DOCX',
    name: 'Word editable',
    categoryId: 'documents',
    description: 'Crea, edita y estructura documentos Word institucionales.',
    inputTypes: ['document', 'auditResult', 'report', 'unknown'],
    outputType: 'word',
    capabilities: ['word', 'docx', 'editable-document', 'template', 'institutional-format'],
    actions: [
      {
        id: 'create-editable-word-document',
        icon: 'NEW',
        name: 'Crear Word editable',
        description: 'Generar un documento Word editable desde resultados, hallazgos o una plantilla.',
        inputTypes: ['auditResult', 'document', 'report', 'unknown'],
        outputType: 'word',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'edit-word-template',
        icon: 'TPL',
        name: 'Editar plantilla Word',
        description: 'Preparar o modificar una plantilla institucional para informes, cédulas o anexos.',
        inputTypes: ['word', 'document', 'unknown'],
        outputType: 'word',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'insert-findings-into-word',
        icon: 'INS',
        name: 'Insertar hallazgos en Word',
        description: 'Insertar hallazgos, recomendaciones y evidencia en un documento Word editable.',
        inputTypes: ['auditResult', 'document'],
        outputType: 'word',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'document-review',
    icon: 'REV',
    name: 'Revisión documental',
    categoryId: 'documents',
    description: 'Revisa documentos Word/PDF, identifica soporte, inconsistencias y evidencia.',
    inputTypes: ['pdf', 'word', 'document', 'file'],
    outputType: 'document',
    capabilities: ['review', 'word', 'pdf', 'evidence', 'comments', 'support'],
    actions: [
      {
        id: 'review-document-support',
        icon: 'EVI',
        name: 'Revisar soporte documental',
        description: 'Revisar documentos para identificar soporte, anexos, firmas, fechas y evidencia clave.',
        inputTypes: ['pdf', 'word', 'document', 'file'],
        outputType: 'document',
        aiSuggested: true,
        requiresConfiguration: true,
      },
      {
        id: 'mark-document-evidence',
        icon: 'MRK',
        name: 'Marcar evidencia',
        description: 'Marcar fragmentos, páginas o secciones como evidencia relacionada con un hallazgo.',
        inputTypes: ['pdf', 'word', 'document'],
        outputType: 'document',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
  {
    id: 'excel-report-export',
    icon: 'XREP',
    name: 'Exportar Excel de resultados',
    categoryId: 'reports',
    description: 'Exporta resultados, diferencias, hallazgos y anexos en Excel.',
    inputTypes: ['auditResult', 'dataset'],
    outputType: 'report',
    capabilities: ['excel', 'export', 'annex', 'audit-results', 'tables'],
    actions: [
      {
        id: 'export-results-to-excel',
        icon: 'XLS',
        name: 'Exportar resultados a Excel',
        description: 'Generar Excel con resultados, diferencias, hallazgos y trazabilidad.',
        inputTypes: ['auditResult', 'dataset'],
        outputType: 'report',
        aiSuggested: true,
        requiresConfiguration: true,
      },
    ],
  },
]

export function getToolsByCategory(categoryId: string) {
  return toolCatalog.filter((tool) => tool.categoryId === categoryId)
}

export function getToolById(toolId: string) {
  return toolCatalog.find((tool) => tool.id === toolId)
}

export function getActionById(actionId: string) {
  for (const tool of toolCatalog) {
    const action = tool.actions.find((item) => item.id === actionId)

    if (action) {
      return {
        tool,
        action,
      }
    }
  }

  return null
}

export function getSuggestedActionsForOutput(outputType: NodeDataType) {
  return toolCatalog
    .flatMap((tool) =>
      tool.actions.map((action) => ({
        tool,
        action,
      })),
    )
    .filter(({ action }) => action.aiSuggested && action.inputTypes.includes(outputType))
}



