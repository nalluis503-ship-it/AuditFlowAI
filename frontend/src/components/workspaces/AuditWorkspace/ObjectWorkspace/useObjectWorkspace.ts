import {
  useEffect,
  useMemo,
  useReducer,
} from 'react'
import type {
  WorkspaceMessage,
  WorkspaceObject,
  WorkspacePosition,
} from './objectWorkspaceTypes'

const STAGE_POSITIONS: WorkspacePosition[] = [
  { x: 62, y: 30 },
  { x: 80, y: 36 },
  { x: 64, y: 62 },
  { x: 82, y: 68 },
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
  | { type: 'SYNC_SOURCES'; objects: WorkspaceObject[] }
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
  title: 'Campo listo',
  text: 'Carga fuentes reales. Las solicitudes sin ejecutor disponible se conservarán como pendientes, sin inventar resultados.',
  createdAt: Date.now(),
}

const initialState: State = {
  objects: [],
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
    case 'SYNC_SOURCES': {
      const currentSources = new Map(
        state.objects
          .filter((object) => object.kind === 'source')
          .map((object) => [object.id, object]),
      )

      const synchronizedSources = action.objects.map((incoming) => {
        const current = currentSources.get(incoming.id)

        if (!current) return incoming

        return {
          ...incoming,
          position: current.position,
          isOnStage: current.isOnStage,
          isHidden: current.isHidden,
        }
      })

      const nextObjects = [
        ...synchronizedSources,
        ...state.objects.filter(
          (object) => object.kind !== 'source',
        ),
      ]
      const validIds = new Set(
        nextObjects.map((object) => object.id),
      )

      return {
        ...state,
        objects: nextObjects,
        visibleIds: state.visibleIds.filter((id) => validIds.has(id)),
        selectedIds: state.selectedIds.filter((id) => validIds.has(id)),
        compareIds: state.compareIds.filter((id) => validIds.has(id)),
        focusId:
          state.focusId && validIds.has(state.focusId)
            ? state.focusId
            : null,
        shelfOpen:
          action.objects.length > currentSources.size
            ? true
            : state.shelfOpen,
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
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id],
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
      const compareIds = state.compareIds.includes(action.id)
        ? state.compareIds.filter((id) => id !== action.id)
        : [...state.compareIds, action.id].slice(-2)

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
        state.transcript[state.transcript.length - 1]
      const isDuplicate =
        previousMessage?.title === action.message.title
        && previousMessage?.text === action.message.text

      return {
        ...state,
        latestMessage: action.message,
        transcript: isDuplicate
          ? state.transcript
          : [...state.transcript, action.message].slice(-30),
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

export function useObjectWorkspace(
  sourceObjects: WorkspaceObject[],
) {
  const [state, dispatch] = useReducer(reducer, initialState)

  useEffect(() => {
    dispatch({
      type: 'SYNC_SOURCES',
      objects: sourceObjects,
    })
  }, [sourceObjects])

  const objectsById = useMemo(
    () =>
      new Map(
        state.objects.map((object) => [object.id, object]),
      ),
    [state.objects],
  )

  const visibleObjects = state.visibleIds
    .map((id) => objectsById.get(id))
    .filter(
      (object): object is WorkspaceObject => Boolean(object),
    )

  const focusedObject = state.focusId
    ? objectsById.get(state.focusId) ?? null
    : null

  const compareObjects = state.compareIds
    .map((id) => objectsById.get(id))
    .filter(
      (object): object is WorkspaceObject => Boolean(object),
    )

  const submitPrompt = (prompt: string) => {
    const cleanPrompt = prompt.trim()

    if (!cleanPrompt) return

    dispatch({
      type: 'MESSAGE',
      message: message('user', 'Tú', cleanPrompt),
    })

    dispatch({
      type: 'MESSAGE',
      message: message(
        'assistant',
        'Solicitud pendiente de ejecución',
        'La solicitud fue registrada, pero AuditFlow todavía no tiene un ejecutor real para interpretarla y completar acciones. No se generaron objetos, hallazgos ni resultados simulados.',
      ),
    })
  }



  return {
    ...state,
    visibleObjects,
    focusedObject,
    compareObjects,
    submitPrompt,

    bringToStage: (id: string) =>
      dispatch({ type: 'BRING_TO_STAGE', id }),

    hideObject: (id: string) =>
      dispatch({ type: 'HIDE', id }),

    moveObject: (
      id: string,
      position: WorkspacePosition,
    ) =>
      dispatch({ type: 'MOVE', id, position }),

    toggleSelected: (id: string) =>
      dispatch({ type: 'TOGGLE_SELECTED', id }),

    focusObject: (id: string) =>
      dispatch({ type: 'FOCUS', id }),

    closeFocus: () =>
      dispatch({ type: 'CLOSE_FOCUS' }),

    toggleCompare: (id: string) =>
      dispatch({ type: 'TOGGLE_COMPARE', id }),

    clearCompare: () =>
      dispatch({ type: 'CLEAR_COMPARE' }),

    setShelfOpen: (open: boolean) =>
      dispatch({ type: 'SET_SHELF', open }),
  }
}
