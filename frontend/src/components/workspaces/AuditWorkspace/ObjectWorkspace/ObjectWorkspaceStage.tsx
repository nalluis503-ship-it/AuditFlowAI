import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
} from 'react'
import {
  useWorkspaceSources,
  type WorkspaceSource,
} from '../WorkspaceSources'
import {
  useObjectWorkspace,
} from './useObjectWorkspace'
import type {
  WorkspaceObject,
} from './objectWorkspaceTypes'
import './ObjectWorkspaceStage.css'

type ObjectWorkspaceStageProps = {
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

const statusLabels: Record<
  WorkspaceObject['status'],
  string
> = {
  available: 'Disponible',
  queued: 'En cola',
  processing: 'Procesando',
  ready: 'Procesado',
  failed: 'Error',
  draft: 'Borrador',
  warning: 'No disponible',
}


function summarizeSource(source: WorkspaceSource) {
  if (!source.profile) {
    return {
      rows: 0,
      columns: 0,
      nulls: 0,
      duplicates: 0,
    }
  }

  return source.profile.sheets.reduce(
    (summary, sheet) => ({
      rows: summary.rows + sheet.row_count,
      columns: summary.columns + sheet.column_count,
      nulls:
        summary.nulls
        + sheet.columns.reduce(
          (total, column) => total + column.null_count,
          0,
        ),
      duplicates:
        summary.duplicates + sheet.duplicate_row_count,
    }),
    {
      rows: 0,
      columns: 0,
      nulls: 0,
      duplicates: 0,
    },
  )
}

function sourceToWorkspaceObject(
  source: WorkspaceSource,
): WorkspaceObject {
  const summary = summarizeSource(source)
  const statusMap: Record<
    WorkspaceSource['status'],
    WorkspaceObject['status']
  > = {
    queued: 'queued',
    uploading: 'processing',
    ready: 'ready',
    failed: 'failed',
  }

  const subtitle =
    source.status === 'queued'
      ? 'En cola para ingestión real'
      : source.status === 'uploading'
        ? 'Almacenando y perfilando en el backend'
        : source.status === 'failed'
          ? source.error ?? 'La ingestión falló'
          : `${source.profile?.sheets.length ?? 0} ${source.profile?.sheets.length === 1 ? 'hoja' : 'hojas'} · ${summary.rows.toLocaleString('es-MX')} filas de datos`

  return {
    id: `source-${source.localId}`,
    kind: 'source',
    title: source.profile?.original_name ?? source.name,
    subtitle,
    status: statusMap[source.status],
    position: { x: 70, y: 45 },
    isOnStage: false,
    isHidden: false,
    format: source.profile?.extension ?? source.extension,
    sourceId: source.profile?.id,
    sourceProfile: source.profile,
    previewLines: source.profile
      ? [
          `${summary.columns.toLocaleString('es-MX')} columnas detectadas`,
          `${summary.nulls.toLocaleString('es-MX')} celdas vacías`,
          `${summary.duplicates.toLocaleString('es-MX')} filas duplicadas exactas`,
        ]
      : undefined,
    createdAt: source.createdAt,
  }
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

      {object.sourceProfile && (
        <dl>
          <div>
            <dt>Estado</dt>
            <dd>Perfilado real completado</dd>
          </div>
          <div>
            <dt>ID fuente</dt>
            <dd>{object.sourceProfile.id}</dd>
          </div>
          <div>
            <dt>SHA-256</dt>
            <dd>{object.sourceProfile.sha256}</dd>
          </div>
          <div>
            <dt>Hojas</dt>
            <dd>{object.sourceProfile.sheets.length}</dd>
          </div>
          <div>
            <dt>Almacenado</dt>
            <dd>
              {new Date(
                object.sourceProfile.stored_at,
              ).toLocaleString('es-MX')}
            </dd>
          </div>
        </dl>
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
            : 'Ver junto'}
        </button>
      </div>
    </article>
  )
}

export default function ObjectWorkspaceStage({
  onOpenTechnical,
}: ObjectWorkspaceStageProps) {
  const [prompt, setPrompt] =
    useState('')

  const [rejectedFiles, setRejectedFiles] =
    useState<{ name: string; reason: string }[]>([])

  const [
    transcriptOpen,
    setTranscriptOpen,
  ] = useState(false)

  const fileInputRef =
    useRef<HTMLInputElement>(null)

  const {
    sources,
    ingestFiles,
  } = useWorkspaceSources()

  const sourceObjects = useMemo(
    () => sources.map(sourceToWorkspaceObject),
    [sources],
  )

  const workspace = useObjectWorkspace(sourceObjects)

  const handleSubmit = () => {
    const cleanPrompt = prompt.trim()

    if (!cleanPrompt) {
      return
    }

    workspace.submitPrompt(cleanPrompt)
    setTranscriptOpen(false)
    setPrompt('')
  }

  const handleFiles = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    if (files.length === 0) return

    const result = await ingestFiles(files)
    setRejectedFiles(result.rejected)
  }

  const regularObjects =
    workspace.objects.filter(
      (object) => object.kind !== 'tool',
    )

  const readySourceCount = sources.filter(
    (source) => source.status === 'ready',
  ).length

  const processingSourceCount = sources.filter(
    (source) =>
      source.status === 'queued'
      || source.status === 'uploading',
  ).length

  const failedSourceCount = sources.filter(
    (source) => source.status === 'failed',
  ).length

  const coreStatus =
    processingSourceCount > 0
      ? `${processingSourceCount} fuente${processingSourceCount === 1 ? '' : 's'} procesando`
      : readySourceCount > 0
        ? `${readySourceCount} fuente${readySourceCount === 1 ? '' : 's'} real${readySourceCount === 1 ? '' : 'es'} disponible${readySourceCount === 1 ? '' : 's'}`
        : failedSourceCount > 0
          ? 'fuentes con error de ingestión'
          : 'esperando fuentes'

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
        aria-label="Núcleo de análisis"
      >
        <span>AF</span>
        <strong>AuditFlow</strong>
        <small>{coreStatus}</small>
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
          Subir fuentes
        </button>

        <button
          type="button"
          onClick={onOpenTechnical}
        >
          Vista técnica
        </button>
      </div>

      {rejectedFiles.length > 0 && (
        <div className="ow-upload-rejections" role="status">
          <div>
            <strong>Algunos archivos no se agregaron</strong>
            <ul>
              {rejectedFiles.map((file) => (
                <li key={`${file.name}-${file.reason}`}>
                  {file.name}: {file.reason}
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => setRejectedFiles([])}
            aria-label="Cerrar aviso de archivos rechazados"
          >
            ×
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        className="ow-hidden-input"
        type="file"
        multiple
        accept=".xlsx,.csv"
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
              Las fuentes permanecen en la bandeja hasta que el auditor decide llevarlas al campo.
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
                  Agregar a vista conjunta
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
                Vista conjunta
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
              Cerrar vista conjunta
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
              Objetos reales disponibles
            </span>
            <strong>
              Fuentes procesadas y resultados verificables
            </strong>
          </div>

          <button
            type="button"
            aria-label="Cerrar objetos disponibles"
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
              Sube un archivo CSV o XLSX para registrarlo como fuente real.
            </p>
          )}

          {regularObjects.map(
            (object) => (
              <article
                key={object.id}
                className="ow-shelf-item"
              >
                <div className="ow-shelf-item-topline">
                  <span>
                    {
                      kindLabels[
                        object.kind
                      ]
                    }
                  </span>

                  <b data-status={object.status}>
                    {statusLabels[object.status]}
                  </b>
                </div>

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
            <div className="ow-transcript-header">
              <div>
                <span>Historial de solicitudes</span>
                <small>Registro informativo; no forma parte de los objetos.</small>
              </div>

              <button
                type="button"
                onClick={() => setTranscriptOpen(false)}
                aria-label="Cerrar historial"
              >
                ×
              </button>
            </div>

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
          <span>AF</span>

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
            placeholder="Describe la tarea; quedará pendiente hasta contar con un ejecutor real."
          />

          <button
            type="button"
            onClick={handleSubmit}
          >
            Registrar
          </button>
        </div>
      </section>
    </section>
  )
}
