import type { ToolDefinition } from './toolCatalog'

export type ToolCapabilityStatus =
  | 'available-in-workspace'
  | 'design-only'
  | 'requires-configuration'
  | 'not-available'

export type ToolAvailability = {
  status: ToolCapabilityStatus
  label: string
  description: string
  canAddToDesign: boolean
}

const defaultAvailability: ToolAvailability = {
  status: 'design-only',
  label: 'Planeado',
  description:
    'Puede documentarse en el flujo técnico, pero todavía no tiene ejecutor backend.',
  canAddToDesign: true,
}

const availabilityByToolId: Record<string, ToolAvailability> = {
  'upload-excel': {
    status: 'available-in-workspace',
    label: 'Disponible en Fuentes',
    description:
      'La carga y el perfilado real se realizan desde la capa Fuentes.',
    canAddToDesign: true,
  },
  'csv-tools': {
    status: 'available-in-workspace',
    label: 'Disponible en Fuentes',
    description:
      'La carga y la detección estructural real se realizan desde la capa Fuentes.',
    canAddToDesign: true,
  },
  'data-viewer': {
    status: 'available-in-workspace',
    label: 'Disponible en Fuentes',
    description:
      'El perfil real de hojas, columnas, nulos y duplicados está disponible en Fuentes.',
    canAddToDesign: true,
  },
  'sql-connector': {
    status: 'requires-configuration',
    label: 'Requiere configuración',
    description:
      'Necesita una conexión segura y un ejecutor backend antes de operar.',
    canAddToDesign: true,
  },
  'pdf-tools': {
    status: 'not-available',
    label: 'No disponible',
    description:
      'El backend actual no procesa documentos PDF.',
    canAddToDesign: false,
  },
  'word-editor': {
    status: 'not-available',
    label: 'No disponible',
    description:
      'La generación y edición de Word todavía no están implementadas.',
    canAddToDesign: false,
  },
  'document-review': {
    status: 'not-available',
    label: 'No disponible',
    description:
      'La revisión documental todavía no tiene un ejecutor real.',
    canAddToDesign: false,
  },
}

export function getToolAvailability(
  tool: Pick<ToolDefinition, 'id'> | string | undefined,
): ToolAvailability {
  const toolId =
    typeof tool === 'string'
      ? tool
      : tool?.id

  if (!toolId) return defaultAvailability

  return availabilityByToolId[toolId] ?? defaultAvailability
}
