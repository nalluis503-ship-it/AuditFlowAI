import { useState, type PointerEvent, type ReactNode } from 'react'
import './AuditWorkspace.css'

export type AuditWorkspaceFocus = 'command' | 'data' | 'technical'

type AuditWorkspaceProps = {
  activeFocus: AuditWorkspaceFocus
  nodeCount: number
  edgeCount: number
  learningNeedCount: number
  dataSourceCount: number
  onFocusChange: (focus: AuditWorkspaceFocus) => void
  onRunWorkflow: () => void
  onOpenTools: () => void
  commandLayer: ReactNode
  dataLayer: ReactNode
  technicalLayer: ReactNode
  overlayLayer?: ReactNode
}

const focusLabels: Record<AuditWorkspaceFocus, string> = {
  command: 'IA',
  data: 'Fuentes',
  technical: 'Flujo técnico',
}

const domainNodes = [
  'Fuentes',
  'Pagos',
  'Contratos',
  'Proveedores',
  'Riesgos',
  'Hallazgos',
  'Reportes',
  'Trazabilidad',
]


type WorkspaceScene = 'idle' | 'sources' | 'results' | 'technical'

type SpatialAuditObject = {
  id: string
  title: string
  kind: string
  detail: string
  value: string
  x: number
  y: number
}

type SpatialPosition = {
  x: number
  y: number
}

const spatialAuditObjects: SpatialAuditObject[] = [
  {
    id: 'result-risk',
    title: 'Riesgo detectado',
    kind: 'Riesgo',
    detail: 'Posible concentración de pagos o registros sensibles.',
    value: 'Alto',
    x: 59,
    y: 31,
  },
  {
    id: 'result-duplicates',
    title: 'Duplicados',
    kind: 'Análisis',
    detail: 'Coincidencias por proveedor, monto o referencia.',
    value: '12 casos',
    x: 76,
    y: 43,
  },
  {
    id: 'result-evidence',
    title: 'Evidencia',
    kind: 'Soporte',
    detail: 'Documentos relacionados listos para revisión.',
    value: '8 archivos',
    x: 62,
    y: 63,
  },
  {
    id: 'result-finding',
    title: 'Hallazgo candidato',
    kind: 'Cédula',
    detail: 'Borrador técnico listo para validar.',
    value: '1 hallazgo',
    x: 79,
    y: 70,
  },
]

const initialSpatialPositions = spatialAuditObjects.reduce<Record<string, SpatialPosition>>((positions, object) => {
  positions[object.id] = { x: object.x, y: object.y }
  return positions
}, {})

function clampPosition(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function SpatialObjectField({ scene }: { scene: WorkspaceScene }) {
  const [positions, setPositions] = useState<Record<string, SpatialPosition>>(() => initialSpatialPositions)
  const isVisible = scene !== 'idle'

  const startDragging = (objectId: string, event: PointerEvent<HTMLElement>) => {
    event.preventDefault()

    const surface = event.currentTarget.closest('.audit-workspace-surface')

    if (!(surface instanceof HTMLElement)) {
      return
    }

    const surfaceRect = surface.getBoundingClientRect()
    const startX = event.clientX
    const startY = event.clientY
    const startPosition = positions[objectId]

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const deltaX = ((moveEvent.clientX - startX) / surfaceRect.width) * 100
      const deltaY = ((moveEvent.clientY - startY) / surfaceRect.height) * 100

      setPositions((current) => ({
        ...current,
        [objectId]: {
          x: clampPosition(startPosition.x + deltaX, 42, 88),
          y: clampPosition(startPosition.y + deltaY, 18, 82),
        },
      }))
    }

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp, { once: true })
  }

  return (
    <div className={`audit-spatial-field ${isVisible ? 'active' : ''}`} aria-hidden={!isVisible}>
      {spatialAuditObjects.map((object) => {
        const position = positions[object.id]

        return (
          <article
            key={object.id}
            className="audit-spatial-object"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
            onPointerDown={(event) => startDragging(object.id, event)}
          >
            <span>{object.kind}</span>
            <strong>{object.title}</strong>
            <p>{object.detail}</p>
            <small>{object.value}</small>
          </article>
        )
      })}
    </div>
  )
}

