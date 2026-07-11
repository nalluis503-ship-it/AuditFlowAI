import type { NodeDataType } from './toolCatalog'

export type NodeEditorField =
  | {
      id: string
      label: string
      type: 'file'
      helper: string
      accept?: string
      multiple?: boolean
    }
  | {
      id: string
      label: string
      type: 'select'
      helper: string
      options: string[]
    }
  | {
      id: string
      label: string
      type: 'text'
      helper: string
      placeholder: string
    }
  | {
      id: string
      label: string
      type: 'checkbox-group'
      helper: string
      options: string[]
    }

export type NodeActionExperience = {
  id: string
  title: string
  actionDescription: string
  configurationTitle: string
  expectedResult: string
  resultEmptyState: string
  fields: NodeEditorField[]
  outputType?: NodeDataType
}

type ResolveExperienceInput = {
  title: string
  description: string
  toolId?: string
  actionId?: string
  outputType?: NodeDataType
}

const experiences: NodeActionExperience[] = [
  {
    id: 'file-upload',
    title: 'Carga inteligente de archivos',
    actionDescription:
      'Permite cargar uno o varios archivos como fuente de trabajo. El nodo conserva identidad, nombre, tipo y estado de cada archivo para mantener trazabilidad.',
    configurationTitle: 'Archivos de entrada',
    expectedResult:
      'Archivos disponibles para vista previa, perfilado de columnas, extracción documental o análisis posterior.',
    resultEmptyState:
      'Todavía no hay archivos cargados. Selecciona uno o varios archivos para iniciar el contexto del flujo.',
    fields: [
      {
        id: 'files',
        label: 'Seleccionar archivos',
        type: 'file',
        helper: 'Puedes cargar Excel, CSV o PDF. Cada archivo quedará rastreable dentro del nodo.',
        accept: '.xlsx,.xls,.csv,.pdf',
        multiple: true,
      },
    ],
    outputType: 'file',
  },
  {
    id: 'database-connect',
    title: 'Conexión a base de datos',
    actionDescription:
      'Crea una conexión hacia una base de datos para explorar tablas, perfilar columnas, ejecutar consultas y preparar cruces de información.',
    configurationTitle: 'Parámetros de conexión',
    expectedResult:
      'Conexión disponible para listar tablas, consultar registros y construir análisis sobre datos estructurados.',
    resultEmptyState:
      'Sin conexión ejecutada. Configura los parámetros y prueba la conexión para detectar tablas disponibles.',
    fields: [
      {
        id: 'engine',
        label: 'Motor de base de datos',
        type: 'select',
        helper: 'Selecciona el tipo de motor que se desea analizar.',
        options: ['MySQL', 'PostgreSQL', 'SQL Server', 'Oracle', 'SQLite'],
      },
      {
        id: 'host',
        label: 'Servidor / Host',
        type: 'text',
        helper: 'Dirección del servidor o alias de conexión.',
        placeholder: '192.168.1.10 o servidor.local',
      },
      {
        id: 'database',
        label: 'Base de datos',
        type: 'text',
        helper: 'Nombre de la base a consultar.',
        placeholder: 'auditoria_pagos',
      },
      {
        id: 'user',
        label: 'Usuario',
        type: 'text',
        helper: 'Usuario con permisos de lectura.',
        placeholder: 'usuario_lectura',
      },
    ],
    outputType: 'sqlDataset',
  },
  {
    id: 'data-profile',
    title: 'Perfilado inteligente de datos',
    actionDescription:
      'Analiza la estructura de una fuente de datos para detectar columnas, tipos de dato, campos clave, valores vacíos, duplicados y posibles riesgos.',
    configurationTitle: 'Opciones de perfilado',
    expectedResult:
      'Diccionario de datos, columnas clave detectadas y recomendaciones de análisis según el contenido real.',
    resultEmptyState:
      'Todavía no se ha ejecutado el perfilado. Selecciona una fuente y las opciones de detección.',
    fields: [
      {
        id: 'profile-options',
        label: 'Detecciones a realizar',
        type: 'checkbox-group',
        helper: 'Activa las capacidades que debe ejecutar el perfilador.',
        options: [
          'Detectar tipos de dato',
          'Detectar columnas monetarias',
          'Detectar fechas',
          'Detectar campos de proveedor/contrato',
          'Detectar vacíos y duplicados',
        ],
      },
    ],
    outputType: 'dataset',
  },
  {
    id: 'data-join',
    title: 'Cruce inteligente de fuentes',
    actionDescription:
      'Relaciona dos o más fuentes de datos para detectar coincidencias, diferencias, registros sin relación y posibles inconsistencias.',
    configurationTitle: 'Fuentes y campos de relación',
    expectedResult:
      'Tabla de coincidencias, diferencias, registros no encontrados y trazabilidad por fuente.',
    resultEmptyState:
      'Sin cruce ejecutado. Selecciona las fuentes y define los campos de relación.',
    fields: [
      {
        id: 'join-type',
        label: 'Tipo de cruce',
        type: 'select',
        helper: 'Define cómo se relacionarán las fuentes.',
        options: ['Coincidencias exactas', 'Diferencias', 'No encontrados', 'Cruce flexible (pendiente de ejecutor)'],
      },
      {
        id: 'join-fields',
        label: 'Campos de relación',
        type: 'text',
        helper: 'Indica campos como contrato, proveedor, factura, RFC o folio.',
        placeholder: 'contrato, proveedor, factura',
      },
    ],
    outputType: 'auditResult',
  },
  {
    id: 'audit-validation',
    title: 'Validación inteligente de auditoría',
    actionDescription:
      'Aplica reglas de auditoría sobre datos perfilados o cruzados para detectar anomalías, pagos duplicados, diferencias de monto o faltantes de soporte.',
    configurationTitle: 'Reglas de validación',
    expectedResult:
      'Resultados clasificados por tipo de observación, riesgo, fuente y evidencia.',
    resultEmptyState:
      'Sin validación ejecutada. Define reglas, fuentes y criterios de evaluación.',
    fields: [
      {
        id: 'validation-rules',
        label: 'Reglas a aplicar',
        type: 'checkbox-group',
        helper: 'Selecciona las pruebas que debe ejecutar el nodo.',
        options: [
          'Buscar duplicados',
          'Comparar montos',
          'Validar fechas',
          'Detectar pagos sin soporte',
          'Detectar registros fuera de contrato',
        ],
      },
    ],
    outputType: 'auditResult',
  },
  {
    id: 'findings',
    title: 'Generación de hallazgos',
    actionDescription:
      'Convierte resultados técnicos en hallazgos preliminares con condición, criterio, causa, efecto, evidencia y recomendación.',
    configurationTitle: 'Estructura del hallazgo',
    expectedResult:
      'Hallazgos preliminares listos para revisión del auditor, con trazabilidad a archivo, tabla, fila o regla aplicada.',
    resultEmptyState:
      'Aún no hay hallazgos generados. Selecciona el resultado fuente y el formato de redacción.',
    fields: [
      {
        id: 'finding-format',
        label: 'Formato de hallazgo',
        type: 'select',
        helper: 'Selecciona la estructura de salida.',
        options: ['Condición-Criterio-Causa-Efecto', 'Observación técnica', 'Cédula de hallazgos', 'Resumen ejecutivo'],
      },
    ],
    outputType: 'document',
  },
  {
    id: 'report',
    title: 'Generación de reporte',
    actionDescription:
      'Genera un documento de salida con resumen ejecutivo, resultados, hallazgos, anexos y evidencia trazable.',
    configurationTitle: 'Formato del reporte',
    expectedResult:
      'Reporte editable o exportable con resultados organizados para revisión, entrega o integración documental.',
    resultEmptyState:
      'Sin reporte generado. Selecciona plantilla, secciones y formato de salida.',
    fields: [
      {
        id: 'report-format',
        label: 'Formato de salida',
        type: 'select',
        helper: 'Define cómo se generará el reporte.',
        options: ['Word editable', 'PDF', 'Excel con anexos', 'Resumen ejecutivo'],
      },
      {
        id: 'report-sections',
        label: 'Secciones',
        type: 'checkbox-group',
        helper: 'Selecciona las secciones que debe incluir.',
        options: ['Resumen ejecutivo', 'Hallazgos', 'Evidencia', 'Trazabilidad', 'Recomendaciones'],
      },
    ],
    outputType: 'report',
  },
  {
    id: 'sql-query',
    title: 'Consulta SQL de solo lectura',
    actionDescription:
      'Permite preparar una consulta SELECT para analizar información sin modificar la base de datos origen. Ideal para revisión segura de tablas, vistas y registros.',
    configurationTitle: 'Consulta y alcance',
    expectedResult:
      'Dataset consultado con trazabilidad hacia base, tabla, consulta ejecutada y campos utilizados.',
    resultEmptyState:
      'Todavía no hay consulta ejecutada. Define una consulta de solo lectura o selecciona tablas detectadas.',
    fields: [
      {
        id: 'query-purpose',
        label: 'Objetivo de la consulta',
        type: 'text',
        helper: 'Describe qué se busca revisar con la consulta.',
        placeholder: 'Ejemplo: pagos por proveedor durante el ejercicio 2025',
      },
      {
        id: 'readonly-query',
        label: 'Consulta SQL',
        type: 'text',
        helper: 'Usar únicamente consultas SELECT. No se deben ejecutar cambios sobre la base.',
        placeholder: 'SELECT proveedor, monto, fecha FROM pagos WHERE ejercicio = 2025',
      },
    ],
    outputType: 'dataset',
  },
  {
    id: 'word-editor',
    title: 'Word editable institucional',
    actionDescription:
      'Genera o prepara documentos Word editables para informes, cédulas, anexos o integración de hallazgos con formato institucional.',
    configurationTitle: 'Documento Word',
    expectedResult:
      'Documento Word editable con estructura base, secciones configuradas y contenido listo para revisión del auditor.',
    resultEmptyState:
      'Aún no se ha generado el documento Word. Selecciona tipo de documento, plantilla y contenido a insertar.',
    fields: [
      {
        id: 'word-document-type',
        label: 'Tipo de documento',
        type: 'select',
        helper: 'Define el tipo de salida editable.',
        options: ['Informe ejecutivo', 'Cédula de auditoría', 'Anexo de evidencia', 'Oficio técnico', 'Reporte de hallazgos'],
      },
      {
        id: 'word-template',
        label: 'Plantilla',
        type: 'select',
        helper: 'Selecciona una plantilla base para el documento.',
        options: ['Institucional', 'Informe técnico', 'Cédula', 'Anexo', 'Sin plantilla'],
      },
      {
        id: 'word-sections',
        label: 'Secciones a incluir',
        type: 'checkbox-group',
        helper: 'Activa las secciones que tendrá el Word editable.',
        options: ['Resumen ejecutivo', 'Hallazgos', 'Evidencia', 'Recomendaciones', 'Trazabilidad', 'Firmas'],
      },
    ],
    outputType: 'word',
  },
  {
    id: 'document-review',
    title: 'Revisión documental y evidencia',
    actionDescription:
      'Revisa documentos PDF o Word para identificar soporte, anexos, firmas, fechas, evidencia y posibles inconsistencias relacionadas con hallazgos.',
    configurationTitle: 'Criterios de revisión documental',
    expectedResult:
      'Documento revisado con evidencia marcada, secciones relevantes identificadas y trazabilidad para hallazgos.',
    resultEmptyState:
      'No hay evidencia marcada todavía. Selecciona documentos y criterios de revisión.',
    fields: [
      {
        id: 'document-files',
        label: 'Seleccionar documentos',
        type: 'file',
        helper: 'Puedes cargar PDF, Word o documentos soporte para revisión.',
        accept: '.pdf,.doc,.docx',
        multiple: true,
      },
      {
        id: 'review-criteria',
        label: 'Criterios a revisar',
        type: 'checkbox-group',
        helper: 'Selecciona qué debe identificar el nodo.',
        options: ['Firmas', 'Fechas', 'Anexos', 'Importes', 'Contratos', 'Soporte de pago', 'Inconsistencias'],
      },
    ],
    outputType: 'document',
  },
  {
    id: 'risk-matrix',
    title: 'Matriz de riesgos',
    actionDescription:
      'Clasifica resultados, hallazgos o anomalías por impacto, probabilidad, prioridad y tipo de riesgo.',
    configurationTitle: 'Criterios de riesgo',
    expectedResult:
      'Matriz de riesgos con clasificación por prioridad, impacto, probabilidad y justificación.',
    resultEmptyState:
      'Aún no hay riesgos clasificados. Selecciona criterios y fuente de resultados.',
    fields: [
      {
        id: 'risk-method',
        label: 'Método de clasificación',
        type: 'select',
        helper: 'Define cómo se calculará la prioridad del riesgo.',
        options: ['Impacto x Probabilidad', 'Monto observado', 'Frecuencia', 'Criterio institucional', 'Mixto'],
      },
      {
        id: 'risk-dimensions',
        label: 'Dimensiones',
        type: 'checkbox-group',
        helper: 'Selecciona los aspectos que se considerarán.',
        options: ['Impacto económico', 'Impacto legal', 'Impacto operativo', 'Reincidencia', 'Probabilidad', 'Urgencia'],
      },
    ],
    outputType: 'auditResult',
  },
  {
    id: 'audit-cedula',
    title: 'Cédula de auditoría',
    actionDescription:
      'Construye papeles de trabajo, cédulas y anexos con objetivo, procedimiento, resultado, evidencia, conclusión y trazabilidad.',
    configurationTitle: 'Estructura de la cédula',
    expectedResult:
      'Cédula de auditoría lista para revisión, con evidencia vinculada y trazabilidad del análisis.',
    resultEmptyState:
      'Aún no se ha generado la cédula. Selecciona estructura, evidencia y resultado fuente.',
    fields: [
      {
        id: 'cedula-type',
        label: 'Tipo de cédula',
        type: 'select',
        helper: 'Selecciona el tipo de papel de trabajo.',
        options: ['Cédula analítica', 'Cédula sumaria', 'Cédula de hallazgo', 'Anexo de trazabilidad', 'Cédula documental'],
      },
      {
        id: 'cedula-sections',
        label: 'Secciones',
        type: 'checkbox-group',
        helper: 'Selecciona las secciones a integrar.',
        options: ['Objetivo', 'Procedimiento aplicado', 'Resultado', 'Evidencia', 'Conclusión', 'Recomendación'],
      },
    ],
    outputType: 'document',
  },
  {
    id: 'excel-export',
    title: 'Exportación de resultados a Excel',
    actionDescription:
      'Genera un archivo Excel con resultados, diferencias, hallazgos, anexos y trazabilidad para revisión o entrega.',
    configurationTitle: 'Contenido del Excel',
    expectedResult:
      'Excel de resultados con hojas separadas para hallazgos, diferencias, evidencia y trazabilidad.',
    resultEmptyState:
      'No se ha generado el Excel. Selecciona qué resultados o anexos deben incluirse.',
    fields: [
      {
        id: 'excel-export-sections',
        label: 'Hojas a generar',
        type: 'checkbox-group',
        helper: 'Selecciona las hojas que tendrá el Excel de salida.',
        options: ['Resumen', 'Diferencias', 'Hallazgos', 'Evidencia', 'Trazabilidad', 'Datos fuente'],
      },
      {
        id: 'excel-export-format',
        label: 'Formato',
        type: 'select',
        helper: 'Define el estilo del archivo de salida.',
        options: ['Anexo institucional', 'Tabla simple', 'Matriz de observaciones', 'Base depurada'],
      },
    ],
    outputType: 'report',
  },
  {
    id: 'data-cleaning',
    title: 'Limpieza y normalización de datos',
    actionDescription:
      'Prepara datos para análisis corrigiendo columnas, espacios, formatos, nulos, fechas, importes y campos clave.',
    configurationTitle: 'Reglas de limpieza',
    expectedResult:
      'Dataset normalizado y listo para perfilado, cruce o validación.',
    resultEmptyState:
      'No hay limpieza ejecutada. Selecciona reglas de normalización.',
    fields: [
      {
        id: 'cleaning-rules',
        label: 'Reglas a aplicar',
        type: 'checkbox-group',
        helper: 'Selecciona los ajustes que se aplicarán.',
        options: ['Eliminar espacios', 'Normalizar columnas', 'Convertir fechas', 'Convertir importes', 'Depurar nulos', 'Quitar duplicados simples'],
      },
    ],
    outputType: 'dataset',
  },
  {
    id: 'audit-sampling',
    title: 'Muestreo auditor',
    actionDescription:
      'Selecciona muestras por riesgo, monto, proveedor, periodo, recurrencia o criterios configurables.',
    configurationTitle: 'Parámetros de muestreo',
    expectedResult:
      'Muestra documentada con criterio de selección y trazabilidad hacia la fuente.',
    resultEmptyState:
      'Aún no hay muestra generada. Define método, tamaño y criterios.',
    fields: [
      {
        id: 'sampling-method',
        label: 'Método de muestreo',
        type: 'select',
        helper: 'Define cómo se seleccionarán los registros.',
        options: ['Aleatorio', 'Por riesgo', 'Por monto alto', 'Por proveedor', 'Por periodo', 'Mixto'],
      },
      {
        id: 'sample-size',
        label: 'Tamaño de muestra',
        type: 'text',
        helper: 'Indica porcentaje o número de registros.',
        placeholder: 'Ejemplo: 10% o 100 registros',
      },
    ],
    outputType: 'dataset',
  },
]

