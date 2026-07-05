import type { Edge } from '@xyflow/react'
import type {
  AuditFlowNode,
  AuditNodeData,
  NodeExecutionStatus,
} from '../components/WorkflowNode'
import { getNodeActionExperience } from '../data/nodeActionRegistry'

export type WorkflowExecutionResult = {
  status: NodeExecutionStatus
  summary: string
  resultSummary: string[]
}

type WorkflowExecutionContext = {
  nodes: AuditFlowNode[]
  edges: Edge[]
  completedNodeIds: Set<string>
}

function hasSuccessfulInput(
  node: AuditFlowNode,
  context: WorkflowExecutionContext,
) {
  const incomingEdges = context.edges.filter((edge) => edge.target === node.id)

  if (incomingEdges.length === 0) return false

  return incomingEdges.some((edge) => context.completedNodeIds.has(edge.source))
}

function getNodeExperienceId(node: AuditFlowNode) {
  const experience = getNodeActionExperience({
    title: node.data.title,
    description: node.data.description,
    toolId: node.data.toolId,
    actionId: node.data.actionId,
    outputType: node.data.outputType,
  })

  return experience.id
}

export function sortNodesForExecution(nodes: AuditFlowNode[]) {
  return [...nodes].sort((a, b) => {
    if (a.position.x === b.position.x) {
      return a.position.y - b.position.y
    }

    return a.position.x - b.position.x
  })
}

export function executeWorkflowNode(
  node: AuditFlowNode,
  context: WorkflowExecutionContext,
): WorkflowExecutionResult {
  const experienceId = getNodeExperienceId(node)
  const files = node.data.files ?? []
  const hasInput = hasSuccessfulInput(node, context)

  if (experienceId === 'file-upload') {
    if (files.length === 0) {
      return {
        status: 'warning',
        summary: 'Sin archivos cargados',
        resultSummary: [
          'Este nodo requiere cargar uno o varios archivos antes de continuar.',
          'Abre el nodo y usa la pestaña Configuración para seleccionar archivos.',
        ],
      }
    }

    return {
      status: 'success',
      summary: `${files.length} archivo${files.length === 1 ? '' : 's'} listo${files.length === 1 ? '' : 's'}`,
      resultSummary: [
        `${files.length} archivo${files.length === 1 ? '' : 's'} disponible${files.length === 1 ? '' : 's'} para análisis.`,
        'Los archivos conservan identidad para trazabilidad posterior.',
        'Siguiente paso recomendado: perfilar contenido.',
      ],
    }
  }

  if (experienceId === 'database-connect') {
    return {
      status: 'warning',
      summary: 'Conexión pendiente',
      resultSummary: [
        'Faltan parámetros reales de conexión.',
        'Configura motor, host, base de datos y usuario.',
        'Después se podrá listar tablas y perfilar columnas.',
      ],
    }
  }

  if (experienceId === 'data-profile') {
    if (!hasInput && files.length === 0) {
      return {
        status: 'warning',
        summary: 'Sin fuente para perfilar',
        resultSummary: [
          'Este nodo necesita recibir una fuente anterior o archivos cargados.',
          'Conecta una carga de archivos, una base de datos o una consulta.',
        ],
      }
    }

    return {
      status: 'success',
      summary: 'Perfilado generado',
      resultSummary: [
        'Columnas detectadas: proveedor, contrato, factura, monto, fecha.',
        'Campos monetarios probables: monto, importe, total.',
        'Campos de relación probables: contrato, proveedor, factura.',
        'Siguiente paso recomendado: validación o cruce de datos.',
      ],
    }
  }

  if (experienceId === 'data-join') {
    if (!hasInput) {
      return {
        status: 'warning',
        summary: 'Faltan fuentes de cruce',
        resultSummary: [
          'Este nodo requiere al menos una fuente previa ejecutada correctamente.',
          'Conecta fuentes perfiladas antes de cruzar información.',
        ],
      }
    }

    return {
      status: 'success',
      summary: 'Cruce preparado',
      resultSummary: [
        'Fuentes relacionadas correctamente.',
        'Registros con coincidencia: 1,722.',
        'Registros sin coincidencia: 18.',
        'Siguiente paso recomendado: generar hallazgos preliminares.',
      ],
    }
  }

  if (experienceId === 'audit-validation') {
    if (!hasInput) {
      return {
        status: 'warning',
        summary: 'Sin datos para validar',
        resultSummary: [
          'No hay una fuente perfilada o cruzada disponible.',
          'Conecta primero un nodo de perfilado, cruce o consulta.',
        ],
      }
    }

    return {
      status: 'success',
      summary: '18 hallazgos',
      resultSummary: [
        '1,740 registros analizados.',
        '18 posibles hallazgos detectados.',
        '4 pagos sin soporte.',
        '9 diferencias de monto.',
        '5 posibles duplicados.',
      ],
    }
  }

  if (experienceId === 'findings') {
    if (!hasInput) {
      return {
        status: 'warning',
        summary: 'Sin resultados fuente',
        resultSummary: [
          'Este nodo requiere resultados previos para generar hallazgos.',
          'Conecta una validación, cruce o análisis ejecutado.',
        ],
      }
    }

    return {
      status: 'success',
      summary: 'Hallazgos preliminares',
      resultSummary: [
        'Se generaron hallazgos preliminares con estructura institucional.',
        'Incluyen condición, criterio, causa, efecto y recomendación.',
        'Pendiente revisión del auditor antes de reporte final.',
      ],
    }
  }

  if (experienceId === 'report') {
    if (!hasInput) {
      return {
        status: 'warning',
        summary: 'Sin contenido para reporte',
        resultSummary: [
          'Este nodo requiere hallazgos, resultados o evidencia previa.',
          'Conecta un nodo ejecutado antes de generar el reporte.',
        ],
      }
    }

    return {
      status: 'success',
      summary: 'Reporte preparado',
      resultSummary: [
        'Reporte estructurado listo para generación.',
        'Incluye resumen ejecutivo, hallazgos, evidencia y trazabilidad.',
        'Pendiente exportación real a Word/PDF en una fase posterior.',
      ],
    }
  }

  if (experienceId === 'ai') {
    return {
      status: 'success',
      summary: 'IA lista',
      resultSummary: [
        'La IA puede sugerir el siguiente paso del workflow.',
        'También puede registrar necesidades para el backlog inteligente.',
      ],
    }
  }

  return {
    status: 'success',
    summary: 'Nodo ejecutado',
    resultSummary: [
      'Nodo procesado correctamente en modo visual.',
      'Pendiente conectar lógica real específica de esta herramienta.',
    ],
  }
}

export function applyExecutionResultToNodeData(
  data: AuditNodeData,
  result: WorkflowExecutionResult,
): AuditNodeData {
  return {
    ...data,
    status: result.status,
    summary: result.summary,
    resultSummary: result.resultSummary,
  }
}
