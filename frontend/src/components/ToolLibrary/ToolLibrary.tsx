import { useMemo, useState } from 'react'
import {
  getToolsByCategory,
  toolCategories,
  type ToolAction,
  type ToolDefinition,
  type ToolCategory,
} from '../../data/toolCatalog'
import './ToolLibrary.css'

type LibraryView = 'categories' | 'tools' | 'actions'

type ToolLibraryProps = {
  onCreateNode: (tool: ToolDefinition, action: ToolAction) => void
  onClose: () => void
}

function ToolLibrary({ onCreateNode, onClose }: ToolLibraryProps) {
  const [view, setView] = useState<LibraryView>('categories')
  const [selectedCategory, setSelectedCategory] = useState<ToolCategory | null>(null)
  const [selectedTool, setSelectedTool] = useState<ToolDefinition | null>(null)

  const visibleTools = useMemo(() => {
    if (!selectedCategory) return []
    return getToolsByCategory(selectedCategory.id)
  }, [selectedCategory])

  const selectCategory = (category: ToolCategory) => {
    setSelectedCategory(category)
    setSelectedTool(null)
    setView('tools')
  }

  const selectTool = (tool: ToolDefinition) => {
    setSelectedTool(tool)
    setView('actions')
  }

  const goBack = () => {
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

  return (
    <aside className="tool-library-component" onClick={(event) => event.stopPropagation()}>
      <header className="tool-library-header">
        <div>
          <span>
            {view === 'categories' && 'Biblioteca'}
            {view === 'tools' && selectedCategory?.title}
            {view === 'actions' && selectedTool?.name}
          </span>

          <h3>
            {view === 'categories' && 'Agregar herramienta'}
            {view === 'tools' && 'Seleccionar herramienta'}
            {view === 'actions' && 'Seleccionar accion'}
          </h3>

          <p>
            {view === 'categories' && 'Elige una categoria para construir o analizar.'}
            {view === 'tools' && selectedCategory?.description}
            {view === 'actions' && selectedTool?.description}
          </p>
        </div>
      </header>

      {view !== 'categories' && (
        <button className="tool-library-back" onClick={goBack}>
          ← Volver
        </button>
      )}

      <div className="tool-library-search">
        <input placeholder="Buscar herramienta..." />
      </div>

      {view === 'categories' && (
        <div className="tool-library-list">
          {toolCategories.map((category) => (
            <button
              key={category.id}
              className="tool-library-card"
              onClick={() => selectCategory(category)}
            >
              <span>{category.icon}</span>
              <div>
                <strong>{category.title}</strong>
                <small>{category.description}</small>
              </div>
              <em>›</em>
            </button>
          ))}
        </div>
      )}

      {view === 'tools' && (
        <div className="tool-library-list">
          {visibleTools.map((tool) => (
            <button
              key={tool.id}
              className="tool-library-card"
              onClick={() => selectTool(tool)}
            >
              <span>{tool.icon}</span>
              <div>
                <strong>{tool.name}</strong>
                <small>{tool.description}</small>
              </div>
              <em>›</em>
            </button>
          ))}
        </div>
      )}

      {view === 'actions' && selectedTool && (
        <div className="tool-library-list">
          {selectedTool.actions.map((action) => (
            <button
              key={action.id}
              className="tool-library-card action"
              onClick={() => {
                onCreateNode(selectedTool, action)
                onClose()
              }}
            >
              <span>{action.icon}</span>
              <div>
                <strong>{action.name}</strong>
                <small>{action.description}</small>
              </div>
              <em>+</em>
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}

export default ToolLibrary
