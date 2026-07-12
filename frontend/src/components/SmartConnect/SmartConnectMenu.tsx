import {
  getSuggestedActionsForOutput,
  type NodeDataType,
  type ToolAction,
  type ToolDefinition,
} from '../../data/toolCatalog'
import { getToolAvailability } from '../../data/toolAvailability'
import './SmartConnectMenu.css'

type SmartConnectMenuProps = {
  outputType: NodeDataType
  onSelectSuggestion: (tool: ToolDefinition, action: ToolAction) => void
  onClose: () => void
}

function SmartConnectMenu({
  outputType,
  onSelectSuggestion,
  onClose,
}: SmartConnectMenuProps) {
  const suggestions = getSuggestedActionsForOutput(outputType)

  return (
    <div
      className="smart-connect-menu"
      aria-label="Siguientes pasos de diseño"
      onClick={(event) => event.stopPropagation()}
    >
      <header className="smart-connect-header">
        <span>Diseño técnico</span>
        <h4>Siguientes pasos compatibles</h4>
        <p>
          Estas sugerencias documentan continuidad por tipo de salida.
          No ejecutan operaciones.
        </p>
      </header>

      <div className="smart-connect-output">
        <span>Salida esperada</span>
        <strong>{outputType}</strong>
      </div>

      <div className="smart-connect-list">
        {suggestions.length === 0 && (
          <div className="smart-connect-empty">
            No hay pasos de diseño sugeridos para esta salida.
          </div>
        )}

        {suggestions.map(({ tool, action }) => {
          const availability = getToolAvailability(tool)

          return (
            <button
              key={`${tool.id}-${action.id}`}
              type="button"
              className="smart-connect-item"
              disabled={!availability.canAddToDesign}
              onClick={() => {
                if (!availability.canAddToDesign) return

                onSelectSuggestion(tool, action)
                onClose()
              }}
            >
              <span>{action.icon}</span>
              <div>
                <div className="smart-connect-item-title">
                  <strong>{action.name}</strong>
                  <b
                    className="smart-connect-status"
                    data-status={availability.status}
                  >
                    {availability.label}
                  </b>
                </div>
                <small>{tool.name}</small>
                <p>{action.description}</p>
              </div>
              <em>Diseñar</em>
            </button>
          )
        })}
      </div>

      <button
        type="button"
        className="smart-connect-close"
        onClick={onClose}
      >
        Cerrar
      </button>
    </div>
  )
}

export default SmartConnectMenu
