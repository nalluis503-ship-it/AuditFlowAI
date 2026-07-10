import { useMemo, useReducer } from 'react'
import {
  detectCanvasRecommendation,
  type CanvasAIRecommendation,
} from '../../../../intelligence'
import type {
  WorkspaceMessage,
  WorkspaceObject,
  WorkspaceObjectKind,
  WorkspacePosition,
} from './objectWorkspaceTypes'

const STAGE_POSITIONS: WorkspacePosition[] = [
  { x: 62, y: 30 },
  { x: 80, y: 36 },
  { x: 64, y: 62 },
  { x: 82, y: 68 },
]

function createObject(
  id: string,
  kind: WorkspaceObjectKind,
  title: string,
  subtitle: string,
  status: WorkspaceObject['status'] = 'ready',
): WorkspaceObject {
  return {
    id,
    kind,
    title,
    subtitle,
    status,
    position: { x: 70, y: 45 },
    isOnStage: false,
    isHidden: false,
    createdAt: Date.now(),
  }
}

const TOOL_OBJECTS: WorkspaceObject[] = [
  createObject(
    'tool-compare',
    'tool',
    'Cruce inteligente',
    'Relaciona dos objetos seleccionados',
    'available',
  ),
  createObject(
    'tool-chart',
    'tool',
    'Generar gráfica',
    'Crea una visualización desde el objeto seleccionado',
    'available',
  ),
  createObject(
    'tool-finding',
    'tool',
    'Crear hallazgo',
    'Vincula resultados con evidencia',
    'available',
  ),
  createObject(
    'tool-report',
    'tool',
    'Preparar reporte',
    'Integra hallazgos, gráficas y anexos',
    'available',
  ),
]

type State = {
  objects: WorkspaceObject[]
  visibleIds: string[]
  selectedIds: string[]
  focusId: string | null
  compareIds: string[]
  latestMessage: WorkspaceMessage
  transcript: WorkspaceMessage[]
  shelfOpen: boolean
}

type Action =
  | { type: 'ADD_OBJECTS'; objects: WorkspaceObject[] }
  | { type: 'BRING_TO_STAGE'; id: string }
  | { type: 'HIDE'; id: string }
  | { type: 'MOVE'; id: string; position: WorkspacePosition }
  | { type: 'TOGGLE_SELECTED'; id: string }
  | { type: 'FOCUS'; id: string }
  | { type: 'CLOSE_FOCUS' }
  | { type: 'TOGGLE_COMPARE'; id: string }
  | { type: 'CLEAR_COMPARE' }
  | { type: 'MESSAGE'; message: WorkspaceMessage }
  | { type: 'SET_SHELF'; open: boolean }

const welcome: WorkspaceMessage = {
  id: 'welcome',
  role: 'assistant',
  title: 'IA lista',
  text: 'Describe qué quieres revisar. Prepararé objetos sin saturar el campo.',
  createdAt: Date.now(),
}

const initialState: State = {
  objects: TOOL_OBJECTS,
  visibleIds: [],
  selectedIds: [],
  focusId: null,
  compareIds: [],
  latestMessage: welcome,
  transcript: [welcome],
  shelfOpen: true,
}

function clamp(position: WorkspacePosition): WorkspacePosition {
  return {
    x: Math.min(Math.max(position.x, 28), 88),
    y: Math.min(Math.max(position.y, 20), 76),
  }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_OBJECTS': {
      const incomingIds = new Set(
        action.objects.map((object) => object.id),
      )

      return {
        ...state,
        objects: [
          ...action.objects,
          ...state.objects.filter(
            (object) => !incomingIds.has(object.id),
          ),
        ],
        shelfOpen: true,
      }
    }

    case 'BRING_TO_STAGE': {
      const nextVisibleIds = [
        ...state.visibleIds.filter((id) => id !== action.id),
        action.id,
      ].slice(-4)

      const position =
        STAGE_POSITIONS[
          (nextVisibleIds.length - 1) % STAGE_POSITIONS.length
        ]

      return {
        ...state,
        visibleIds: nextVisibleIds,
        objects: state.objects.map((object) =>
          object.id === action.id
            ? {
                ...object,
                isOnStage: true,
                isHidden: false,
                position,
              }
            : object,
        ),
        shelfOpen: false,
      }
    }

    case 'HIDE':
      return {
        ...state,
        visibleIds: state.visibleIds.filter(
          (id) => id !== action.id,
        ),
        selectedIds: state.selectedIds.filter(
          (id) => id !== action.id,
        ),
        compareIds: state.compareIds.filter(
          (id) => id !== action.id,
        ),
        focusId:
          state.focusId === action.id
            ? null
            : state.focusId,
        objects: state.objects.map((object) =>
          object.id === action.id
            ? {
                ...object,
                isOnStage: false,
                isHidden: true,
              }
            : object,
        ),
      }

    case 'MOVE':
      return {
        ...state,
        objects: state.objects.map((object) =>
          object.id === action.id
            ? {
                ...object,
                position: clamp(action.position),
              }
            : object,
        ),
      }

    case 'TOGGLE_SELECTED':
      return {
        ...state,
        selectedIds: state.selectedIds.includes(action.id)
          ? state.selectedIds.filter(
              (id) => id !== action.id,
            )
          : [
              ...state.selectedIds,
              action.id,
            ],
      }

    case 'FOCUS':
      return {
        ...state,
        focusId: action.id,
        compareIds: [],
        shelfOpen: false,
      }

    case 'CLOSE_FOCUS':
      return {
        ...state,
        focusId: null,
      }

    case 'TOGGLE_COMPARE': {
      const compareIds =
        state.compareIds.includes(action.id)
          ? state.compareIds.filter(
              (id) => id !== action.id,
            )
          : [
              ...state.compareIds,
              action.id,
            ].slice(-2)

      return {
        ...state,
        compareIds,
        focusId: null,
        shelfOpen: false,
      }
    }

    case 'CLEAR_COMPARE':
      return {
        ...state,
        compareIds: [],
        focusId: null,
      }

    case 'MESSAGE': {
      const previousMessage =
        state.transcript[
          state.transcript.length - 1
        ]

      const isDuplicate =
        previousMessage?.title ===
          action.message.title &&
        previousMessage?.text ===
          action.message.text

      return {
        ...state,
        latestMessage: action.message,
        transcript: isDuplicate
          ? state.transcript
          : [
              ...state.transcript,
              action.message,
            ].slice(-30),
      }
    }

    case 'SET_SHELF':
      return {
        ...state,
        shelfOpen: action.open,
      }

    default:
      return state
  }
}

