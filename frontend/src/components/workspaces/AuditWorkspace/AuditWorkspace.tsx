import type { ReactNode } from 'react'
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
  return (
    <main className="audit-workspace" data-focus={activeFocus}>
      <div className="audit-workspace-background" />

      <header className="audit-workspace-header">
        <div className="audit-workspace-brand">
          <div className="audit-workspace-logo">AF</div>
          <div>
            <span>AuditFlow AI</span>
            <h1>Campo inteligente de auditoría</h1>
          </div>
        </div>

        <div className="audit-workspace-command-bar">
          <span>IA</span>
          <input placeholder="Describe qué quieres analizar, revisar o generar..." />
        </div>

        <div className="audit-workspace-actions">
          <button type="button" onClick={onOpenTools}>Herramientas</button>
          <button type="button" onClick={onRunWorkflow}>Ejecutar</button>
        </div>
      </header>

      <section className="audit-workspace-body">
        <aside className="audit-workspace-rail" aria-label="Capas del campo de trabajo">
          {(Object.keys(focusLabels) as AuditWorkspaceFocus[]).map((focus) => (
            <button
              key={focus}
              type="button"
              className={activeFocus === focus ? 'active' : undefined}
              onClick={() => onFocusChange(focus)}
            >
              <span>{focusLabels[focus].slice(0, 2).toUpperCase()}</span>
              <small>{focusLabels[focus]}</small>
            </button>
          ))}
        </aside>

        <section className="audit-workspace-surface" aria-label="Superficie viva de auditoría">
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

        <aside className="audit-workspace-context">
          <section>
            <span>Contexto activo</span>
            <strong>{focusLabels[activeFocus]}</strong>
            <p>
              La IA acomoda el campo de trabajo según la intención del auditor. El flujo técnico existe,
              pero no obliga al usuario a operar con nodos.
            </p>
          </section>

          <section className="audit-workspace-metrics">
            <article>
              <span>Fuentes</span>
              <strong>{dataSourceCount}</strong>
            </article>
            <article>
              <span>Nodos</span>
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
              <li>Los nodos explican técnicamente.</li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default AuditWorkspace
