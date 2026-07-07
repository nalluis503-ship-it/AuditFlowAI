import { analyzeSemanticAuditIntent } from '../semanticAuditIntentEngine'
import { parseAuditRequest } from '../auditRequestParser'
import { planWorkflowFromIntent } from '../workflowPlanner'

type TestCase = {
  prompt: string
  expectedSteps: string[]
  expectedActionIds: string[]
}

const testCases: TestCase[] = [
  {
    prompt: 'Analízame 2 bases de datos en formato SQL',
    expectedSteps: [
      'Conectar base SQL 1',
      'Conectar base SQL 2',
      'Explorar estructura SQL',
      'Perfilar datos',
      'Cruzar por campo clave',
      'Crear hallazgo',
    ],
    expectedActionIds: [
      'connect-sql-database',
      'connect-sql-database',
      'inspect-sql-schema',
      'profile-dataset',
      'join-by-key',
      'create-finding',
    ],
  },
  {
    prompt: 'Revisa documentos Word y marca evidencia',
    expectedSteps: [
      'Revisar soporte documental',
      'Marcar evidencia',
      'Crear hallazgo',
    ],
    expectedActionIds: [
      'review-document-support',
      'mark-document-evidence',
      'create-finding',
    ],
  },
  {
    prompt: 'Genera un informe Word editable con los hallazgos',
    expectedSteps: [
      'Generar resumen ejecutivo',
      'Crear Word editable',
      'Insertar hallazgos en Word',
    ],
    expectedActionIds: [
      'generate-executive-summary',
      'create-editable-word-document',
      'insert-findings-into-word',
    ],
  },
  {
    prompt: 'Haz una matriz de riesgos de los resultados',
    expectedSteps: [
      'Clasificar matriz de riesgos',
      'Crear hallazgo',
      'Generar cédula de auditoría',
    ],
    expectedActionIds: [
      'classify-risk-matrix',
      'create-finding',
      'generate-audit-cedula',
    ],
  },
  {
    prompt: 'Exporta los resultados a Excel',
    expectedSteps: [
      'Crear hallazgo',
      'Exportar resultados a Excel',
    ],
    expectedActionIds: [
      'create-finding',
      'export-results-to-excel',
    ],
  },
  {
    prompt: 'Validar pagos contra contratos',
    expectedSteps: [
      'Cargar fuentes de pagos y contratos',
      'Perfilar columnas clave',
      'Validar pagos contra contratos',
      'Crear hallazgo',
    ],
    expectedActionIds: [
      'upload-excel-file',
      'profile-dataset',
      'validate-payments-against-contracts',
      'create-finding',
    ],
  },
  {
    prompt: 'Detectar pagos duplicados',
    expectedSteps: [
      'Cargar archivo Excel',
      'Perfilar columnas',
      'Buscar pagos duplicados',
      'Crear hallazgo',
    ],
    expectedActionIds: [
      'upload-excel-file',
      'profile-dataset',
      'find-payment-duplicates',
      'create-finding',
    ],
  },
]

function assertArrayEquals(label: string, actual: string[], expected: string[]) {
  const actualText = actual.join(' → ')
  const expectedText = expected.join(' → ')

  if (actualText !== expectedText) {
    throw new Error(
      `${label} no coincide.\nEsperado: ${expectedText}\nRecibido: ${actualText}`,
    )
  }
}

function runPlannerValidation() {
  for (const testCase of testCases) {
    const semanticIntent = analyzeSemanticAuditIntent(testCase.prompt)
    const requestProfile = parseAuditRequest(testCase.prompt)
    const workflowPlan = planWorkflowFromIntent(semanticIntent, requestProfile)

    const actionIds = workflowPlan.toolSteps.map((step) => step.actionId ?? 'missing-action-id')

    assertArrayEquals(
      `Steps para "${testCase.prompt}"`,
      workflowPlan.steps,
      testCase.expectedSteps,
    )

    assertArrayEquals(
      `ActionIds para "${testCase.prompt}"`,
      actionIds,
      testCase.expectedActionIds,
    )

    console.log(`OK: ${testCase.prompt}`)
  }

  console.log(`\n${testCases.length} pruebas del planner pasaron correctamente.`)
}

runPlannerValidation()
