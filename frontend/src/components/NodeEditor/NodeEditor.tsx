import { useState, type ChangeEvent } from 'react'
import type {
  AuditFlowNode,
  NodeExecutionStatus,
  NodeFileMeta,
} from '../WorkflowNode'
import {
  getNodeActionExperience,
  type NodeEditorField,
} from '../../data/nodeActionRegistry'
import NodeAssistant from '../NodeAssistant'
import './NodeEditor.css'

type NodeEditorProps = {
  node: AuditFlowNode
  onClose: () => void
  onAttachFiles: (nodeId: string, files: NodeFileMeta[]) => void
  onSuggestNextNode: (nodeId: string) => void
  onRunNode: (nodeId: string) => void
}

type EditorTab = 'config' | 'execution' | 'results' | 'trace' | 'ai'

const statusLabel: Record<NodeExecutionStatus, string> = {
  idle: 'Sin ejecutar',
  pending: 'Pendiente',
  running: 'Ejecutando',
  success: 'Correcto',
  warning: 'Requiere revisión',
  error: 'Error',
}

const statusIcon: Record<NodeExecutionStatus, string> = {
  idle: '○',
  pending: '…',
  running: '↻',
  success: '✓',
  warning: '!',
  error: '×',
}

const statusDescription: Record<NodeExecutionStatus, string> = {
  idle: 'El nodo está listo para configurarse o ejecutarse.',
  pending: 'El nodo está esperando ejecución.',
  running: 'El nodo está procesando la acción configurada.',
  success: 'El nodo terminó correctamente y generó salida.',
  warning: 'El nodo requiere atención antes de continuar.',
  error: 'El nodo falló durante la ejecución.',
}

