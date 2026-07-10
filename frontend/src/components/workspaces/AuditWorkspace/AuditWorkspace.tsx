import {
  useState,
  type ReactNode,
} from 'react'
import type {
  CanvasAIRecommendation,
} from '../../../intelligence'
import ObjectWorkspaceStage from './ObjectWorkspace'
import './AuditWorkspace.css'

export type AuditWorkspaceFocus =
  | 'command'
  | 'data'
  | 'technical'

type AuditWorkspaceProps = {
  activeFocus: AuditWorkspaceFocus
  nodeCount: number
  edgeCount: number
  learningNeedCount: number
  dataSourceCount: number
  onFocusChange: (
    focus: AuditWorkspaceFocus,
  ) => void
  onRunWorkflow: () => void
  onOpenTools: () => void
  onCreateRecommendedFlow?: (
    recommendation: CanvasAIRecommendation,
  ) => void
  commandLayer: ReactNode
  dataLayer: ReactNode
  technicalLayer: ReactNode
  overlayLayer?: ReactNode
}

const focusLabels: Record<
  AuditWorkspaceFocus,
  string
> = {
  command: 'IA',
  data: 'Fuentes',
  technical: 'Flujo técnico',
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
  onCreateRecommendedFlow,
  commandLayer,
  dataLayer,
  technicalLayer,
  overlayLayer,
}: AuditWorkspaceProps) {
  const [
    isRailOpen,
    setIsRailOpen,
  ] = useState(false)

  const [
    isContextOpen,
    setIsContextOpen,
  ] = useState(false)

  const changeFocus = (
    focus: AuditWorkspaceFocus,
  ) => {
    onFocusChange(focus)
    setIsRailOpen(false)
  }

  return (
    <main
      className="audit-workspace"
      data-focus={activeFocus}
    >
      <div className="audit-workspace-background" />

      <header className="audit-workspace-header">
        <div className="audit-workspace-brand">
          <div className="audit-workspace-logo">
            AF
          </div>

          <div>
            <span>AuditFlow AI</span>
            <h1>
              Campo inteligente de auditoría
            </h1>
          </div>
        </div>

        <div
          className="audit-workspace-command-bar"
          aria-label="Estado del campo inteligente"
        >
          <span>IA</span>

          <div className="audit-workspace-command-copy">
            <strong>
              Centro de análisis activo
            </strong>

            <small>
              Los objetos aparecen cuando el auditor los solicita; nada invade el campo automáticamente.
            </small>
          </div>
        </div>

        <div className="audit-workspace-actions">
          <button
            type="button"
            onClick={onOpenTools}
          >
            Herramientas
          </button>

          <button
            type="button"
            onClick={onRunWorkflow}
          >
            Ejecutar
          </button>
        </div>
      </header>

      <section
        className={[
          'audit-workspace-body',
          isRailOpen
            ? 'rail-open'
            : '',
        ].join(' ')}
      >
        <button
          type="button"
          className={[
            'audit-rail-toggle',
            isRailOpen
              ? 'active'
              : '',
          ].join(' ')}
          onClick={() =>
            setIsRailOpen(
              (current) => !current,
            )
          }
        >
          <span />
          Capas
        </button>

        <aside
          className={[
            'audit-workspace-rail',
            isRailOpen
              ? 'active'
              : '',
          ].join(' ')}
          aria-label="Capas del campo de trabajo"
        >
          {(
            Object.keys(
              focusLabels,
            ) as AuditWorkspaceFocus[]
          ).map((focus) => (
            <button
              key={focus}
              type="button"
              className={
                activeFocus === focus
                  ? 'active'
                  : undefined
              }
              onClick={() =>
                changeFocus(focus)
              }
            >
              <span>
                {focusLabels[focus]
                  .slice(0, 2)
                  .toUpperCase()}
              </span>

              <small>
                {focusLabels[focus]}
              </small>
            </button>
          ))}
        </aside>

        <section
          className="audit-workspace-surface"
          aria-label="Superficie viva de auditoría"
        >
          <button
            type="button"
            className={[
              'audit-context-trigger',
              isContextOpen
                ? 'active'
                : '',
            ].join(' ')}
            onClick={() =>
              setIsContextOpen(
                (current) => !current,
              )
            }
          >
            <span />
            Contexto
          </button>

          <div
            className={[
              'audit-workspace-layer',
              'audit-command-layer',
              activeFocus === 'command'
                ? 'active'
                : '',
            ].join(' ')}
          >
            <ObjectWorkspaceStage
              onCreateRecommendedFlow={
                onCreateRecommendedFlow
              }
              onOpenTools={
                onOpenTools
              }
              onOpenTechnical={() =>
                changeFocus(
                  'technical',
                )
              }
            />

            <div
              className="audit-legacy-command-layer"
              aria-hidden="true"
            >
              {commandLayer}
            </div>
          </div>

          <div
            className={[
              'audit-workspace-layer',
              'audit-data-layer',
              activeFocus === 'data'
                ? 'active'
                : '',
            ].join(' ')}
          >
            {dataLayer}
          </div>

          <div
            className={[
              'audit-workspace-layer',
              'audit-technical-layer',
              activeFocus === 'technical'
                ? 'active'
                : '',
            ].join(' ')}
          >
            {technicalLayer}
          </div>

          {overlayLayer && (
            <div className="audit-workspace-overlays">
              {overlayLayer}
            </div>
          )}
        </section>

        <aside
          className={[
            'audit-workspace-context',
            isContextOpen
              ? 'active'
              : '',
          ].join(' ')}
        >
          <button
            type="button"
            className="audit-context-close"
            onClick={() =>
              setIsContextOpen(false)
            }
          >
            ×
          </button>

          <section>
            <span>
              Contexto activo
            </span>

            <strong>
              {
                focusLabels[
                  activeFocus
                ]
              }
            </strong>

            <p>
              El auditor controla qué objetos entran al campo, cuáles se comparan y cuáles regresan al inventario.
            </p>
          </section>

          <section className="audit-workspace-metrics">
            <article>
              <span>Fuentes</span>
              <strong>
                {dataSourceCount}
              </strong>
            </article>

            <article>
              <span>Pasos</span>
              <strong>
                {nodeCount}
              </strong>
            </article>

            <article>
              <span>Conexiones</span>
              <strong>
                {edgeCount}
              </strong>
            </article>

            <article>
              <span>Aprendizajes</span>
              <strong>
                {learningNeedCount}
              </strong>
            </article>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default AuditWorkspace