const exactExperienceByActionId: Record<string, string> = {
  'upload-excel-file': 'file-upload',
  'upload-pdf-document': 'file-upload',
  'upload-csv-file': 'file-upload',
  'connect-sql-database': 'database-connect',
  'inspect-sql-schema': 'data-profile',
  'run-readonly-sql-query': 'sql-query',
  'preview-excel-sheets': 'data-profile',
  'profile-dataset': 'data-profile',
  'detect-csv-structure': 'data-profile',
  'clean-dataset-values': 'data-cleaning',
  'standardize-column-names': 'data-cleaning',
  'join-by-key': 'data-join',
  'find-unmatched-records': 'data-join',
  'find-exact-duplicates': 'audit-validation',
  'find-rfc-duplicates': 'audit-validation',
  'find-payment-duplicates': 'audit-validation',
  'validate-payments-against-contracts': 'audit-validation',
  'validate-payment-evidence': 'audit-validation',
  'create-finding': 'findings',
  'link-evidence': 'findings',
  'review-document-support': 'document-review',
  'mark-document-evidence': 'document-review',
  'classify-risk-matrix': 'risk-matrix',
  'generate-audit-cedula': 'audit-cedula',
  'generate-traceability-annex': 'audit-cedula',
  'create-editable-word-document': 'word-editor',
  'edit-word-template': 'word-editor',
  'insert-findings-into-word': 'word-editor',
  'generate-executive-summary': 'report',
  'export-report-pdf': 'report',
  'export-results-to-excel': 'excel-export',
  'create-risk-sample': 'audit-sampling',
  'create-random-sample': 'audit-sampling',
}
function textIncludesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