function message(
  role: WorkspaceMessage['role'],
  title: string,
  text: string,
): WorkspaceMessage {
  return {
    id: `message-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`,
    role,
    title,
    text,
    createdAt: Date.now(),
  }
}

function objectsFromRecommendation(
  prompt: string,
  recommendation: CanvasAIRecommendation,
): WorkspaceObject[] {
  const now = Date.now()
  const lower = prompt.toLowerCase()
  const objects: WorkspaceObject[] = []

  if (
    /contrato|pdf|documento|evidencia/.test(lower)
  ) {
    objects.push({
      ...createObject(
        `evidence-${now}`,
        'evidence',
        'Contratos y evidencia',
        'Objeto preparado para cargar documentos reales',
        'warning',
      ),
      format: 'pdf',
      previewLines: [
        'Pendiente de cargar archivos',
        'La IA conservará su relación con el análisis',
      ],
    })
  }

  if (
    /pago|excel|csv|base|dato/.test(lower)
  ) {
    objects.push({
      ...createObject(
        `source-${now}`,
        'source',
        'Pagos y fuentes de datos',
        'Objeto preparado para recibir Excel, CSV o SQL exportado',
        'warning',
      ),
      format: 'data',
      previewLines: [
        'Pendiente de cargar datos reales',
      ],
    })
  }

  objects.push({
    ...createObject(
      `result-${now}`,
      'result',
      recommendation.title,
      recommendation.summary,
      'draft',
    ),
    format: 'analysis',
    previewLines:
      recommendation.suggestedFlow.slice(0, 4),
  })

  return objects
}

function fileKind(
  file: File,
): WorkspaceObjectKind {
  const extension =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase()

  return (
    extension === 'pdf' ||
    extension === 'doc' ||
    extension === 'docx'
  )
    ? 'evidence'
    : 'source'
}

