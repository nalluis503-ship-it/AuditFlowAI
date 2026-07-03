import { useState } from 'react'
import './App.css'

const sidebarItems = [
  {
    icon: 'IN',
    title: 'Inicio',
    description: 'Resumen general y actividad reciente.',
    active: false,
  },
  {
    icon: 'WF',
    title: 'Workflows',
    description: 'Crea y gestiona tus flujos de trabajo.',
    active: false,
  },
  {
    icon: 'DB',
    title: 'Laboratorio de Base de Datos',
    description: 'Analiza, consulta y cruza informacion de tus bases de datos.',
    active: true,
  },
  {
    icon: 'AU',
    title: 'Procedimientos de Auditoria',
    description: 'Accede a metodologias y procedimientos.',
    active: false,
  },
  {
    icon: 'DO',
    title: 'Documentos',
    description: 'Gestiona y consulta tus archivos y plantillas.',
    active: false,
  },
  {
    icon: 'TL',
    title: 'Herramientas',
    description: 'Explora y utiliza herramientas disponibles.',
    active: false,
  },
  {
    icon: 'IA',
    title: 'IA Auditora',
    description: 'Analisis inteligente y deteccion de anomalias.',
    active: false,
  },
  {
    icon: 'RP',
    title: 'Reportes',
    description: 'Genera reportes y visualizaciones.',
    active: false,
  },
  {
    icon: 'CF',
    title: 'Configuracion',
    description: 'Personaliza tu entorno y preferencias.',
    active: false,
  },
]

const tools = [
  {
    icon: 'My',
    name: 'MySQL',
    category: 'Fuente de datos',
    description: 'Conexion a base de datos relacional',
  },
  {
    icon: 'Pg',
    name: 'PostgreSQL',
    category: 'Fuente de datos',
    description: 'Base de datos relacional avanzada',
  },
  {
    icon: 'SQL',
    name: 'SQL Server',
    category: 'Fuente de datos',
    description: 'Base de datos de Microsoft SQL Server',
  },
  {
    icon: 'XLS',
    name: 'Excel',
    category: 'Archivo',
    description: 'Leer y procesar archivos Excel',
  },
  {
    icon: 'DOC',
    name: 'Word',
    category: 'Documento',
    description: 'Leer y procesar documentos Word',
  },
  {
    icon: 'PDF',
    name: 'PDF',
    category: 'Documento',
    description: 'Leer y extraer datos de PDFs',
  },
  {
    icon: 'AI',
    name: 'IA Auditora',
    category: 'Inteligencia artificial',
    description: 'Analisis inteligente y deteccion de anomalias',
  },
  {
    icon: 'REP',
    name: 'Reportes',
    category: 'Salida',
    description: 'Generar reportes y visualizaciones',
  },
]

const toolActions: Record<string, { icon: string; name: string }[]> = {
  MySQL: [
    { icon: 'DB', name: 'Conectar servidor' },
    { icon: 'BD', name: 'Listar bases' },
    { icon: 'TB', name: 'Listar tablas' },
    { icon: 'SC', name: 'Ver estructura de tabla' },
    { icon: 'SQL', name: 'Ejecutar query SQL' },
    { icon: '+', name: 'Insertar registros' },
    { icon: 'ED', name: 'Actualizar registros' },
    { icon: 'DEL', name: 'Eliminar registros' },
    { icon: 'SM', name: 'Obtener muestra de datos' },
    { icon: '#', name: 'Contar registros' },
    { icon: 'EXP', name: 'Exportar resultado' },
  ],
  Excel: [
    { icon: 'UP', name: 'Cargar archivo Excel' },
    { icon: 'SH', name: 'Listar hojas' },
    { icon: 'TB', name: 'Convertir hoja a tabla' },
    { icon: 'CL', name: 'Normalizar columnas' },
    { icon: 'DU', name: 'Detectar duplicados' },
    { icon: 'EXP', name: 'Exportar resultado' },
  ],
  PDF: [
    { icon: 'UP', name: 'Cargar PDF' },
    { icon: 'TXT', name: 'Extraer texto' },
    { icon: 'TB', name: 'Detectar tablas' },
    { icon: 'AI', name: 'Resumir con IA' },
    { icon: 'KEY', name: 'Buscar palabras clave' },
  ],
  'IA Auditora': [
    { icon: 'SQL', name: 'Generar SQL con IA' },
    { icon: 'EX', name: 'Explicar resultados' },
    { icon: 'RK', name: 'Detectar riesgos' },
    { icon: 'OB', name: 'Redactar observacion' },
    { icon: 'QA', name: 'Generar preguntas de auditoria' },
  ],
}

