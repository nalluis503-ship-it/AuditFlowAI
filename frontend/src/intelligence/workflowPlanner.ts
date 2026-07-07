import type { SemanticAuditIntent } from './semanticAuditIntentEngine'
import type { AuditRequestProfile } from './auditRequestParser'

export type WorkflowPlanStep = {
  label: string
  toolKeywords: string[]
  actionKeywords: string[]
  actionId?: string
}

export type WorkflowPlan = {
  title: string
  summary: string
  recommendedNode: string
  steps: string[]
  toolSteps: WorkflowPlanStep[]
}

function step(
  label: string,
  actionId: string,
  toolKeywords: string[],
  actionKeywords: string[],
): WorkflowPlanStep {
  return {
    label,
    actionId,
    toolKeywords,
    actionKeywords,
  }
}

function createSqlMultiSourcePlan(): WorkflowPlan {
  return {
    title: 'Flujo para analizar y comparar bases SQL',
    summary:
      'Se detectaron varias fuentes SQL. Se recomienda conectar cada base, explorar estructura, perfilar datos, comparar y preparar hallazgos.',
    recommendedNode: 'Conectar base SQL',
    steps: [
      'Conectar base SQL 1',
      'Conectar base SQL 2',
      'Explorar estructura SQL',
      'Perfilar datos',
      'Cruzar por campo clave',
      'Crear hallazgo',
    ],
    toolSteps: [
      step(
        'Conectar base SQL 1',
        'connect-sql-database',
        ['sql-connector', 'sql', 'base de datos'],
        ['conectar base sql', 'conectar'],
      ),
      step(
        'Conectar base SQL 2',
        'connect-sql-database',
        ['sql-connector', 'sql', 'base de datos'],
        ['conectar base sql', 'conectar'],
      ),
      step(
        'Explorar estructura SQL',
        'inspect-sql-schema',
        ['sql-connector', 'sql', 'estructura'],
        ['explorar estructura sql', 'estructura'],
      ),
      step(
        'Perfilar datos',
        'profile-dataset',
        ['data-viewer', 'perfil', 'datos'],
        ['perfilar datos', 'perfil'],
      ),
      step(
        'Cruzar por campo clave',
        'join-by-key',
        ['join-datasets', 'cruzar bases'],
        ['cruzar por campo clave', 'cruzar'],
      ),
      step(
        'Crear hallazgo',
        'create-finding',
        ['audit-finding', 'hallazgo'],
        ['crear hallazgo', 'hallazgo'],
      ),
    ],
  }
}

function createSqlSingleSourcePlan(): WorkflowPlan {
  return {
    title: 'Flujo para analizar base SQL',
    summary:
      'Se detectó una fuente SQL. Se recomienda conectar, explorar tablas, perfilar datos, ejecutar consulta de lectura y preparar hallazgos.',
    recommendedNode: 'Conectar base SQL',
    steps: [
      'Conectar base SQL',
      'Explorar estructura SQL',
      'Ejecutar consulta de solo lectura',
      'Perfilar datos',
      'Crear hallazgo',
    ],
    toolSteps: [
      step(
        'Conectar base SQL',
        'connect-sql-database',
        ['sql-connector', 'sql', 'base de datos'],
        ['conectar base sql', 'conectar'],
      ),
      step(
        'Explorar estructura SQL',
        'inspect-sql-schema',
        ['sql-connector', 'sql', 'estructura'],
        ['explorar estructura sql', 'estructura'],
      ),
      step(
        'Ejecutar consulta de solo lectura',
        'run-readonly-sql-query',
        ['sql-connector', 'consulta', 'query'],
        ['ejecutar consulta', 'consulta'],
      ),
      step(
        'Perfilar datos',
        'profile-dataset',
        ['data-viewer', 'perfil', 'datos'],
        ['perfilar datos', 'perfil'],
      ),
      step(
        'Crear hallazgo',
        'create-finding',
        ['audit-finding', 'hallazgo'],
        ['crear hallazgo', 'hallazgo'],
      ),
    ],
  }
}

function createWordReportPlan(): WorkflowPlan {
  return {
    title: 'Flujo para generar informe Word editable',
    summary:
      'Se detectó una salida Word editable. Se recomienda preparar resumen, crear documento editable e insertar hallazgos.',
    recommendedNode: 'Crear Word editable',
    steps: [
      'Generar resumen ejecutivo',
      'Crear Word editable',
      'Insertar hallazgos en Word',
    ],
    toolSteps: [
      step(
        'Generar resumen ejecutivo',
        'generate-executive-summary',
        ['report-generator', 'reporte'],
        ['resumen ejecutivo', 'reporte'],
      ),
      step(
        'Crear Word editable',
        'create-editable-word-document',
        ['word-editor', 'word', 'docx'],
        ['crear word editable', 'word'],
      ),
      step(
        'Insertar hallazgos en Word',
        'insert-findings-into-word',
        ['word-editor', 'hallazgos', 'word'],
        ['insertar hallazgos en word', 'hallazgos'],
      ),
    ],
  }
}

