import { useState, type ChangeEvent } from 'react'
import './GuidedDataStage.css'

type RegisteredSource = {
  id: string
  name: string
  extension: string
  size: number
  mimeType: string
  lastModified: number
}

const supportedExtensions = new Set(['xlsx', 'csv'])

function getFileExtension(fileName: string) {
  const segments = fileName.toLowerCase().split('.')

  return segments.length > 1
    ? segments.at(-1) ?? ''
    : ''
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function createRegisteredSource(
  file: File,
  index: number,
): RegisteredSource {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
    name: file.name,
    extension: getFileExtension(file.name) || 'sin extensión',
    size: file.size,
    mimeType: file.type || 'no informado por el navegador',
    lastModified: file.lastModified,
  }
}

export default function GuidedDataStage() {
  const [sources, setSources] = useState<RegisteredSource[]>([])
  const [selectedSourceId, setSelectedSourceId] =
    useState<string | null>(null)
  const [rejectedFiles, setRejectedFiles] = useState<string[]>([])

  const selectedSource =
    sources.find((source) => source.id === selectedSourceId)
    ?? sources[0]

  const handleFilesSelected = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files ?? [])

    const acceptedFiles = files.filter((file) =>
      supportedExtensions.has(getFileExtension(file.name)),
    )

    const rejected = files
      .filter(
        (file) =>
          !supportedExtensions.has(getFileExtension(file.name)),
      )
      .map((file) => file.name)

    const registeredSources =
      acceptedFiles.map(createRegisteredSource)

    setSources(registeredSources)
    setSelectedSourceId(registeredSources[0]?.id ?? null)
    setRejectedFiles(rejected)

    event.target.value = ''
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

          <h2>Registra archivos reales antes de analizarlos</h2>

          <p>
            Esta etapa solo muestra metadatos proporcionados por el
            navegador. AuditFlow no inventa columnas, registros,
            relaciones ni resultados.
          </p>
        </div>

        <label className="guided-stage-upload">
          <input
            type="file"
            multiple
            accept=".xlsx,.csv"
            onChange={handleFilesSelected}
          />

          <strong>Seleccionar fuentes</strong>
          <span>Excel XLSX o CSV ? sin procesamiento todavía</span>
        </label>
      </header>

      {rejectedFiles.length > 0 && (
        <div className="guided-stage-empty" role="status">
          <div>
            <strong>Archivos no admitidos</strong>
            <p>{rejectedFiles.join(', ')}</p>
          </div>
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
              El siguiente checkpoint conectará esta vista con el
              backend para almacenar, identificar y perfilar archivos
              de manera verificable.
            </p>
          </div>
        </div>
      ) : (
        <div className="guided-stage-workspace">
          <div className="guided-stage-files">
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                className={`guided-file-card ${
                  source.id === selectedSource?.id ? 'active' : ''
                }`}
                onClick={() => setSelectedSourceId(source.id)}
              >
                <span className="guided-file-type">
                  {source.extension.toUpperCase()}
                </span>

                <strong>{source.name}</strong>
                <small>{formatFileSize(source.size)}</small>

                <div className="guided-file-columns">
                  <span>Pendiente de procesamiento</span>
                </div>
              </button>
            ))}
          </div>

          <div className="guided-stage-detail">
            {selectedSource && (
              <>
                <div className="guided-detail-header">
                  <div>
                    <span>Fuente registrada</span>
                    <h3>{selectedSource.name}</h3>
                  </div>

                  <div className="guided-detail-metrics">
                    <strong>
                      {formatFileSize(selectedSource.size)}
                    </strong>
                    <small>tamaño real</small>
                  </div>
                </div>

                <div className="guided-detail-grid">
                  <article>
                    <h4>Metadatos disponibles</h4>

                    <ul className="guided-alert-list">
                      <li>
                        Extensión: {selectedSource.extension}
                      </li>

                      <li>
                        Tipo MIME: {selectedSource.mimeType}
                      </li>

                      <li>
                        Última modificación:{' '}
                        {new Date(
                          selectedSource.lastModified,
                        ).toLocaleString('es-MX')}
                      </li>
                    </ul>
                  </article>

                  <article>
                    <h4>Estado del procesamiento</h4>

                    <ul className="guided-alert-list">
                      <li>
                        El archivo aún no se ha enviado al backend.
                      </li>

                      <li>
                        No se han leído hojas, columnas ni registros.
                      </li>

                      <li>
                        No existe ningún resultado de auditoría
                        generado.
                      </li>
                    </ul>
                  </article>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