function App() {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [selectedTool, setSelectedTool] = useState('MySQL')

  const currentTool = tools.find((tool) => tool.name === selectedTool) ?? tools[0]
  const currentActions = toolActions[selectedTool] ?? [
    { icon: 'ADD', name: `Agregar ${selectedTool} al workflow` },
    { icon: 'CFG', name: `Configurar ${selectedTool}` },
  ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AF</div>
          <h1>AuditFlow AI</h1>
        </div>

        <nav className="main-nav">
          {sidebarItems.map((item) => (
            <button
              key={item.title}
              className={item.active ? 'nav-item active' : 'nav-item'}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.description}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="user-card">
          <div className="avatar">AD</div>
          <div>
            <strong>Auditor Demo</strong>
            <small>auditor@demo.com</small>
          </div>
          <span className="chevron">?</span>
        </div>
      </aside>

      <main className="builder">
        <header className="topbar">
          <div className="workflow-title">
            <button className="back-button">?</button>
            <div>
              <h2>Nuevo workflow</h2>
              <span>Laboratorio de Base de Datos</span>
            </div>
            <button className="edit-button">Editar</button>
          </div>

          <div className="top-actions">
            <button className="ghost-button">Guardar</button>
            <button className="ghost-button">Ejecutar</button>
            <button
              className="primary-button"
              onClick={() => setIsLibraryOpen(true)}
            >
              + Agregar herramienta
            </button>
          </div>
        </header>

        <section className={isLibraryOpen ? 'workspace library-open' : 'workspace'}>
          <div className="canvas-panel">
            <div className="canvas-toolbar">
              <button>+</button>
              <button>-</button>
              <button>Full</button>
              <button>Lock</button>
            </div>

            <div className="workflow-canvas">
              <div className="workflow-node excel">
                <div className="node-status">OK</div>
                <div className="node-icon excel-logo">XLS</div>
                <strong>Excel</strong>
                <span>Leer archivo Excel</span>
              </div>

              <div className="line"></div>

              <div className="workflow-node mysql selected">
                <div className="node-status blue">OK</div>
                <div className="node-icon mysql-logo">MySQL</div>
                <strong>MySQL</strong>
                <span>Base de datos</span>
              </div>

              <div className="line"></div>

              <div className="workflow-node ai">
                <div className="node-status purple">OK</div>
                <div className="node-icon ai-logo">AI</div>
                <strong>IA Auditora</strong>
                <span>Analisis inteligente</span>
              </div>
            </div>

            {!isLibraryOpen && (
              <button
                className="floating-add-tool"
                onClick={() => setIsLibraryOpen(true)}
              >
                + Agregar herramienta
              </button>
            )}

            <div className="minimap">
              <div className="mini-flow">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <div className="mini-actions">
                <button>Full</button>
                <button>100%</button>
                <button>Fit</button>
              </div>
            </div>
          </div>

          {isLibraryOpen && (
            <aside className="tool-library">
              <div className="library-header">
                <div>
                  <h3>Biblioteca de herramientas</h3>
                  <p>Elige una herramienta y despues selecciona una accion.</p>
                </div>

                <button
                  className="panel-close"
                  onClick={() => setIsLibraryOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="search-row">
                <input placeholder="Buscar herramienta..." />
                <button>Filtrar</button>
              </div>

              <div className="library-content">
                <div className="tool-grid">
                  {tools.map((tool) => (
                    <button
                      key={tool.name}
                      onClick={() => setSelectedTool(tool.name)}
                      className={
                        tool.name === selectedTool ? 'tool-card active' : 'tool-card'
                      }
                    >
                      <span className="tool-icon">{tool.icon}</span>
                      <strong>{tool.name}</strong>
                      <small>{tool.description}</small>
                      {tool.name === selectedTool && <em>OK</em>}
                    </button>
                  ))}
                </div>

                <div className="tool-actions-panel">
                  <div className="selected-tool-header">
                    <div className="selected-tool-icon">{currentTool.icon}</div>
                    <div>
                      <span>{currentTool.category}</span>
                      <h4>{currentTool.name}</h4>
                      <p>{currentTool.description}</p>
                    </div>
                  </div>

                  <div className="tabs compact">
                    <button className="active">Acciones</button>
                    <button>Informacion</button>
                  </div>

                  <div className="action-list">
                    {currentActions.map((action) => (
                      <button key={action.name} className="action-item">
                        <span>{action.icon}</span>
                        <strong>{action.name}</strong>
                        <em>›</em>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