function createCedulaPlan(): WorkflowPlan {
  return {
    title: 'Flujo para generar cédula de auditoría',
    summary:
      'Se detectó una solicitud de cédula o papel de trabajo. Se recomienda crear hallazgo, generar cédula y anexar trazabilidad.',
    recommendedNode: 'Generar cédula de auditoría',
    steps: [
      'Crear hallazgo',
      'Generar cédula de auditoría',
      'Generar anexo de trazabilidad',
    ],
    toolSteps: [
      step(
        'Crear hallazgo',
        'create-finding',
        ['audit-finding', 'hallazgo'],
        ['crear hallazgo', 'hallazgo'],
      ),
      step(
        'Generar cédula de auditoría',
        'generate-audit-cedula',
        ['audit-working-papers', 'cedula'],
        ['generar cedula de auditoria', 'cedula'],
      ),
      step(
        'Generar anexo de trazabilidad',
        'generate-traceability-annex',
        ['audit-working-papers', 'trazabilidad'],
        ['generar anexo de trazabilidad', 'trazabilidad'],
      ),
    ],
  }
}

function createRiskMatrixPlan(): WorkflowPlan {
  return {
    title: 'Flujo para matriz de riesgos',
    summary:
      'Se detectó una solicitud de riesgos. Se recomienda clasificar resultados, crear matriz y preparar cédula o anexo.',
    recommendedNode: 'Clasificar matriz de riesgos',
    steps: [
      'Clasificar matriz de riesgos',
      'Crear hallazgo',
      'Generar cédula de auditoría',
    ],
    toolSteps: [
      step(
        'Clasificar matriz de riesgos',
        'classify-risk-matrix',
        ['risk-matrix', 'riesgo'],
        ['clasificar matriz de riesgos', 'riesgo'],
      ),
      step(
        'Crear hallazgo',
        'create-finding',
        ['audit-finding', 'hallazgo'],
        ['crear hallazgo', 'hallazgo'],
      ),
      step(
        'Generar cédula de auditoría',
        'generate-audit-cedula',
        ['audit-working-papers', 'cedula'],
        ['generar cedula de auditoria', 'cedula'],
      ),
    ],
  }
}

function createExcelExportPlan(): WorkflowPlan {
  return {
    title: 'Flujo para exportar resultados a Excel',
    summary:
      'Se detectó una salida de resultados en Excel. Se recomienda preparar resultados y exportarlos con trazabilidad.',
    recommendedNode: 'Exportar resultados a Excel',
    steps: [
      'Crear hallazgo',
      'Exportar resultados a Excel',
    ],
    toolSteps: [
      step(
        'Crear hallazgo',
        'create-finding',
        ['audit-finding', 'hallazgo'],
        ['crear hallazgo', 'hallazgo'],
      ),
      step(
        'Exportar resultados a Excel',
        'export-results-to-excel',
        ['excel-report-export', 'excel', 'resultados'],
        ['exportar resultados a excel', 'excel'],
      ),
    ],
  }
}

function createDocumentReviewPlan(profile?: AuditRequestProfile): WorkflowPlan {
  const reviewsPdf = profile?.sourceTypes.includes('pdf') ?? false
  const reviewsWordOrGenericDocument =
    profile?.sourceTypes.some((sourceType) =>
      sourceType === 'word' || sourceType === 'document'
    ) ?? false

  if (reviewsWordOrGenericDocument && !reviewsPdf) {
    return {
      title: 'Flujo para revisión documental',
      summary:
        'Se detectó revisión de documentos. Se recomienda revisar soporte documental, marcar evidencia y preparar hallazgos.',
      recommendedNode: 'Revisar soporte documental',
      steps: [
        'Revisar soporte documental',
        'Marcar evidencia',
        'Crear hallazgo',
      ],
      toolSteps: [
        step(
          'Revisar soporte documental',
          'review-document-support',
          ['document-review', 'documento', 'word', 'evidencia'],
          ['revisar soporte documental', 'soporte'],
        ),
        step(
          'Marcar evidencia',
          'mark-document-evidence',
          ['document-review', 'evidencia'],
          ['marcar evidencia', 'evidencia'],
        ),
        step(
          'Crear hallazgo',
          'create-finding',
          ['audit-finding', 'hallazgo'],
          ['crear hallazgo', 'hallazgo'],
        ),
      ],
    }
  }

  return {
    title: 'Flujo para revisión documental PDF',
    summary:
      'Se recomienda cargar documentos PDF, visualizar evidencia, extraer texto y preparar hallazgos.',
    recommendedNode: 'Visualizar PDF',
    steps: [
      'Cargar documentos PDF',
      'Visualizar PDF',
      'Extraer texto',
      'Crear hallazgo',
    ],
    toolSteps: [
      step(
        'Cargar documentos PDF',
        'upload-pdf-document',
        ['pdf-tools', 'pdf', 'documento', 'evidencia'],
        ['pdf', 'documento', 'cargar documentos', 'evidencia'],
      ),
      step(
        'Visualizar PDF',
        'view-pdf',
        ['pdf-tools', 'pdf'],
        ['visualizar pdf', 'visualizar'],
      ),
      step(
        'Extraer texto',
        'extract-pdf-text',
        ['pdf-tools', 'pdf'],
        ['extraer texto', 'texto'],
      ),
      step(
        'Crear hallazgo',
        'create-finding',
        ['audit-finding', 'hallazgo'],
        ['crear hallazgo', 'hallazgo'],
      ),
    ],
  }
}

