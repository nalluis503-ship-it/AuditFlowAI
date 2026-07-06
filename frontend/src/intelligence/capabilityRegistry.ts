import type { NodeDataType } from '../data/toolCatalog'

export type CapabilityStatus = 'available' | 'simulated' | 'missing'

export type AuditCapability = {
  id: string
  title: string
  description: string
  status: CapabilityStatus
  inputTypes: NodeDataType[]
  outputType?: NodeDataType
  relatedToolIds: string[]
  developerNote?: string
}

export const capabilityRegistry: AuditCapability[] = [
  {
    id: 'file-upload-metadata',
    title: 'Carga de archivos',
    description: 'Permite cargar archivos y conservar metadatos básicos dentro del nodo.',
    status: 'available',
    inputTypes: ['file', 'unknown'],
    outputType: 'file',
    relatedToolIds: ['upload-excel', 'pdf-tools'],
  },
  {
    id: 'visual-workflow-execution',
    title: 'Ejecución visual del workflow',
    description: 'Ejecuta nodos visualmente y cambia estados de ejecución.',
    status: 'available',
    inputTypes: ['unknown'],
    outputType: 'unknown',
    relatedToolIds: [],
  },
  {
    id: 'node-level-results',
    title: 'Resultados resumidos por nodo',
    description: 'Muestra resultados ejecutivos dentro de cada nodo y su editor.',
    status: 'available',
    inputTypes: ['unknown'],
    outputType: 'auditResult',
    relatedToolIds: [],
  },
  {
    id: 'excel-real-reader',
    title: 'Lectura real de Excel',
    description: 'Leer hojas, columnas y registros reales de archivos Excel.',
    status: 'missing',
    inputTypes: ['excel', 'file'],
    outputType: 'dataset',
    relatedToolIds: ['upload-excel', 'data-viewer'],
    developerNote: 'Implementar parser real de Excel/CSV para vista previa y perfilado.',
  },
  {
    id: 'automatic-column-profiling',
    title: 'Perfilado automático de columnas',
    description: 'Detectar tipos de dato, columnas monetarias, fechas, contratos, proveedores y campos clave.',
    status: 'missing',
    inputTypes: ['dataset', 'excel', 'sqlDataset'],
    outputType: 'dataset',
    relatedToolIds: ['data-viewer'],
    developerNote: 'Crear motor de perfilado para clasificar columnas y calidad de datos.',
  },
  {
    id: 'payment-contract-validation',
    title: 'Validación de pagos contra contratos',
    description: 'Comparar pagos contra contratos, facturas, proveedores, montos y fechas.',
    status: 'missing',
    inputTypes: ['dataset', 'excel', 'sqlDataset'],
    outputType: 'auditResult',
    relatedToolIds: ['payment-validation'],
    developerNote: 'Construir validador especializado con reglas configurables.',
  },
  {
    id: 'dataset-join-engine',
    title: 'Cruce real de bases',
    description: 'Cruzar dos o más bases por campos clave y detectar coincidencias, diferencias y faltantes.',
    status: 'missing',
    inputTypes: ['dataset', 'excel', 'sqlDataset'],
    outputType: 'auditResult',
    relatedToolIds: ['join-datasets'],
    developerNote: 'Implementar motor real de joins y comparación entre datasets.',
  },
  {
    id: 'document-evidence-viewer',
    title: 'Visor de evidencia documental',
    description: 'Ver documentos, marcar evidencia y relacionarla con hallazgos.',
    status: 'missing',
    inputTypes: ['pdf', 'word', 'document'],
    outputType: 'document',
    relatedToolIds: ['pdf-tools'],
    developerNote: 'Crear visor documental con trazabilidad por página, párrafo o fragmento.',
  },
  {
    id: 'finding-generator',
    title: 'Generación asistida de hallazgos',
    description: 'Convertir resultados en hallazgos con condición, criterio, causa, efecto y recomendación.',
    status: 'simulated',
    inputTypes: ['auditResult', 'dataset', 'document'],
    outputType: 'document',
    relatedToolIds: ['audit-finding'],
    developerNote: 'Actualmente es visual/simulado. Falta generar hallazgos desde evidencia real.',
  },
  {
    id: 'report-export',
    title: 'Exportación real de reportes',
    description: 'Generar documentos Word, PDF o Excel con resultados y anexos.',
    status: 'missing',
    inputTypes: ['auditResult', 'document', 'report'],
    outputType: 'report',
    relatedToolIds: ['report-generator'],
    developerNote: 'Implementar exportación real a Word/PDF/Excel.',
  },
]

export function getCapabilitiesByStatus(status: CapabilityStatus) {
  return capabilityRegistry.filter((capability) => capability.status === status)
}

export function getCapabilityById(id: string) {
  return capabilityRegistry.find((capability) => capability.id === id)
}