const tabLabels: Record<EditorTab, string> = {
  config: 'Configuración',
  execution: 'Ejecución',
  results: 'Resultados',
  trace: 'Trazabilidad',
  ai: 'IA',
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function renderField(
  field: NodeEditorField,
  node: AuditFlowNode,
  onAttachFiles: (nodeId: string, files: NodeFileMeta[]) => void,
) {
  if (field.type === 'file') {
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
      <label key={field.id} className="node-file-dropzone">
        <input
          type="file"
          multiple={field.multiple}
          accept={field.accept}
          onChange={handleFiles}
        />

        <span className="node-file-upload-icon">⇧</span>
        <strong>{field.label}</strong>
        <small>{field.helper}</small>
      </label>
    )
  }

  if (field.type === 'select') {
    return (
      <label key={field.id} className="node-editor-control">
        <span>{field.label}</span>
        <select defaultValue="">
          <option value="" disabled>
            Selecciona una opción
          </option>
          {field.options.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
        <small>{field.helper}</small>
      </label>
    )
  }

  if (field.type === 'text') {
    return (
      <label key={field.id} className="node-editor-control">
        <span>{field.label}</span>
        <input placeholder={field.placeholder} />
        <small>{field.helper}</small>
      </label>
    )
  }

  return (
    <div key={field.id} className="node-editor-control">
      <span>{field.label}</span>

      <div className="node-checkbox-list">
        {field.options.map((option) => (
          <label key={option}>
            <input type="checkbox" />
            <small>{option}</small>
          </label>
        ))}
      </div>

      <small>{field.helper}</small>
    </div>
  )
}

function NodeEditor({
  node,
  onClose,
  onAttachFiles,
  onSuggestNextNode,
  onRunNode,
}: NodeEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('config')
  const status = node.data.status ?? 'idle'
  const files = node.data.files ?? []
  const resultSummary = node.data.resultSummary ?? []

  const experience = getNodeActionExperience({
    title: node.data.title,
    description: node.data.description,
    toolId: node.data.toolId,
    actionId: node.data.actionId,
    outputType: node.data.outputType,
  })

  const hasResults = files.length > 0 || resultSummary.length > 0 || status === 'success'

  return (
    <aside
      className={`node-editor-panel node-editor-status-${status}`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="node-editor-animated-border" />

      <header className="node-editor-header">
        <div className={`node-editor-icon ${node.data.variant}`}>
          {node.data.icon}
        </div>

        <div className="node-editor-title-block">
          <div className="node-editor-title-row">
            <strong>{experience.title}</strong>

            <span className={`node-editor-state-badge ${status}`}>
              {statusIcon[status]} {statusLabel[status]}
            </span>
          </div>

          <small>{node.data.title}</small>
        </div>

        <button
          type="button"
          className="node-editor-close"
          onClick={onClose}
          title="Cerrar"
        >
          ×
        </button>
      </header>

      <div className={`node-editor-live-state ${status}`}>
        <div className="node-editor-live-orb">
          {statusIcon[status]}
        </div>

        <div>
          <strong>{statusLabel[status]}</strong>
          <small>{statusDescription[status]}</small>
        </div>
      </div>

      <nav className="node-editor-tabs">
        {(Object.keys(tabLabels) as EditorTab[]).map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tabLabels[tab]}
          </button>
        ))}
      </nav>

      <section className="node-editor-body">
        {activeTab === 'config' && (
          <div className="node-editor-tab-content">
            <div className="node-editor-hero-card">
              <span>Acción</span>
              <strong>{experience.title}</strong>
              <p>{experience.actionDescription}</p>
            </div>

            <div className="node-editor-section">
              <h3>{experience.configurationTitle}</h3>

              {experience.fields.length > 0 ? (
                <div className="node-editor-fields">
                  {experience.fields.map((field) =>
                    renderField(field, node, onAttachFiles),
                  )}
                </div>
              ) : (
                <div className="node-editor-empty-config">
                  <strong>Configuración flexible</strong>
                  <small>
                    Este nodo no requiere campos obligatorios todavía. La IA puede sugerir cómo
                    parametrizarlo según el flujo.
                  </small>
                </div>
              )}
            </div>

            <div className="node-editor-section">
              <h3>Resultado esperado</h3>
              <p>{experience.expectedResult}</p>
            </div>
          </div>
        )}

        {activeTab === 'execution' && (
          <div className="node-editor-tab-content">
            <div className={`node-editor-status-card ${status}`}>
              <span className={`node-editor-status-dot ${status}`} />

              <div>
                <small>Estado del nodo</small>
                <strong>{statusLabel[status]}</strong>
              </div>
            </div>

            <div className="execution-timeline">
              <article className={status !== 'idle' ? 'done' : ''}>
                <span>1</span>
                <div>
                  <strong>Configurar entrada</strong>
                  <small>Definir archivos, conexión, reglas o parámetros.</small>
                </div>
              </article>

              <article className={status === 'running' || status === 'success' ? 'done' : ''}>
                <span>2</span>
                <div>
                  <strong>Ejecutar acción</strong>
                  <small>El nodo procesa la información según su propósito.</small>
                </div>
              </article>

              <article className={status === 'success' ? 'done' : ''}>
                <span>3</span>
                <div>
                  <strong>Generar salida</strong>
                  <small>Resultados, trazabilidad o salida para el siguiente nodo.</small>
                </div>
              </article>
            </div>

            <button
              className="node-editor-primary"
              type="button"
              disabled={status === 'running'}
              onClick={() => onRunNode(node.id)}
            >
              {status === 'running' ? 'Ejecutando...' : 'Ejecutar este nodo'}
            </button>
          </div>
        )}

        {activeTab === 'results' && (
          <div className="node-editor-tab-content">
            <div className="node-editor-section">
              <h3>Resultados del nodo</h3>

              {!hasResults && (
                <div className="node-editor-empty-result">
                  <strong>Sin resultados todavía</strong>
                  <small>{experience.resultEmptyState}</small>
                </div>
              )}

              {files.length > 0 && (
                <div className="node-files-list">
                  {files.map((file) => (
                    <article key={file.id} className="node-file-item">
                      <div className="node-file-badge">F</div>

                      <div>
                        <strong>{file.name}</strong>
                        <small>{formatFileSize(file.size)} · {file.type}</small>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {resultSummary.length > 0 && (
                <ul className="node-result-list">
                  {resultSummary.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="node-editor-section">
              <h3>Lectura ejecutiva</h3>
              <p>
                Aquí se mostrará el resumen operativo del nodo: archivos cargados, tablas
                detectadas, registros analizados, hallazgos, diferencias o reporte generado,
                según la acción ejecutada.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'trace' && (
          <div className="node-editor-tab-content">
            <div className="trace-map-card">
              <strong>Trazabilidad del nodo</strong>
              <p>
                Cada resultado debe poder rastrearse a su origen: archivo, hoja, fila, tabla,
                registro, regla aplicada o evidencia documental.
              </p>
            </div>

            {files.length > 0 ? (
              <div className="trace-list">
                {files.map((file, index) => (
                  <article key={file.id}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <div>
                      <strong>{file.name}</strong>
                      <small>Origen disponible para resultados posteriores</small>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="node-editor-empty-result">
                <strong>Sin trazabilidad generada</strong>
                <small>
                  La trazabilidad aparecerá cuando este nodo produzca resultados o consuma fuentes.
                </small>
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <NodeAssistant
            experience={experience}
            nodeTitle={node.data.title}
            hasResults={hasResults}
            onSuggestNextNode={() => onSuggestNextNode(node.id)}
          />
        )}
      </section>

      <footer className="node-editor-footer">
        <button
          type="button"
          className="node-editor-secondary"
          onClick={() => setActiveTab('ai')}
        >
          🧠 Activar IA del nodo
        </button>

        <button
          type="button"
          className="node-editor-primary"
          onClick={() => onSuggestNextNode(node.id)}
        >
          Siguiente paso
        </button>
      </footer>
    </aside>
  )
}

export default NodeEditor
