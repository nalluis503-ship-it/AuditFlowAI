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
  aiOpeningMessage: string
  aiSuggestions: string[]
  nextStepLabel: string
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
    aiOpeningMessage:
      'Cuando cargues archivos, puedo detectar si contienen pagos, contratos, proveedores, fechas, importes o información útil para auditoría.',
    aiSuggestions: [
      'Perfilar columnas y hojas detectadas',
      'Identificar archivos de pagos, contratos o soporte',
      'Sugerir cruces entre archivos',
      'Preparar una validación de pagos contra contratos',
    ],
    nextStepLabel: 'Sugerir perfilado o análisis',
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
    aiOpeningMessage:
      'Cuando la conexión esté lista, puedo ayudarte a detectar tablas relevantes, relaciones posibles y pruebas de auditoría aplicables.',
    aiSuggestions: [
      'Listar tablas relevantes',
      'Detectar tablas de pagos, contratos o proveedores',
      'Perfilar columnas sensibles',
      'Sugerir consultas SQL de auditoría',
    ],
    nextStepLabel: 'Sugerir exploración de tablas',
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
    aiOpeningMessage:
      'Con el perfilado puedo entender qué contiene la fuente y sugerir análisis reales sin inventar contexto.',
    aiSuggestions: [
      'Detectar si la fuente contiene pagos',
      'Sugerir campos de relación',
      'Recomendar validaciones de auditoría',
      'Preparar cruce contra otra fuente',
    ],
    nextStepLabel: 'Sugerir análisis por contenido',
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
        options: ['Coincidencias exactas', 'Diferencias', 'No encontrados', 'Cruce flexible con IA'],
      },
      {
        id: 'join-fields',
        label: 'Campos de relación',
        type: 'text',
        helper: 'Indica campos como contrato, proveedor, factura, RFC o folio.',
        placeholder: 'contrato, proveedor, factura',
      },
    ],
    aiOpeningMessage:
      'Puedo ayudarte a elegir campos de relación y explicar diferencias encontradas entre fuentes.',
    aiSuggestions: [
      'Sugerir campos de cruce',
      'Detectar registros sin coincidencia',
      'Agrupar diferencias por proveedor',
      'Preparar hallazgos con evidencia',
    ],
    nextStepLabel: 'Sugerir validación o hallazgos',
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
    aiOpeningMessage:
      'Puedo interpretar resultados, priorizar riesgos y convertir anomalías en observaciones auditables.',
    aiSuggestions: [
      'Explicar anomalías detectadas',
      'Clasificar hallazgos por riesgo',
      'Sugerir evidencia necesaria',
      'Crear nodo de hallazgos preliminares',
    ],
    nextStepLabel: 'Sugerir hallazgos preliminares',
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
    aiOpeningMessage:
      'Puedo ayudarte a redactar hallazgos claros, sustentados y con lenguaje institucional.',
    aiSuggestions: [
      'Redactar hallazgos preliminares',
      'Separar hallazgos por nivel de riesgo',
      'Generar recomendaciones',
      'Preparar anexo de trazabilidad',
    ],
    nextStepLabel: 'Sugerir reporte o anexo',
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
    aiOpeningMessage:
      'Puedo ayudarte a estructurar el reporte, resumir resultados y generar anexos de evidencia.',
    aiSuggestions: [
      'Generar resumen ejecutivo',
      'Ordenar hallazgos por riesgo',
      'Crear anexo de trazabilidad',
      'Preparar versión para revisión',
    ],
    nextStepLabel: 'Preparar reporte',
    outputType: 'report',
  },
  {
    id: 'ai',
    title: 'IA auditora',
    actionDescription:
      'Permite consultar a la IA para orientar el análisis, explicar resultados, sugerir flujos o asistir al auditor dentro del proceso.',
    configurationTitle: 'Consulta o instrucción',
    expectedResult:
      'Recomendación, explicación, flujo sugerido o propuesta de siguiente acción visible dentro del workflow.',
    resultEmptyState:
      'Escribe una pregunta o instrucción para que la IA proponga el siguiente paso.',
    fields: [
      {
        id: 'prompt',
        label: 'Pregunta para IA',
        type: 'text',
        helper: 'Describe qué quieres analizar, revisar o construir.',
        placeholder: 'Quiero revisar pagos contra contratos...',
      },
    ],
    aiOpeningMessage:
      'Puedo ayudarte a construir el flujo, entender resultados o recomendar herramientas sin sustituir tu control.',
    aiSuggestions: [
      'Recomendar nodo inicial',
      'Crear flujo sugerido',
      'Explicar resultados',
      'Enviar necesidad al backlog inteligente',
    ],
    nextStepLabel: 'Generar recomendación',
    outputType: 'unknown',
  },
]

function textIncludesAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term))
}

export function getNodeActionExperience(input: ResolveExperienceInput) {
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

  if (textIncludesAny(searchable, ['ia', 'ai', 'auditor'])) {
    return experiences.find((experience) => experience.id === 'ai')!
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
    aiOpeningMessage:
      'Puedo ayudarte a entender qué necesita este nodo y sugerir el siguiente paso compatible.',
    aiSuggestions: [
      'Revisar configuración',
      'Sugerir siguiente nodo',
      'Explicar salida esperada',
      'Enviar necesidad al backlog inteligente',
    ],
    nextStepLabel: 'Sugerir siguiente nodo',
    outputType: input.outputType,
  } satisfies NodeActionExperience
}