export function getNodeActionExperience(input: ResolveExperienceInput) {
  const exactExperienceId = input.actionId ? exactExperienceByActionId[input.actionId] : undefined
  const exactExperience = exactExperienceId
    ? experiences.find((experience) => experience.id === exactExperienceId)
    : undefined

  if (exactExperience) return exactExperience

  const searchable = `${input.title} ${input.description} ${input.toolId ?? ''} ${input.actionId ?? ''} ${input.outputType ?? ''}`.toLowerCase()

  if (textIncludesAny(searchable, ['upload', 'subir', 'cargar', 'archivo', 'excel', 'pdf', 'csv'])) {
    return experiences.find((experience) => experience.id === 'file-upload')!
  }

  if (textIncludesAny(searchable, ['mysql', 'sql', 'database', 'base de datos', 'postgres', 'query', 'consulta'])) {
    return experiences.find((experience) => experience.id === 'database-connect')!
  }

  if (textIncludesAny(searchable, ['perfil', 'profile', 'explorar', 'vista previa', 'viewer', 'visualizar'])) {
    return experiences.find((experience) => experience.id === 'data-profile')!
  }

  if (textIncludesAny(searchable, ['join', 'cruzar', 'relacionar', 'combinar', 'match'])) {
    return experiences.find((experience) => experience.id === 'data-join')!
  }

  if (textIncludesAny(searchable, ['validar', 'validación', 'payment', 'pago', 'duplicado', 'anomalia', 'anomalía'])) {
    return experiences.find((experience) => experience.id === 'audit-validation')!
  }

  if (textIncludesAny(searchable, ['hallazgo', 'finding', 'observación', 'observacion'])) {
    return experiences.find((experience) => experience.id === 'findings')!
  }

  if (textIncludesAny(searchable, ['reporte', 'report', 'informe', 'documento'])) {
    return experiences.find((experience) => experience.id === 'report')!
  }


  return {
    id: 'generic',
    title: input.title,
    actionDescription:
      'Acción configurable dentro del workflow. Este nodo puede recibir entradas, producir una salida y continuar el flujo con herramientas compatibles.',
    configurationTitle: 'Configuración del nodo',
    expectedResult:
      'Salida disponible para continuar con el siguiente paso del workflow.',
    resultEmptyState:
      'Sin resultados todavía. Configura o ejecuta el nodo para producir una salida.',
    fields: [],
    outputType: input.outputType,
  } satisfies NodeActionExperience
}
