import {
  getSuggestedActionsForOutput,
  type NodeDataType,
  type ToolAction,
  type ToolDefinition,
} from '../../data/toolCatalog'
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
    <div className="smart-connect-menu" onClick={(event) => event.stopPropagation()}>
      <header className="smart-connect-header">
        <span>Smart Connect</span>
        <h4>Siguientes acciones sugeridas</h4>
        <p>Estas opciones son compatibles con la salida del nodo.</p>
      </header>

      <div className="smart-connect-output">
        <span>Salida detectada</span>
        <strong>{outputType}</strong>
      </div>

      <div className="smart-connect-list">
        {suggestions.length === 0 && (
          <div className="smart-connect-empty">
            No hay sugerencias disponibles para esta salida.
          </div>
        )}

        {suggestions.map(({ tool, action }) => (
          <button
            key={`${tool.id}-${action.id}`}
            className="smart-connect-item"
            onClick={() => {
              onSelectSuggestion(tool, action)
              onClose()
            }}
          >
            <span>{action.icon}</span>
            <div>
              <strong>{action.name}</strong>
              <small>{tool.name}</small>
              <p>{action.description}</p>
            </div>
            <em>+</em>
          </button>
        ))}
      </div>

      <button className="smart-connect-close" onClick={onClose}>
        Cerrar
      </button>
    </div>
  )
}

export default SmartConnectMenu
