import {
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from 'react'
import type {
  CanvasAIRecommendation,
} from '../../../../intelligence'
import {
  useObjectWorkspace,
} from './useObjectWorkspace'
import type {
  WorkspaceObject,
} from './objectWorkspaceTypes'
import './ObjectWorkspaceStage.css'

type ObjectWorkspaceStageProps = {
  onCreateRecommendedFlow?: (
    recommendation: CanvasAIRecommendation,
  ) => void
  onOpenTools?: () => void
  onOpenTechnical?: () => void
}

const kindLabels: Record<
  WorkspaceObject['kind'],
  string
> = {
  source: 'Fuente',
  tool: 'Herramienta',
  result: 'Resultado',
  evidence: 'Evidencia',
  visualization: 'Gráfica',
  finding: 'Hallazgo',
  report: 'Reporte',
}

function ObjectViewer({
  object,
}: {
  object: WorkspaceObject
}) {
  if (
    object.previewUrl &&
    object.format === 'pdf'
  ) {
    return (
      <iframe
        className="ow-pdf-viewer"
        src={object.previewUrl}
        title={object.title}
      />
    )
  }

  if (
    object.kind === 'visualization'
  ) {
    return (
      <div className="ow-chart-preview">
        <small>
          Vista preliminar · pendiente de columnas reales
        </small>

        <div>
          {[58, 82, 44, 72, 36].map(
            (height, index) => (
              <span
                key={`${height}-${index}`}
                style={{
                  height: `${height}%`,
                }}
              />
            ),
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="ow-detail-copy">
      <span>{kindLabels[object.kind]}</span>
      <h3>{object.title}</h3>
      <p>{object.subtitle}</p>

      {object.previewLines &&
        object.previewLines.length > 0 && (
          <ul>
            {object.previewLines.map(
              (line, index) => (
                <li key={`${line}-${index}`}>
                  {line}
                </li>
              ),
            )}
          </ul>
        )}

      {object.file && (
        <dl>
          <div>
            <dt>Archivo</dt>
            <dd>{object.file.name}</dd>
          </div>
          <div>
            <dt>Tamaño</dt>
            <dd>
              {Math.max(
                1,
                Math.round(
                  object.file.size / 1024,
                ),
              )}{' '}
              KB
            </dd>
          </div>
          <div>
            <dt>Tipo</dt>
            <dd>
              {object.file.type ||
                object.format ||
                'Archivo'}
            </dd>
          </div>
        </dl>
      )}
    </div>
  )
}

function StageObject({
  object,
  selected,
  compared,
  onMove,
  onSelect,
  onOpen,
  onCompare,
  onHide,
}: {
  object: WorkspaceObject
  selected: boolean
  compared: boolean
  onMove: (
    position: {
      x: number
      y: number
    },
  ) => void
  onSelect: () => void
  onOpen: () => void
  onCompare: () => void
  onHide: () => void
}) {
  const startDragging = (
    event: PointerEvent<HTMLElement>,
  ) => {
    if (
      (
        event.target as HTMLElement
      ).closest('button')
    ) {
      return
    }

    const surface =
      event.currentTarget.closest(
        '.ow-stage',
      )

    if (
      !(surface instanceof HTMLElement)
    ) {
      return
    }

    const rect =
      surface.getBoundingClientRect()

    const startX = event.clientX
    const startY = event.clientY
    const initial = object.position

    const handleMove = (
      moveEvent: globalThis.PointerEvent,
    ) => {
      onMove({
        x:
          initial.x +
          ((moveEvent.clientX - startX) /
            rect.width) *
            100,
        y:
          initial.y +
          ((moveEvent.clientY - startY) /
            rect.height) *
            100,
      })
    }

    const handleUp = () => {
      window.removeEventListener(
        'pointermove',
        handleMove,
      )
      window.removeEventListener(
        'pointerup',
        handleUp,
      )
    }

    window.addEventListener(
      'pointermove',
      handleMove,
    )

    window.addEventListener(
      'pointerup',
      handleUp,
      {
        once: true,
      },
    )
  }

  return (
    <article
      className={[
        'ow-object-card',
        selected ? 'selected' : '',
        compared ? 'compared' : '',
      ].join(' ')}
      style={{
        left: `${object.position.x}%`,
        top: `${object.position.y}%`,
      }}
      onPointerDown={startDragging}
    >
      <div className="ow-object-card-topline">
        <span>
          {kindLabels[object.kind]}
        </span>

        <button
          type="button"
          onClick={onHide}
          aria-label={`Ocultar ${object.title}`}
        >
          ×
        </button>
      </div>

      <strong>{object.title}</strong>
      <p>{object.subtitle}</p>

      <div className="ow-object-card-actions">
        <button
          type="button"
          onClick={onSelect}
        >
          {selected
            ? 'Seleccionado'
            : 'Seleccionar'}
        </button>

        <button
          type="button"
          onClick={onOpen}
        >
          Abrir
        </button>

        <button
          type="button"
          onClick={onCompare}
        >
          {compared
            ? 'Quitar'
            : 'Comparar'}
        </button>
      </div>
    </article>
  )
}

export default function ObjectWorkspaceStage({
  onCreateRecommendedFlow,
  onOpenTools,
  onOpenTechnical,
}: ObjectWorkspaceStageProps) {
  const [prompt, setPrompt] =
    useState('')

  const [
    transcriptOpen,
    setTranscriptOpen,
  ] = useState(false)

  const fileInputRef =
    useRef<HTMLInputElement>(null)

  const workspace =
    useObjectWorkspace(
      onCreateRecommendedFlow,
    )

  const handleSubmit = () => {
    const cleanPrompt = prompt.trim()

    if (!cleanPrompt) {
      return
    }

    workspace.submitPrompt(cleanPrompt)
    setTranscriptOpen(false)
    setPrompt('')
  }

  const handleFiles = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    if (
      event.target.files?.length
    ) {
      workspace.uploadFiles(
        event.target.files,
      )
    }

    event.target.value = ''
  }

  const regularObjects =
    workspace.objects.filter(
      (object) => object.kind !== 'tool',
    )

  const toolObjects =
    workspace.objects.filter(
      (object) => object.kind === 'tool',
    )

  const mode =
    workspace.compareObjects.length === 2
      ? 'compare'
      : workspace.focusedObject
        ? 'focus'
        : 'overview'

  return (
    <section
      className="ow-stage"
      data-mode={mode}
    >
      <div className="ow-grid" />
      <div className="ow-ambient ow-ambient-one" />
      <div className="ow-ambient ow-ambient-two" />

      <div
        className="ow-ai-core"
        aria-label="Núcleo de inteligencia artificial"
      >
        <span>IA</span>
        <strong>AuditFlow</strong>
        <small>
          {workspace.visibleObjects.length > 0
            ? 'asiste el campo'
            : 'esperando instrucción'}
        </small>
      </div>

      <div className="ow-top-actions">
        <button
          type="button"
          onClick={() => {
            const nextOpen =
              !workspace.shelfOpen

            setTranscriptOpen(false)
            workspace.setShelfOpen(
              nextOpen,
            )
          }}
        >
          Objetos
          <b>{regularObjects.length}</b>
        </button>

        <button
          type="button"
          onClick={() =>
            fileInputRef.current?.click()
          }
        >
          Subir archivos
        </button>

        <button
          type="button"
          onClick={onOpenTools}
        >
          Herramientas avanzadas
        </button>

        <button
          type="button"
          onClick={onOpenTechnical}
        >
          Flujo técnico
        </button>
      </div>

      <input
        ref={fileInputRef}
        className="ow-hidden-input"
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.sql,.txt"
        onChange={handleFiles}
      />

      <div className="ow-stage-objects">
        {workspace.visibleObjects.map(
          (object) => (
            <StageObject
              key={object.id}
              object={object}
              selected={workspace.selectedIds.includes(
                object.id,
              )}
              compared={workspace.compareIds.includes(
                object.id,
              )}
              onMove={(position) =>
                workspace.moveObject(
                  object.id,
                  position,
                )
              }
              onSelect={() =>
                workspace.toggleSelected(
                  object.id,
                )
              }
              onOpen={() =>
                workspace.focusObject(
                  object.id,
                )
              }
              onCompare={() =>
                workspace.toggleCompare(
                  object.id,
                )
              }
              onHide={() =>
                workspace.hideObject(
                  object.id,
                )
              }
            />
          ),
        )}
      </div>

      {workspace.visibleObjects.length === 0 &&
        !workspace.focusedObject && (
          <div className="ow-empty-state">
            <span>Campo libre</span>
            <strong>
              Trae solo los objetos que quieras trabajar
            </strong>
            <p>
              Los resultados permanecen en la bandeja hasta que el auditor decide abrirlos.
            </p>
          </div>
        )}

      {workspace.focusedObject &&
        workspace.compareObjects.length < 2 && (
          <section className="ow-focus-stage">
            <header>
              <div>
                <span>
                  {
                    kindLabels[
                      workspace.focusedObject
                        .kind
                    ]
                  }
                </span>
                <strong>
                  {
                    workspace.focusedObject
                      .title
                  }
                </strong>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    workspace.toggleCompare(
                      workspace
                        .focusedObject!.id,
                    )
                  }
                >
                  Agregar a comparación
                </button>

                <button
                  type="button"
                  onClick={
                    workspace.closeFocus
                  }
                >
                  Cerrar
                </button>
              </div>
            </header>

            <ObjectViewer
              object={
                workspace.focusedObject
              }
            />
          </section>
        )}

      {workspace.compareObjects.length ===
        2 && (
        <section className="ow-compare-stage">
          <header>
            <div>
              <span>
                Comparación activa
              </span>
              <strong>
                Dos objetos en el mismo contexto
              </strong>
            </div>

            <button
              type="button"
              onClick={
                workspace.clearCompare
              }
            >
              Cerrar comparación
            </button>
          </header>

          <div className="ow-compare-grid">
            {workspace.compareObjects.map(
              (object) => (
                <article key={object.id}>
                  <div className="ow-compare-title">
                    <span>
                      {
                        kindLabels[
                          object.kind
                        ]
                      }
                    </span>
                    <strong>
                      {object.title}
                    </strong>
                  </div>

                  <ObjectViewer
                    object={object}
                  />
                </article>
              ),
            )}
          </div>
        </section>
      )}

      <aside
        className={`ow-shelf ${
          workspace.shelfOpen
            ? 'open'
            : ''
        }`}
      >
        <header>
          <div>
            <span>
              Objetos disponibles
            </span>
            <strong>
              Fuentes, resultados y herramientas
            </strong>
          </div>

          <button
            type="button"
            onClick={() =>
              workspace.setShelfOpen(
                false,
              )
            }
          >
            ×
          </button>
        </header>

        <div className="ow-shelf-row">
          {regularObjects.length ===
            0 && (
            <p className="ow-shelf-empty">
              Escribe una solicitud o sube un archivo.
            </p>
          )}

          {regularObjects.map(
            (object) => (
              <article
                key={object.id}
                className="ow-shelf-item"
              >
                <span>
                  {
                    kindLabels[
                      object.kind
                    ]
                  }
                </span>

                <strong>
                  {object.title}
                </strong>

                <small>
                  {object.subtitle}
                </small>

                <div>
                  <button
                    type="button"
                    onClick={() =>
                      workspace.bringToStage(
                        object.id,
                      )
                    }
                  >
                    Llevar al campo
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      workspace.focusObject(
                        object.id,
                      )
                    }
                  >
                    Abrir
                  </button>
                </div>
              </article>
            ),
          )}
        </div>

        <div className="ow-tool-row">
          {toolObjects.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() =>
                workspace.executeTool(
                  tool.id,
                )
              }
            >
              <span>{tool.title}</span>
              <small>
                {tool.subtitle}
              </small>
            </button>
          ))}
        </div>
      </aside>

      <section className="ow-composer">
        <button
          type="button"
          className="ow-last-message"
          onClick={() => {
            const nextOpen =
              !transcriptOpen

            if (nextOpen) {
              workspace.setShelfOpen(
                false,
              )
            }

            setTranscriptOpen(
              nextOpen,
            )
          }}
        >
          <span>
            {
              workspace.latestMessage
                .title
            }
          </span>

          <p>
            {
              workspace.latestMessage
                .text
            }
          </p>

          <small>
            {transcriptOpen
              ? 'Ocultar historial'
              : 'Ver historial'}
          </small>
        </button>

        {transcriptOpen && (
          <div className="ow-transcript">
            {workspace.transcript
              .slice(-8)
              .map((item) => (
                <article
                  key={item.id}
                  data-role={item.role}
                >
                  <span>
                    {item.title}
                  </span>
                  <p>{item.text}</p>
                </article>
              ))}
          </div>
        )}

        <div className="ow-input-row">
          <span>IA</span>

          <input
            value={prompt}
            onChange={(event) =>
              setPrompt(
                event.target.value,
              )
            }
            onKeyDown={(event) => {
              if (
                event.key === 'Enter'
              ) {
                handleSubmit()
              }
            }}
            placeholder="Pídele a la IA que revise, cruce, explique o genere..."
          />

          <button
            type="button"
            onClick={handleSubmit}
          >
            Enviar
          </button>
        </div>
      </section>
    </section>
  )
}