export function useObjectWorkspace(
  onCreateRecommendedFlow?: (
    recommendation: CanvasAIRecommendation,
  ) => void,
) {
  const [state, dispatch] = useReducer(
    reducer,
    initialState,
  )

  const objectsById = useMemo(
    () =>
      new Map(
        state.objects.map((object) => [
          object.id,
          object,
        ]),
      ),
    [state.objects],
  )

  const visibleObjects =
    state.visibleIds
      .map((id) => objectsById.get(id))
      .filter(
        (
          object,
        ): object is WorkspaceObject =>
          Boolean(object),
      )

  const focusedObject =
    state.focusId
      ? objectsById.get(state.focusId) ?? null
      : null

  const compareObjects =
    state.compareIds
      .map((id) => objectsById.get(id))
      .filter(
        (
          object,
        ): object is WorkspaceObject =>
          Boolean(object),
      )

  const submitPrompt = (prompt: string) => {
    const cleanPrompt = prompt.trim()

    if (!cleanPrompt) {
      return
    }

    const recommendation =
      detectCanvasRecommendation(cleanPrompt)

    const generatedObjects =
      objectsFromRecommendation(
        cleanPrompt,
        recommendation,
      )

    dispatch({
      type: 'MESSAGE',
      message: message(
        'user',
        'Tú',
        cleanPrompt,
      ),
    })

    dispatch({
      type: 'ADD_OBJECTS',
      objects: generatedObjects,
    })

    dispatch({
      type: 'MESSAGE',
      message: message(
        'assistant',
        'Objetos preparados',
        `Preparé ${generatedObjects.length} objeto${
          generatedObjects.length === 1
            ? ''
            : 's'
        }. Están en la bandeja; tú decides cuáles llevar al campo.`,
      ),
    })

    onCreateRecommendedFlow?.(recommendation)
  }

  const uploadFiles = (
    files: FileList | File[],
  ) => {
    const uploadedObjects =
      Array.from(files).map(
        (
          file,
          index,
        ): WorkspaceObject => {
          const extension =
            file.name
              .split('.')
              .pop()
              ?.toUpperCase() ??
            'ARCHIVO'

          const previewUrl =
            file.type === 'application/pdf'
              ? URL.createObjectURL(file)
              : undefined

          return {
            ...createObject(
              `file-${Date.now()}-${index}`,
              fileKind(file),
              file.name,
              `${extension} · ${Math.max(
                1,
                Math.round(file.size / 1024),
              )} KB`,
              'ready',
            ),
            format: extension.toLowerCase(),
            file,
            previewUrl,
          }
        },
      )

    dispatch({
      type: 'ADD_OBJECTS',
      objects: uploadedObjects,
    })

    dispatch({
      type: 'MESSAGE',
      message: message(
        'assistant',
        'Archivos disponibles',
        `${uploadedObjects.length} archivo${
          uploadedObjects.length === 1
            ? ''
            : 's'
        } agregado${
          uploadedObjects.length === 1
            ? ''
            : 's'
        } a la bandeja.`,
      ),
    })
  }

  const executeTool = (toolId: string) => {
    const selected =
      state.selectedIds
        .map((id) => objectsById.get(id))
        .filter(
          (
            object,
          ): object is WorkspaceObject =>
            Boolean(object),
        )
        .filter(
          (object) => object.kind !== 'tool',
        )

    if (selected.length === 0) {
      dispatch({
        type: 'MESSAGE',
        message: message(
          'assistant',
          'Selecciona objetos',
          'Marca uno o dos objetos del campo antes de aplicar una herramienta.',
        ),
      })

      return
    }

    const relation =
      selected
        .map((object) => object.title)
        .join(' + ')

    const now = Date.now()

    const definitions: Record<
      string,
      {
        kind: WorkspaceObjectKind
        title: string
        subtitle: string
        format: string
      }
    > = {
      'tool-compare': {
        kind: 'result',
        title: 'Cruce configurado',
        subtitle: `Relación preparada: ${relation}`,
        format: 'analysis',
      },
      'tool-chart': {
        kind: 'visualization',
        title: 'Visualización preparada',
        subtitle: `Fuente: ${relation}`,
        format: 'chart',
      },
      'tool-finding': {
        kind: 'finding',
        title: 'Hallazgo candidato',
        subtitle: `Evidencia vinculada: ${relation}`,
        format: 'finding',
      },
      'tool-report': {
        kind: 'report',
        title: 'Reporte preparado',
        subtitle: `Objetos incluidos: ${relation}`,
        format: 'report',
      },
    }

    const definition = definitions[toolId]

    if (!definition) {
      return
    }

    const generated: WorkspaceObject = {
      ...createObject(
        `generated-${now}`,
        definition.kind,
        definition.title,
        definition.subtitle,
        'draft',
      ),
      format: definition.format,
      sourceIds: selected.map(
        (object) => object.id,
      ),
      previewLines: selected.map(
        (object) => object.title,
      ),
    }

    dispatch({
      type: 'ADD_OBJECTS',
      objects: [generated],
    })

    dispatch({
      type: 'MESSAGE',
      message: message(
        'assistant',
        'Resultado generado',
        `“${generated.title}” quedó disponible en la bandeja.`,
      ),
    })
  }

  return {
    ...state,
    visibleObjects,
    focusedObject,
    compareObjects,
    submitPrompt,
    uploadFiles,
    executeTool,

    bringToStage: (id: string) =>
      dispatch({
        type: 'BRING_TO_STAGE',
        id,
      }),

    hideObject: (id: string) =>
      dispatch({
        type: 'HIDE',
        id,
      }),

    moveObject: (
      id: string,
      position: WorkspacePosition,
    ) =>
      dispatch({
        type: 'MOVE',
        id,
        position,
      }),

    toggleSelected: (id: string) =>
      dispatch({
        type: 'TOGGLE_SELECTED',
        id,
      }),

    focusObject: (id: string) =>
      dispatch({
        type: 'FOCUS',
        id,
      }),

    closeFocus: () =>
      dispatch({
        type: 'CLOSE_FOCUS',
      }),

    toggleCompare: (id: string) =>
      dispatch({
        type: 'TOGGLE_COMPARE',
        id,
      }),

    clearCompare: () =>
      dispatch({
        type: 'CLEAR_COMPARE',
      }),

    setShelfOpen: (open: boolean) =>
      dispatch({
        type: 'SET_SHELF',
        open,
      }),
  }
}