function AuditWorkspace({
  activeFocus,
  nodeCount,
  edgeCount,
  learningNeedCount,
  dataSourceCount,
  onFocusChange,
  onRunWorkflow,
  onOpenTools,
  commandLayer,
  dataLayer,
  technicalLayer,
  overlayLayer,
}: AuditWorkspaceProps) {
  const [workspaceScene, setWorkspaceScene] = useState<WorkspaceScene>('idle')
  const [isContextPanelOpen, setIsContextPanelOpen] = useState(false)

  const handleFocusChange = (focus: AuditWorkspaceFocus) => {
    onFocusChange(focus)
    setWorkspaceScene(focus === 'command' ? 'idle' : focus === 'data' ? 'sources' : 'technical')
  }

  const handleRunWorkflow = () => {
    setWorkspaceScene('results')
    onRunWorkflow()
  }

  return (
    <main className="audit-workspace" data-focus={activeFocus} data-scene={workspaceScene}>
      <div className="audit-workspace-background" />

      <header className="audit-workspace-header">
        <div className="audit-workspace-brand">
          <div className="audit-workspace-logo">AF</div>
          <div>
            <span>AuditFlow AI</span>
            <h1>Campo inteligente de auditoría</h1>
          </div>
        </div>

        <div className="audit-workspace-command-bar" aria-label="Estado del campo inteligente">
          <span>IA</span>
          <div className="audit-workspace-command-copy">
            <strong>Centro de análisis activo</strong>
            <small>La IA organiza fuentes, resultados, herramientas y flujo técnico sin sacar al auditor del workspace.</small>
          </div>
        </div>

        <div className="audit-workspace-actions">
          <button type="button" onClick={onOpenTools}>Herramientas</button>
          <button type="button" onClick={handleRunWorkflow}>Ejecutar</button>
        </div>
      </header>

      <section className="audit-workspace-body">
        <aside className="audit-workspace-rail" aria-label="Capas del campo de trabajo">
          {(Object.keys(focusLabels) as AuditWorkspaceFocus[]).map((focus) => (
            <button
              key={focus}
              type="button"
              className={activeFocus === focus ? 'active' : undefined}
              onClick={() => handleFocusChange(focus)}
            >
              <span>{focusLabels[focus].slice(0, 2).toUpperCase()}</span>
              <small>{focusLabels[focus]}</small>
            </button>
          ))}
        </aside>

        <section className="audit-workspace-surface" aria-label="Superficie viva de auditoría">
          <button
            type="button"
            className={`audit-context-trigger ${isContextPanelOpen ? 'active' : ''}`}
            onClick={() => setIsContextPanelOpen((current) => !current)}
          >
            <span />
            Contexto IA
          </button>

          <div className="audit-workspace-core-map" aria-hidden="true">
            <div className="audit-workspace-core">
              <span>IA</span>
              <strong>AuditFlow</strong>
              <small>orquesta el trabajo</small>
            </div>

            {domainNodes.map((node, index) => (
              <div key={node} className={`audit-domain-node audit-domain-node-${index + 1}`}>
                <i />
                <strong>{node}</strong>
              </div>
            ))}
          </div>

          <SpatialObjectField scene={workspaceScene} />

          <div className={`audit-workspace-layer audit-command-layer ${activeFocus === 'command' ? 'active' : ''}`}>
            {commandLayer}
          </div>

          <div className={`audit-workspace-layer audit-data-layer ${activeFocus === 'data' ? 'active' : ''}`}>
            {dataLayer}
          </div>

          <div className={`audit-workspace-layer audit-technical-layer ${activeFocus === 'technical' ? 'active' : ''}`}>
            {technicalLayer}
          </div>

          {overlayLayer && (
            <div className="audit-workspace-overlays">
              {overlayLayer}
            </div>
          )}
        </section>

        <aside className={`audit-workspace-context ${isContextPanelOpen ? 'active' : ''}`}>
          <button
            type="button"
            className="audit-context-close"
            onClick={() => setIsContextPanelOpen(false)}
            aria-label="Cerrar contexto IA"
          >
            ×
          </button>
          <section>
            <span>Contexto activo</span>
            <strong>{focusLabels[activeFocus]}</strong>
            <p>
              La IA acomoda el campo de trabajo según la intención del auditor. El flujo técnico queda disponible
              como explicación avanzada, no como pantalla obligatoria.
            </p>
          </section>

          <section className="audit-workspace-metrics">
            <article>
              <span>Fuentes</span>
              <strong>{dataSourceCount}</strong>
            </article>
            <article>
              <span>Pasos</span>
              <strong>{nodeCount}</strong>
            </article>
            <article>
              <span>Conexiones</span>
              <strong>{edgeCount}</strong>
            </article>
            <article>
              <span>Aprendizajes</span>
              <strong>{learningNeedCount}</strong>
            </article>
          </section>

          <section className="audit-workspace-principles">
            <span>Regla del workspace</span>
            <ul>
              <li>La IA guía.</li>
              <li>La mesa organiza.</li>
              <li>Las herramientas ejecutan.</li>
              <li>El flujo técnico explica.</li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default AuditWorkspace