export function planWorkflowFromIntent(
  intent: SemanticAuditIntent,
  requestProfile?: AuditRequestProfile,
): WorkflowPlan {
  if (requestProfile?.needsSql && requestProfile.sourceCount >= 2) {
    return createSqlMultiSourcePlan()
  }

  if (requestProfile?.needsSql) {
    return createSqlSingleSourcePlan()
  }

  if (requestProfile?.needsRiskMatrix) {
    return createRiskMatrixPlan()
  }

  if (requestProfile?.needsCedula) {
    return createCedulaPlan()
  }

  if (requestProfile?.needsWord) {
    return createWordReportPlan()
  }

  if (requestProfile?.needsExcelExport) {
    return createExcelExportPlan()
  }

  if (intent.type === 'payment-contract-validation') {
    if (intent.subtype === 'duplicate-payment') {
      return {
        title: 'Flujo para detectar pagos duplicados',
        summary:
          'Se recomienda cargar la base, perfilar campos clave, buscar duplicados y preparar hallazgos.',
        recommendedNode: 'Buscar duplicados',
        steps: [
          'Cargar archivo Excel',
          'Perfilar columnas',
          'Buscar pagos duplicados',
          'Crear hallazgo',
        ],
        toolSteps: [
          step(
            'Cargar archivo Excel',
            'upload-excel-file',
            ['upload', 'subir', 'excel', 'archivo'],
            ['subir', 'cargar', 'excel'],
          ),
          step(
            'Perfilar columnas',
            'profile-dataset',
            ['data-viewer', 'visualizar datos', 'perfil'],
            ['perfilar', 'profile', 'columnas'],
          ),
          step(
            'Buscar pagos duplicados',
            'find-payment-duplicates',
            ['duplicate-analysis', 'duplicados'],
            ['pagos duplicados', 'duplicados'],
          ),
          step(
            'Crear hallazgo',
            'create-finding',
            ['audit-finding', 'hallazgo'],
            ['crear hallazgo', 'hallazgo'],
          ),
        ],
      }
    }

    return {
      title: 'Flujo para validar pagos contra soporte contractual',
      summary:
        'Se recomienda cargar fuentes, perfilar columnas, validar pagos contra contratos y generar hallazgos.',
      recommendedNode: 'Validar pagos contra contratos',
      steps: [
        'Cargar fuentes de pagos y contratos',
        'Perfilar columnas clave',
        'Validar pagos contra contratos',
        'Crear hallazgo',
      ],
      toolSteps: [
        step(
          'Cargar fuentes de pagos y contratos',
          'upload-excel-file',
          ['upload', 'subir', 'excel', 'archivo'],
          ['subir', 'cargar', 'excel'],
        ),
        step(
          'Perfilar columnas clave',
          'profile-dataset',
          ['data-viewer', 'visualizar datos', 'perfil'],
          ['perfilar', 'profile', 'columnas'],
        ),
        step(
          'Validar pagos contra contratos',
          'validate-payments-against-contracts',
          ['payment-validation', 'validar pagos', 'pago'],
          ['validar pagos contra contratos', 'validar pagos', 'pago'],
        ),
        step(
          'Crear hallazgo',
          'create-finding',
          ['audit-finding', 'hallazgo'],
          ['crear hallazgo', 'hallazgo'],
        ),
      ],
    }
  }

  if (intent.type === 'duplicate-detection') {
    return {
      title: 'Flujo para búsqueda de duplicados',
      summary:
        'Se recomienda cargar la fuente, perfilar campos y ejecutar detección de duplicados.',
      recommendedNode: 'Buscar duplicados',
      steps: [
        'Cargar archivo Excel',
        'Perfilar columnas',
        'Buscar duplicados',
        'Crear hallazgo',
      ],
      toolSteps: [
        step(
          'Cargar archivo Excel',
          'upload-excel-file',
          ['upload', 'subir', 'excel', 'archivo'],
          ['subir', 'cargar', 'excel'],
        ),
        step(
          'Perfilar columnas',
          'profile-dataset',
          ['data-viewer', 'visualizar datos', 'perfil'],
          ['perfilar', 'profile'],
        ),
        step(
          'Buscar duplicados',
          'find-exact-duplicates',
          ['duplicate-analysis', 'duplicados'],
          ['duplicados', 'pagos duplicados'],
        ),
        step(
          'Crear hallazgo',
          'create-finding',
          ['audit-finding', 'hallazgo'],
          ['crear hallazgo', 'hallazgo'],
        ),
      ],
    }
  }

  if (intent.type === 'document-evidence-review') {
    return createDocumentReviewPlan(requestProfile)
  }

  if (intent.type === 'data-comparison') {
    return {
      title: 'Flujo para cruce y comparación de bases',
      summary:
        'Se recomienda cargar las bases, perfilar columnas, cruzar por campos clave y revisar diferencias.',
      recommendedNode: 'Cruzar bases',
      steps: [
        'Cargar bases',
        'Perfilar columnas',
        'Cruzar por campo clave',
        'Crear hallazgo',
      ],
      toolSteps: [
        step(
          'Cargar bases',
          'upload-excel-file',
          ['upload', 'subir', 'excel', 'archivo'],
          ['subir', 'cargar'],
        ),
        step(
          'Perfilar columnas',
          'profile-dataset',
          ['data-viewer', 'visualizar datos', 'perfil'],
          ['perfilar', 'profile'],
        ),
        step(
          'Cruzar por campo clave',
          'join-by-key',
          ['join-datasets', 'cruzar bases'],
          ['cruzar por campo clave', 'cruzar'],
        ),
        step(
          'Crear hallazgo',
          'create-finding',
          ['audit-finding', 'hallazgo'],
          ['crear hallazgo', 'hallazgo'],
        ),
      ],
    }
  }

  if (intent.type === 'finding-generation') {
    return {
      title: 'Flujo para construcción de hallazgos',
      summary:
        'Se recomienda partir de resultados o evidencia y generar hallazgos preliminares.',
      recommendedNode: 'Crear hallazgo',
      steps: [
        'Crear hallazgo',
        'Vincular evidencia',
        'Generar cédula de auditoría',
      ],
      toolSteps: [
        step(
          'Crear hallazgo',
          'create-finding',
          ['audit-finding', 'hallazgo'],
          ['crear hallazgo', 'hallazgo'],
        ),
        step(
          'Vincular evidencia',
          'link-evidence',
          ['audit-finding', 'hallazgo'],
          ['vincular evidencia', 'evidencia'],
        ),
        step(
          'Generar cédula de auditoría',
          'generate-audit-cedula',
          ['audit-working-papers', 'cedula'],
          ['generar cedula de auditoria', 'cedula'],
        ),
      ],
    }
  }

  if (intent.type === 'report-generation') {
    return {
      title: 'Flujo para generación de reporte',
      summary:
        'Se recomienda preparar hallazgos, seleccionar plantilla y generar reporte.',
      recommendedNode: 'Generar reporte',
      steps: [
        'Seleccionar hallazgos',
        'Generar resumen ejecutivo',
        'Crear Word editable',
      ],
      toolSteps: [
        step(
          'Generar resumen ejecutivo',
          'generate-executive-summary',
          ['report-generator', 'reporte'],
          ['resumen ejecutivo', 'reporte'],
        ),
        step(
          'Crear Word editable',
          'create-editable-word-document',
          ['word-editor', 'word'],
          ['crear word editable', 'word'],
        ),
      ],
    }
  }

  return {
    title: 'Flujo general de análisis',
    summary:
      'Se recomienda iniciar con carga de información, perfilado y asistencia IA para definir el siguiente paso.',
    recommendedNode: 'IA auditora',
    steps: [
      'Definir objetivo',
      'Cargar información',
      'Perfilar datos',
      'Sugerir análisis',
    ],
    toolSteps: [
      step(
        'IA auditora',
        'ai-suggest-next-step',
        ['ai-auditor', 'ia'],
        ['sugerir siguiente nodo', 'sugerir'],
      ),
    ],
  }
}


