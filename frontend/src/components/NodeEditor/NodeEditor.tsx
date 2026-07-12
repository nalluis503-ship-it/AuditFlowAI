import { useState } from 'react'
import type { AuditFlowNode } from '../WorkflowNode'
import {
  getNodeActionExperience,
  type NodeEditorField,
} from '../../data/nodeActionRegistry'
import { getToolAvailability } from '../../data/toolAvailability'
import './NodeEditor.css'

type NodeEditorProps = {
  node: AuditFlowNode
  onClose: () => void
  onSuggestNextNode: (nodeId: string) => void
}

type EditorTab = 'config' | 'trace'

const tabLabels: Record<EditorTab, string> = {
  config: 'Diseño',
  trace: 'Trazabilidad esperada',
}

function describeField(field: NodeEditorField) {
  if (field.type === 'file') {
    return 'Usar una fuente registrada desde la Mesa de análisis.'
  }

  if (field.type === 'select' || field.type === 'checkbox-group') {
    return field.options.join(' · ')
  }

  return field.placeholder
}

function renderField(field: NodeEditorField) {
  return (
    <article key={field.id} className="node-editor-requirement">
      <span>{field.label}</span>
      <strong>{describeField(field)}</strong>
      <small>{field.helper}</small>

      {field.type === 'file' && (
        <p>
          Los nodos no cargan archivos por separado. La asociación real
          utilizará el source_id de una fuente ya procesada.
        </p>
      )}
    </article>
  )
}

function NodeEditor({
  node,
  onClose,
  onSuggestNextNode,
}: NodeEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('config')

  const experience = getNodeActionExperience({
    title: node.data.title,
    description: node.data.description,
    toolId: node.data.toolId,
    actionId: node.data.actionId,
    outputType: node.data.outputType,
  })

  const availability = getToolAvailability(node.data.toolId)

  return (
    <aside
      className="node-editor-panel node-editor-design-mode"
      aria-label={`Diseño técnico: ${experience.title}`}
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

            <span className="node-editor-design-badge">
              Modo diseño
            </span>
          </div>

          <small>{node.data.title}</small>
        </div>

        <button
          type="button"
          className="node-editor-close"
          onClick={onClose}
          aria-label="Cerrar diseño del nodo"
          title="Cerrar"
        >
          ×
        </button>
      </header>

      <div className="node-editor-design-state">
        <div className="node-editor-live-orb">◇</div>

        <div>
          <strong>Diseño técnico, sin ejecución</strong>
          <small>
            Este nodo documenta intención, requisitos y salida esperada.
            No procesa datos ni genera resultados.
          </small>
        </div>
      </div>

      <div className="node-editor-capability-state">
        <b data-status={availability.status}>{availability.label}</b>
        <p>{availability.description}</p>
      </div>

      <nav className="node-editor-tabs" aria-label="Secciones del diseño">
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
              <span>Acción propuesta</span>
              <strong>{experience.title}</strong>
              <p>{experience.actionDescription}</p>
            </div>

            <div className="node-editor-section">
              <h3>{experience.configurationTitle}</h3>

              {experience.fields.length > 0 ? (
                <div className="node-editor-fields">
                  {experience.fields.map(renderField)}
                </div>
              ) : (
                <div className="node-editor-empty-config">
                  <strong>Sin requisitos definidos</strong>
                  <small>
                    Los parámetros se especificarán cuando exista una capacidad backend real.
                  </small>
                </div>
              )}
            </div>

            <div className="node-editor-section">
              <h3>Salida esperada</h3>
              <p>{experience.expectedResult}</p>
            </div>
          </div>
        )}

        {activeTab === 'trace' && (
          <div className="node-editor-tab-content">
            <div className="trace-map-card">
              <strong>Trazabilidad esperada</strong>
              <p>
                Cuando exista un ejecutor, cada resultado deberá vincularse
                con source_id, archivo, hoja, fila, regla aplicada y ejecución.
              </p>
            </div>

            <div className="node-editor-empty-result">
              <strong>Sin trazabilidad de ejecución</strong>
              <small>
                En modo de diseño no se generan evidencias, métricas ni resultados.
              </small>
            </div>
          </div>
        )}
      </section>

      <footer className="node-editor-footer">
        <button
          type="button"
          className="node-editor-primary"
          onClick={() => onSuggestNextNode(node.id)}
        >
          Conectar siguiente paso del diseño
        </button>
      </footer>
    </aside>
  )
}

export default NodeEditor
