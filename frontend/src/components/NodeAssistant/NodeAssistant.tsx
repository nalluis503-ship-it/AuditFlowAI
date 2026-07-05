import { useState } from 'react'
import type { NodeActionExperience } from '../../data/nodeActionRegistry'
import './NodeAssistant.css'

type NodeAssistantProps = {
  experience: NodeActionExperience
  nodeTitle: string
  hasResults: boolean
  onSuggestNextNode: () => void
}

function NodeAssistant({
  experience,
  nodeTitle,
  hasResults,
  onSuggestNextNode,
}: NodeAssistantProps) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<string[]>([
    experience.aiOpeningMessage,
  ])

  const askAssistant = () => {
    const cleanQuestion = question.trim()

    if (!cleanQuestion) return

    const response = hasResults
      ? `Analizando el contexto de "${nodeTitle}", puedo ayudarte a interpretar resultados, preparar hallazgos o sugerir el siguiente nodo.`
      : `Todavía no hay resultados suficientes en "${nodeTitle}". Primero conviene configurar o ejecutar el nodo antes de emitir conclusiones.`

    setMessages((currentMessages) => [
      ...currentMessages,
      `Tú: ${cleanQuestion}`,
      `IA: ${response}`,
    ])

    setQuestion('')
  }

  return (
    <div className="node-assistant">
      <div className="node-assistant-orb">IA</div>

      <div className="node-assistant-content">
        <header>
          <strong>IA contextual del nodo</strong>
          <small>Activa recomendaciones según esta acción</small>
        </header>

        <div className="node-assistant-messages">
          {messages.map((message, index) => (
            <p key={`${message}-${index}`}>{message}</p>
          ))}
        </div>

        <div className="node-assistant-suggestions">
          {experience.aiSuggestions.map((suggestion) => (
            <button key={suggestion} type="button">
              {suggestion}
            </button>
          ))}
        </div>

        <div className="node-assistant-input">
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Pregúntale a la IA sobre este nodo..."
          />

          <button type="button" onClick={askAssistant}>
            Enviar
          </button>
        </div>

        <button
          type="button"
          className="node-assistant-primary"
          onClick={onSuggestNextNode}
        >
          {experience.nextStepLabel}
        </button>
      </div>
    </div>
  )
}

export default NodeAssistant
