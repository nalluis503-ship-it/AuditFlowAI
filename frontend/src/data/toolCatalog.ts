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

