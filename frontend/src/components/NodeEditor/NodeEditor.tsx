import type { ChangeEvent } from 'react'
import type {
  AuditFlowNode,
  NodeExecutionStatus,
  NodeFileMeta,
} from '../WorkflowNode'
import './NodeEditor.css'

type NodeEditorProps = {
  node: AuditFlowNode
  onClose: () => void
  onAttachFiles: (nodeId: string, files: NodeFileMeta[]) => void
  onSuggestNextNode: (nodeId: string) => void
}

const statusLabel: Record<NodeExecutionStatus, string> = {
  idle: 'Sin ejecutar',
  pending: 'Pendiente',
  running: 'Ejecutando',
  success: 'Correcto',
  warning: 'Requiere revisión',
  error: 'Error',
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function isFileInputNode(node: AuditFlowNode) {
  const value = `${node.data.title} ${node.data.description} ${node.data.toolId ?? ''} ${node.data.actionId ?? ''}`.toLowerCase()

  return (
    value.includes('archivo') ||
    value.includes('excel') ||
    value.includes('pdf') ||
    value.includes('upload') ||
    value.includes('cargar') ||
    value.includes('subir')
  )
}

function getExpectedResult(node: AuditFlowNode) {
  if (isFileInputNode(node)) {
    return 'Archivo o conjunto de archivos disponible para perfilado, vista previa y análisis inteligente.'
  }

  if (node.data.outputType === 'sqlDataset') {
    return 'Conjunto de datos consultable para perfilado, cruces y validaciones.'
  }

  if (node.data.outputType === 'auditResult') {
    return 'Resultado de auditoría con hallazgos, advertencias y trazabilidad.'
  }

  if (node.data.outputType === 'report') {
    return 'Reporte generado con resumen, evidencias y resultados exportables.'
  }

  return 'Salida disponible para continuar el flujo con el siguiente nodo compatible.'
}

function NodeEditor({
  node,
  onClose,
  onAttachFiles,
  onSuggestNextNode,
}: NodeEditorProps) {
  const status = node.data.status ?? 'idle'
  const files = node.data.files ?? []
  const canUploadFiles = isFileInputNode(node)
  const hasResults = Boolean(node.data.resultSummary?.length || files.length)

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? [])

    const fileMetadata: NodeFileMeta[] = selectedFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}-${file.size}`,
      name: file.name,
      size: file.size,
      type: file.type || 'Archivo',
      lastModified: file.lastModified,
    }))

    onAttachFiles(node.id, fileMetadata)
    event.target.value = ''
  }

  return (
    <aside className="node-editor-panel" onClick={(event) => event.stopPropagation()}>
      <header className="node-editor-header">
        <div className={`node-editor-icon ${node.data.variant}`}>
          {node.data.icon}
        </div>

        <div>
          <strong>{node.data.title}</strong>
          <small>{node.data.description}</small>
        </div>

        <button
          className="node-editor-close"
          onClick={onClose}
          title="Cerrar"
        >
          ×
        </button>
      </header>

      <section className="node-editor-body">
        <div className="node-editor-status-card">
          <span className={`node-editor-status-dot ${status}`} />
          <div>
            <small>Estado del nodo</small>
            <strong>{statusLabel[status]}</strong>
          </div>
        </div>

        <div className="node-editor-section">
          <h3>Acción del nodo</h3>
          <p>{node.data.description}</p>
        </div>

        <div className="node-editor-section">
          <h3>Configuración</h3>

          {canUploadFiles ? (
            <label className="node-file-dropzone">
              <input
                type="file"
                multiple
                onChange={handleFiles}
              />

              <span className="node-file-upload-icon">⇧</span>
              <strong>Seleccionar archivos</strong>
              <small>También puede recibir varios archivos para análisis conjunto.</small>
            </label>
          ) : (
            <div className="node-editor-empty-config">
              <strong>Configuración pendiente</strong>
              <small>Este nodo podrá configurar parámetros, campos, reglas o conexiones según su herramienta.</small>
            </div>
          )}
        </div>

        <div className="node-editor-section">
          <h3>Resultado esperado</h3>
          <p>{getExpectedResult(node)}</p>
        </div>

        <div className="node-editor-section">
          <h3>Resultados del nodo</h3>

          {files.length > 0 && (
            <div className="node-files-list">
              {files.map((file) => (
                <article key={file.id} className="node-file-item">
                  <div className="node-file-badge">X</div>

                  <div>
                    <strong>{file.name}</strong>
                    <small>{formatFileSize(file.size)} · {file.type}</small>
                  </div>
                </article>
              ))}
            </div>
          )}

          {!hasResults && (
            <div className="node-editor-empty-result">
              <strong>Sin resultados todavía</strong>
              <small>Ejecuta o configura este nodo para ver resultados, archivos, tablas o hallazgos.</small>
            </div>
          )}

          {node.data.resultSummary && node.data.resultSummary.length > 0 && (
            <ul className="node-result-list">
              {node.data.resultSummary.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="node-ai-card">
          <strong>IA contextual del nodo</strong>
          <p>
            La IA puede ayudarte a interpretar lo configurado en este nodo y sugerir el siguiente paso.
            Si todavía no hay datos, solo recomendará acciones compatibles sin inventar resultados.
          </p>

          <button
            className="node-editor-primary"
            onClick={() => onSuggestNextNode(node.id)}
          >
            Sugerir siguiente nodo
          </button>
        </div>
      </section>
    </aside>
  )
}

export default NodeEditor
