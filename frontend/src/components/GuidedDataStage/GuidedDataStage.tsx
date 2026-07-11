import { useState, type ChangeEvent } from 'react'
import type {
  SourceProfile,
  SourceSheetProfile,
} from '../../api/sourceApi'
import {
  useWorkspaceSources,
  type WorkspaceSource,
  type WorkspaceSourceStatus,
} from '../workspaces/AuditWorkspace/WorkspaceSources'
import './GuidedDataStage.css'

type RejectedFile = {
  name: string
  reason: string
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function getStatusLabel(status: WorkspaceSourceStatus) {
  switch (status) {
    case 'queued':
      return 'En cola'
    case 'uploading':
      return 'Procesando'
    case 'ready':
      return 'Procesado'
    case 'failed':
      return 'Error'
  }
}

function getProfileSummary(profile: SourceProfile) {
  return profile.sheets.reduce(
    (summary, sheet) => ({
      rows: summary.rows + sheet.row_count,
      columns: summary.columns + sheet.column_count,
      duplicates:
        summary.duplicates + sheet.duplicate_row_count,
      nulls:
        summary.nulls
        + sheet.columns.reduce(
          (total, column) => total + column.null_count,
          0,
        ),
    }),
    {
      rows: 0,
      columns: 0,
      duplicates: 0,
      nulls: 0,
    },
  )
}

function getSelectedSheet(
  profile: SourceProfile,
  selectedSheetName: string | null,
): SourceSheetProfile | undefined {
  return (
    profile.sheets.find(
      (sheet) => sheet.name === selectedSheetName,
    )
    ?? profile.sheets[0]
  )
}

export default function GuidedDataStage() {
  const {
    sources,
    selectedSourceId,
    isProcessing,
    ingestFiles,
    selectSource,
  } = useWorkspaceSources()
  const [selectedSheetName, setSelectedSheetName] =
    useState<string | null>(null)
  const [rejectedFiles, setRejectedFiles] =
    useState<RejectedFile[]>([])

  const selectedSource =
    sources.find(
      (source) => source.localId === selectedSourceId,
    )
    ?? sources[0]

  const handleFilesSelected = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''

    void ingestFiles(files).then((result) => {
      setRejectedFiles(result.rejected)

      if (result.acceptedIds.length > 0) {
        setSelectedSheetName(null)
      }
    })
  }

  const handleSourceSelected = (
    source: WorkspaceSource,
  ) => {
    selectSource(source.localId)
    setSelectedSheetName(null)
  }

  const renderSourceDetail = () => {
    if (!selectedSource) return null

    if (
      selectedSource.status === 'queued'
      || selectedSource.status === 'uploading'
    ) {
      return (
        <div
          className="guided-processing-state"
          role="status"
          aria-live="polite"
        >
          <div className="guided-processing-pulse" />

          <div>
            <strong>
              {selectedSource.status === 'queued'
                ? 'Archivo en cola'
                : 'AuditFlow está perfilando la fuente'}
            </strong>

            <p>
              El archivo será almacenado, identificado mediante
              SHA-256 y leído por el backend. Todavía no se muestran
              resultados parciales ni estimados.
            </p>
          </div>
        </div>
      )
    }

    if (selectedSource.status === 'failed') {
      return (
        <div className="guided-error-box" role="alert">
          <strong>No fue posible procesar la fuente</strong>
          <p>
            {selectedSource.error
              ?? 'El backend no devolvió un resultado utilizable.'}
          </p>
        </div>
      )
    }

    const profile = selectedSource.profile

    if (!profile) {
      return (
        <div className="guided-error-box" role="alert">
          <strong>Perfil no disponible</strong>
          <p>
            El archivo terminó sin un perfil técnico verificable.
          </p>
        </div>
      )
    }

    const summary = getProfileSummary(profile)
    const selectedSheet = getSelectedSheet(
      profile,
      selectedSheetName,
    )

    return (
      <>
        <div className="guided-detail-summary">
          <article className="guided-metric-card">
            <span>Hojas</span>
            <strong>{profile.sheets.length}</strong>
          </article>

          <article className="guided-metric-card">
            <span>Filas</span>
            <strong>{summary.rows.toLocaleString('es-MX')}</strong>
          </article>

          <article className="guided-metric-card">
            <span>Columnas</span>
            <strong>
              {summary.columns.toLocaleString('es-MX')}
            </strong>
          </article>

          <article className="guided-metric-card">
            <span>Nulos</span>
            <strong>{summary.nulls.toLocaleString('es-MX')}</strong>
          </article>

          <article className="guided-metric-card">
            <span>Duplicados</span>
            <strong>
              {summary.duplicates.toLocaleString('es-MX')}
            </strong>
          </article>
        </div>

        <div className="guided-detail-grid">
          <article>
            <h4>Trazabilidad de la fuente</h4>

            <ul className="guided-alert-list">
              <li>
                Identificador interno:
                <code className="guided-trace-code">
                  {profile.id}
                </code>
              </li>

              <li>
                SHA-256:
                <code className="guided-trace-code">
                  {profile.sha256}
                </code>
              </li>

              <li>
                Tipo MIME: {profile.media_type ?? 'no informado'}
              </li>

              <li>
                Almacenado:{' '}
                {new Date(profile.stored_at).toLocaleString(
                  'es-MX',
                )}
              </li>
            </ul>
          </article>

          <article>
            <h4>Resultado verificable</h4>

            <ul className="guided-alert-list">
              <li>
                El backend almacenó y perfiló el archivo real.
              </li>

              <li>
                Los conteos corresponden al contenido recibido.
              </li>

              <li>
                Aún no se han generado hallazgos ni conclusiones de
                auditoría.
              </li>
            </ul>
          </article>
        </div>

        {profile.sheets.length > 0 && (
          <section className="guided-columns-panel">
            <div className="guided-sheet-selector">
              {profile.sheets.map((sheet) => (
                <button
                  key={sheet.name}
                  type="button"
                  className={
                    sheet.name === selectedSheet?.name
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setSelectedSheetName(sheet.name)
                  }
                >
                  {sheet.name}
                </button>
              ))}
            </div>

            {selectedSheet && (
              <>
                <div className="guided-sheet-heading">
                  <div>
                    <span>Hoja perfilada</span>
                    <h4>{selectedSheet.name}</h4>
                  </div>

                  <small>
                    Encabezado en fila{' '}
                    {selectedSheet.header_row_number ?? 'no detectado'}
                  </small>
                </div>

                <div className="guided-column-list">
                  {selectedSheet.columns.map((column) => (
                    <div
                      key={`${selectedSheet.name}-${column.position}`}
                      className="guided-column-row"
                    >
                      <div>
                        <strong>{column.name}</strong>
                        <small>
                          Posición {column.position} ·{' '}
                          {column.non_null_count.toLocaleString(
                            'es-MX',
                          )}{' '}
                          valores
                        </small>
                      </div>

                      <span>
                        {column.null_count.toLocaleString('es-MX')}{' '}
                        nulos
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}
      </>
    )
  }

  return (
    <section
      className="guided-data-stage"
      aria-label="Fuentes de auditoría"
    >
      <div className="guided-stage-backdrop" />

      <header className="guided-stage-hero">
        <div>
          <span className="guided-stage-kicker">
            Fuentes de auditoría
          </span>

          <h2>Carga y perfila evidencia real</h2>

          <p>
            Cada archivo se envía al backend para almacenarlo,
            calcular su SHA-256 y obtener hojas, filas, columnas,
            nulos y duplicados reales. AuditFlow no inventa
            resultados.
          </p>
        </div>

        <label
          className={`guided-stage-upload ${
            isProcessing ? 'disabled' : ''
          }`}
        >
          <input
            type="file"
            multiple
            accept=".xlsx,.csv"
            disabled={isProcessing}
            onChange={handleFilesSelected}
          />

          <strong>
            {isProcessing
              ? 'Procesando fuentes'
              : 'Seleccionar fuentes'}
          </strong>

          <span>
            Excel XLSX o CSV · máximo 25 MB por archivo
          </span>
        </label>
      </header>

      {rejectedFiles.length > 0 && (
        <div className="guided-stage-rejected" role="status">
          <strong>Archivos no admitidos</strong>

          <ul>
            {rejectedFiles.map((file) => (
              <li key={`${file.name}-${file.reason}`}>
                {file.name}: {file.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {sources.length === 0 ? (
        <div className="guided-stage-empty">
          <div className="guided-stage-orbit">
            <span />
            <span />
            <span />
          </div>

          <div>
            <strong>No hay fuentes registradas</strong>

            <p>
              Selecciona uno o varios archivos para iniciar una
              ingestión real y trazable desde la Mesa de análisis.
            </p>
          </div>
        </div>
      ) : (
        <div className="guided-stage-workspace">
          <div className="guided-stage-files">
            {sources.map((source) => (
              <button
                key={source.localId}
                type="button"
                className={`guided-file-card ${
                  source.localId === selectedSource?.localId
                    ? 'active'
                    : ''
                } ${source.status}`}
                onClick={() => handleSourceSelected(source)}
              >
                <div className="guided-file-card-topline">
                  <span className="guided-file-type">
                    {(
                      source.profile?.extension
                      ?? source.extension
                    ).toUpperCase()}
                  </span>

                  <span
                    className={`guided-file-status ${source.status}`}
                  >
                    {getStatusLabel(source.status)}
                  </span>
                </div>

                <strong>
                  {source.profile?.original_name ?? source.name}
                </strong>

                <small>
                  {formatFileSize(
                    source.profile?.size_bytes ?? source.size,
                  )}
                </small>

                <div className="guided-file-columns">
                  {source.profile ? (
                    <>
                      <span>
                        {source.profile.sheets.length} hojas
                      </span>
                      <span>
                        {
                          getProfileSummary(source.profile).rows
                        } filas
                      </span>
                    </>
                  ) : (
                    <span>
                      {source.status === 'failed'
                        ? 'Requiere revisión'
                        : 'Pendiente de resultado'}
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="guided-stage-detail">
            {selectedSource && (
              <>
                <div className="guided-detail-header">
                  <div>
                    <span>Fuente de auditoría</span>
                    <h3>
                      {selectedSource.profile?.original_name
                        ?? selectedSource.name}
                    </h3>
                  </div>

                  <div className="guided-detail-metrics">
                    <strong>
                      {formatFileSize(
                        selectedSource.profile?.size_bytes
                        ?? selectedSource.size,
                      )}
                    </strong>
                    <small>tamaño recibido</small>
                  </div>
                </div>

                {renderSourceDetail()}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
