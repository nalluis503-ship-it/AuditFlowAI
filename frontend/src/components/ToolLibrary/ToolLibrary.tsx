import { useMemo, useState } from 'react'
import {
  getToolsByCategory,
  toolCategories,
  type ToolAction,
  type ToolDefinition,
  type ToolCategory,
} from '../../data/toolCatalog'
import { getToolAvailability } from '../../data/toolAvailability'
import './ToolLibrary.css'

type LibraryView = 'categories' | 'tools' | 'actions'

type ToolLibraryProps = {
  onCreateNode: (tool: ToolDefinition, action: ToolAction) => void
  onClose: () => void
}

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function toolMatches(tool: ToolDefinition, query: string) {
  if (!query) return true

  return normalize([
    tool.name,
    tool.description,
    ...tool.capabilities,
    ...tool.actions.flatMap((action) => [
      action.name,
      action.description,
    ]),
  ].join(' ')).includes(query)
}

function actionMatches(action: ToolAction, query: string) {
  if (!query) return true

  return normalize(
    `${action.name} ${action.description}`,
  ).includes(query)
}

function ToolLibrary({ onCreateNode, onClose }: ToolLibraryProps) {
  const [view, setView] = useState<LibraryView>('categories')
  const [selectedCategory, setSelectedCategory] =
    useState<ToolCategory | null>(null)
  const [selectedTool, setSelectedTool] =
    useState<ToolDefinition | null>(null)
  const [query, setQuery] = useState('')

  const normalizedQuery = normalize(query.trim())

  const visibleCategories = useMemo(() =>
    toolCategories.filter((category) => {
      if (!normalizedQuery) return true

      const categoryText = normalize(
        `${category.title} ${category.description}`,
      )

      return (
        categoryText.includes(normalizedQuery)
        || getToolsByCategory(category.id).some((tool) =>
          toolMatches(tool, normalizedQuery),
        )
      )
    }),
  [normalizedQuery])

  const visibleTools = useMemo(() => {
    if (!selectedCategory) return []

    return getToolsByCategory(selectedCategory.id).filter((tool) =>
      toolMatches(tool, normalizedQuery),
    )
  }, [normalizedQuery, selectedCategory])

  const visibleActions = useMemo(() => {
    if (!selectedTool) return []

    return selectedTool.actions.filter((action) =>
      actionMatches(action, normalizedQuery),
    )
  }, [normalizedQuery, selectedTool])

  const selectCategory = (category: ToolCategory) => {
    setSelectedCategory(category)
    setSelectedTool(null)
    setQuery('')
    setView('tools')
  }

  const selectTool = (tool: ToolDefinition) => {
    setSelectedTool(tool)
    setQuery('')
    setView('actions')
  }

  const goBack = () => {
    setQuery('')

    if (view === 'actions') {
      setSelectedTool(null)
      setView('tools')
      return
    }

    if (view === 'tools') {
      setSelectedCategory(null)
      setView('categories')
    }
  }

  const emptyMessage =
    view === 'categories'
      ? 'No hay categorías o herramientas que coincidan.'
      : view === 'tools'
        ? 'No hay herramientas que coincidan en esta categoría.'
        : 'No hay acciones que coincidan para esta herramienta.'

  const hasResults =
    view === 'categories'
      ? visibleCategories.length > 0
      : view === 'tools'
        ? visibleTools.length > 0
        : visibleActions.length > 0

  return (
    <aside
      className="tool-library-component"
      aria-label="Biblioteca de diseño técnico"
      onClick={(event) => event.stopPropagation()}
    >
      <header className="tool-library-header">
        <div>
          <span>Modo de diseño</span>

          <h3>
            {view === 'categories' && 'Biblioteca técnica'}
            {view === 'tools' && selectedCategory?.title}
            {view === 'actions' && selectedTool?.name}
          </h3>

          <p>
            {view === 'categories'
              && 'Documenta un flujo futuro. Ninguna herramienta ejecuta análisis desde esta biblioteca.'}
            {view === 'tools' && selectedCategory?.description}
            {view === 'actions' && selectedTool?.description}
          </p>
        </div>

        <button
          type="button"
          className="tool-library-close"
          onClick={onClose}
          aria-label="Cerrar biblioteca técnica"
        >
          ×
        </button>
      </header>

      <div className="tool-library-notice">
        <strong>Diseño sin ejecución</strong>
        <small>
          Los nodos creados aquí describen intención, entradas y salidas esperadas.
        </small>
      </div>

      {view !== 'categories' && (
        <button
          type="button"
          className="tool-library-back"
          onClick={goBack}
        >
          ← Volver
        </button>
      )}

      <label className="tool-library-search">
        <span>Buscar</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            view === 'categories'
              ? 'Categoría, herramienta o acción...'
              : view === 'tools'
                ? 'Buscar herramienta...'
                : 'Buscar acción...'
          }
        />
      </label>

      {!hasResults && (
        <div className="tool-library-empty">{emptyMessage}</div>
      )}

      {view === 'categories' && (
        <div className="tool-library-list">
          {visibleCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              className="tool-library-card"
              onClick={() => selectCategory(category)}
            >
              <span>{category.icon}</span>
              <div>
                <strong>{category.title}</strong>
                <small>{category.description}</small>
              </div>
              <em>{getToolsByCategory(category.id).length}</em>
            </button>
          ))}
        </div>
      )}

      {view === 'tools' && (
        <div className="tool-library-list">
          {visibleTools.map((tool) => {
            const availability = getToolAvailability(tool)

            return (
              <button
                key={tool.id}
                type="button"
                className="tool-library-card"
                onClick={() => selectTool(tool)}
              >
                <span>{tool.icon}</span>
                <div>
                  <div className="tool-library-card-title">
                    <strong>{tool.name}</strong>
                    <b data-status={availability.status}>
                      {availability.label}
                    </b>
                  </div>
                  <small>{tool.description}</small>
                </div>
                <em>›</em>
              </button>
            )
          })}
        </div>
      )}

      {view === 'actions' && selectedTool && (
        <div className="tool-library-actions">
          <div className="tool-library-availability">
            <b data-status={getToolAvailability(selectedTool).status}>
              {getToolAvailability(selectedTool).label}
            </b>
            <p>{getToolAvailability(selectedTool).description}</p>
          </div>

          <div className="tool-library-list">
            {visibleActions.map((action) => {
              const availability = getToolAvailability(selectedTool)

              return (
                <button
                  key={action.id}
                  type="button"
                  className="tool-library-card action"
                  disabled={!availability.canAddToDesign}
                  onClick={() => {
                    if (!availability.canAddToDesign) return

                    onCreateNode(selectedTool, action)
                    onClose()
                  }}
                >
                  <span>{action.icon}</span>
                  <div>
                    <strong>{action.name}</strong>
                    <small>{action.description}</small>
                  </div>
                  <em>
                    {availability.canAddToDesign
                      ? 'Diseñar'
                      : 'Bloqueado'}
                  </em>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </aside>
  )
}

export default ToolLibrary
