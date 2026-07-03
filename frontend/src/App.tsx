import { useCallback, useState } from 'react'
import {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './App.css'

type AuditNodeData = {
  icon: string
  title: string
  description: string
  variant: 'excel' | 'mysql' | 'ai'
}

type AuditFlowNode = Node<AuditNodeData, 'auditNode'>

type LibraryView = 'categories' | 'tools' | 'actions'

type ToolCategory = {
  id: string
  icon: string
  title: string
  description: string
}

type LibraryTool = {
  id: string
  icon: string
  name: string
  categoryId: string
  description: string
}

type ToolAction = {
  icon: string
  name: string
  description: string
}

function AuditWorkflowNode({ data, selected }: NodeProps<AuditFlowNode>) {
  return (
    <div className={selected ? 'audit-node selected-node' : 'audit-node'}>
      <Handle
        type="target"
        position={Position.Left}
        className="audit-handle audit-handle-left"
      />

      <div className={`audit-node-icon ${data.variant}`}>{data.icon}</div>
      <strong>{data.title}</strong>
      <small>{data.description}</small>

      <Handle
        type="source"
        position={Position.Right}
        className="audit-handle audit-handle-right"
      />
    </div>
  )
}

const nodeTypes = {
  auditNode: AuditWorkflowNode,
}

const sidebarItems = [
  { icon: 'IN', title: 'Inicio', description: 'Resumen general y actividad reciente.', active: false },
  { icon: 'WF', title: 'Workflows', description: 'Crea y gestiona tus flujos de trabajo.', active: false },
  { icon: 'DB', title: 'Laboratorio de Base de Datos', description: 'Analiza, consulta y cruza informacion de tus bases de datos.', active: true },
  { icon: 'AU', title: 'Procedimientos de Auditoria', description: 'Accede a metodologias y procedimientos.', active: false },
  { icon: 'DO', title: 'Documentos', description: 'Gestiona y consulta tus archivos y plantillas.', active: false },
  { icon: 'TL', title: 'Herramientas', description: 'Explora y utiliza herramientas disponibles.', active: false },
  { icon: 'IA', title: 'IA Auditora', description: 'Analisis inteligente y deteccion de anomalias.', active: false },
  { icon: 'RP', title: 'Reportes', description: 'Genera reportes y visualizaciones.', active: false },
  { icon: 'CF', title: 'Configuracion', description: 'Personaliza tu entorno y preferencias.', active: false },
]

const categories: ToolCategory[] = [
  {
    id: 'ai',
    icon: 'AI',
    title: 'IA',
    description: 'Agentes, analisis, redaccion, riesgos y asistencia inteligente.',
  },
  {
    id: 'databases',
    icon: 'DB',
    title: 'Bases de datos',
    description: 'MySQL, PostgreSQL, SQL Server, Oracle, SQLite y consultas SQL.',
  },
  {
    id: 'documents',
    icon: 'DOC',
    title: 'Archivos y documentos',
    description: 'Excel, Word, PDF, CSV, JSON, XML y archivos de evidencia.',
  },
  {
    id: 'viewers',
    icon: 'VIS',
    title: 'Visualizadores',
    description: 'Ver PDF, Word, Excel, tablas, imagenes y evidencia dentro del flujo.',
  },
  {
    id: 'transform',
    icon: 'TR',
    title: 'Transformacion de datos',
    description: 'Limpiar, cruzar, normalizar, filtrar y preparar informacion.',
  },
  {
    id: 'audit',
    icon: 'AU',
    title: 'Auditoria',
    description: 'Hallazgos, cedulas, matriz de riesgos, evidencia y cumplimiento.',
  },
  {
    id: 'reports',
    icon: 'REP',
    title: 'Reportes',
    description: 'PDF, Word, Excel, graficas, dashboard y resumen ejecutivo.',
  },
  {
    id: 'logic',
    icon: 'IF',
    title: 'Flujo y logica',
    description: 'Condiciones, merge, switch, espera, aprobacion y manejo de errores.',
  },
  {
    id: 'integrations',
    icon: 'API',
    title: 'Integraciones',
    description: 'Google, Microsoft, correo, webhooks, APIs y servicios externos.',
  },
  {
    id: 'system',
    icon: 'DEV',
    title: 'Sistema / desarrollo',
    description: 'HTTP Request, Python, JavaScript, scripts SQL y archivos del servidor.',
  },
]

const libraryTools: LibraryTool[] = [
  { id: 'ai-auditor', icon: 'AI', name: 'IA Auditora', categoryId: 'ai', description: 'Analiza evidencias, datos y documentos con enfoque auditor.' },
  { id: 'sql-assistant', icon: 'SQL', name: 'SQL Assistant', categoryId: 'ai', description: 'Genera y explica consultas SQL.' },
  { id: 'risk-detector', icon: 'RK', name: 'Detector de riesgos', categoryId: 'ai', description: 'Identifica riesgos, inconsistencias y focos rojos.' },
  { id: 'observation-writer', icon: 'OB', name: 'Redactor de observaciones', categoryId: 'ai', description: 'Redacta hallazgos, observaciones y recomendaciones.' },

  { id: 'mysql', icon: 'My', name: 'MySQL', categoryId: 'databases', description: 'Conectar y consultar bases MySQL.' },
  { id: 'postgresql', icon: 'Pg', name: 'PostgreSQL', categoryId: 'databases', description: 'Conectar y consultar PostgreSQL.' },
  { id: 'sqlserver', icon: 'SQL', name: 'SQL Server', categoryId: 'databases', description: 'Conectar y consultar SQL Server.' },
  { id: 'sqlite', icon: 'Lite', name: 'SQLite', categoryId: 'databases', description: 'Analizar bases locales ligeras.' },
  { id: 'duckdb', icon: 'Duck', name: 'DuckDB', categoryId: 'databases', description: 'Analisis rapido de archivos y datasets.' },

  { id: 'excel', icon: 'XLS', name: 'Excel', categoryId: 'documents', description: 'Leer, visualizar y transformar archivos Excel.' },
  { id: 'word', icon: 'DOC', name: 'Word', categoryId: 'documents', description: 'Leer y analizar documentos Word.' },
  { id: 'pdf', icon: 'PDF', name: 'PDF', categoryId: 'documents', description: 'Leer y extraer datos de archivos PDF.' },
  { id: 'csv', icon: 'CSV', name: 'CSV', categoryId: 'documents', description: 'Leer archivos separados por comas.' },
  { id: 'json', icon: 'JSON', name: 'JSON', categoryId: 'documents', description: 'Leer y transformar archivos JSON.' },

  { id: 'pdf-viewer', icon: 'PDF', name: 'PDF Viewer', categoryId: 'viewers', description: 'Visualizar PDF dentro del workflow.' },
  { id: 'word-viewer', icon: 'DOC', name: 'Word Viewer', categoryId: 'viewers', description: 'Visualizar documentos Word.' },
  { id: 'excel-viewer', icon: 'XLS', name: 'Excel Viewer', categoryId: 'viewers', description: 'Visualizar hojas y tablas Excel.' },
  { id: 'table-viewer', icon: 'TBL', name: 'Table Viewer', categoryId: 'viewers', description: 'Visualizar resultados tabulares.' },
  { id: 'image-viewer', icon: 'IMG', name: 'Image Viewer', categoryId: 'viewers', description: 'Visualizar imagenes o evidencia fotografica.' },

  { id: 'edit-fields', icon: 'ED', name: 'Editar campos', categoryId: 'transform', description: 'Renombrar, eliminar o crear columnas.' },
  { id: 'normalize-data', icon: 'NORM', name: 'Normalizar datos', categoryId: 'transform', description: 'Normalizar fechas, nombres, RFC, CURP y campos.' },
  { id: 'deduplicate', icon: 'DU', name: 'Detectar duplicados', categoryId: 'transform', description: 'Detectar registros repetidos o sospechosos.' },
  { id: 'join-datasets', icon: 'JOIN', name: 'Cruzar informacion', categoryId: 'transform', description: 'Unir o comparar bases por campos clave.' },

  { id: 'audit-finding', icon: 'HAL', name: 'Hallazgo preliminar', categoryId: 'audit', description: 'Crear hallazgo desde datos o evidencia.' },
  { id: 'audit-workpaper', icon: 'CED', name: 'Cedula de revision', categoryId: 'audit', description: 'Generar cedulas y papeles de trabajo.' },
  { id: 'risk-matrix', icon: 'MAT', name: 'Matriz de riesgos', categoryId: 'audit', description: 'Calificar probabilidad, impacto y severidad.' },
  { id: 'evidence-link', icon: 'EVI', name: 'Vincular evidencia', categoryId: 'audit', description: 'Relacionar documentos, tablas y capturas con hallazgos.' },

  { id: 'pdf-report', icon: 'PDF', name: 'Reporte PDF', categoryId: 'reports', description: 'Generar reporte final en PDF.' },
  { id: 'word-report', icon: 'DOC', name: 'Reporte Word', categoryId: 'reports', description: 'Generar informe editable en Word.' },
  { id: 'excel-report', icon: 'XLS', name: 'Reporte Excel', categoryId: 'reports', description: 'Exportar tablas y resultados a Excel.' },
  { id: 'dashboard', icon: 'DASH', name: 'Dashboard', categoryId: 'reports', description: 'Visualizar indicadores, graficas y resumenes.' },

  { id: 'if', icon: 'IF', name: 'Condicion IF', categoryId: 'logic', description: 'Crear rutas segun condiciones.' },
  { id: 'switch', icon: 'SW', name: 'Switch', categoryId: 'logic', description: 'Dividir flujo por multiples rutas.' },
  { id: 'merge', icon: 'MG', name: 'Merge', categoryId: 'logic', description: 'Unir resultados de diferentes nodos.' },
  { id: 'human-review', icon: 'HR', name: 'Aprobacion humana', categoryId: 'logic', description: 'Pedir autorizacion antes de continuar.' },

  { id: 'gmail', icon: 'G', name: 'Gmail', categoryId: 'integrations', description: 'Leer o enviar correos.' },
  { id: 'drive', icon: 'DRV', name: 'Google Drive', categoryId: 'integrations', description: 'Leer, guardar o compartir archivos.' },
  { id: 'sharepoint', icon: 'SP', name: 'SharePoint', categoryId: 'integrations', description: 'Conectar repositorios Microsoft.' },
  { id: 'webhook', icon: 'WH', name: 'Webhook', categoryId: 'integrations', description: 'Recibir datos desde sistemas externos.' },

  { id: 'http-request', icon: 'HTTP', name: 'HTTP Request', categoryId: 'system', description: 'Consumir APIs externas.' },
  { id: 'python-code', icon: 'PY', name: 'Codigo Python', categoryId: 'system', description: 'Ejecutar logica avanzada con Python.' },
  { id: 'js-code', icon: 'JS', name: 'Codigo JavaScript', categoryId: 'system', description: 'Ejecutar scripts personalizados.' },
  { id: 'sql-script', icon: 'SQL', name: 'Script SQL', categoryId: 'system', description: 'Ejecutar scripts SQL controlados.' },
]

const toolActions: Record<string, ToolAction[]> = {
  mysql: [
    { icon: 'CON', name: 'Conectar servidor', description: 'Configurar host, puerto, usuario y base de datos.' },
    { icon: 'BD', name: 'Listar bases', description: 'Obtener bases disponibles.' },
    { icon: 'TB', name: 'Listar tablas', description: 'Consultar tablas de la base seleccionada.' },
    { icon: 'SC', name: 'Ver estructura', description: 'Leer columnas, tipos de dato e indices.' },
    { icon: 'SQL', name: 'Ejecutar query SQL', description: 'Ejecutar consulta SQL manual o generada por IA.' },
    { icon: 'AI', name: 'Generar SQL con IA', description: 'Crear consulta a partir de una instruccion natural.' },
  ],
  excel: [
    { icon: 'UP', name: 'Cargar archivo', description: 'Seleccionar archivo Excel.' },
    { icon: 'VIS', name: 'Visualizar hojas', description: 'Ver hojas y primeras filas.' },
    { icon: 'TBL', name: 'Convertir a tabla', description: 'Convertir hoja a dataset estructurado.' },
    { icon: 'DU', name: 'Detectar duplicados', description: 'Buscar registros repetidos.' },
    { icon: 'SQL', name: 'Enviar a SQL', description: 'Convertir dataset a tabla SQL temporal.' },
  ],
  pdf: [
    { icon: 'UP', name: 'Cargar PDF', description: 'Seleccionar documento PDF.' },
    { icon: 'VIS', name: 'Visualizar PDF', description: 'Abrir visor del documento dentro del flujo.' },
    { icon: 'TXT', name: 'Extraer texto', description: 'Extraer contenido textual.' },
    { icon: 'TBL', name: 'Detectar tablas', description: 'Intentar extraer tablas del PDF.' },
    { icon: 'AI', name: 'Analizar con IA', description: 'Resumir, detectar riesgos y contradicciones.' },
  ],
  'pdf-viewer': [
    { icon: 'VIS', name: 'Abrir visor', description: 'Ver PDF con busqueda, zoom y paginas.' },
    { icon: 'MARK', name: 'Marcar evidencia', description: 'Seleccionar paginas relevantes.' },
    { icon: 'NOTE', name: 'Agregar comentario', description: 'Anotar observaciones sobre el documento.' },
  ],
  'ai-auditor': [
    { icon: 'ANA', name: 'Analizar evidencia', description: 'Revisar datos, documentos o resultados.' },
    { icon: 'RK', name: 'Detectar riesgos', description: 'Identificar focos rojos.' },
    { icon: 'OB', name: 'Redactar observacion', description: 'Generar una observacion tecnica.' },
    { icon: 'QA', name: 'Generar preguntas', description: 'Crear preguntas para entrevista o requerimiento.' },
  ],
  'audit-finding': [
    { icon: 'NEW', name: 'Crear hallazgo', description: 'Crear hallazgo preliminar desde el resultado.' },
    { icon: 'EVI', name: 'Vincular evidencia', description: 'Relacionar documentos o datos.' },
    { icon: 'RISK', name: 'Calificar riesgo', description: 'Asignar impacto y probabilidad.' },
    { icon: 'REP', name: 'Enviar a reporte', description: 'Mandar hallazgo al informe.' },
  ],
}

const initialNodes: AuditFlowNode[] = []

const initialEdges: Edge[] = []

function App() {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [libraryView, setLibraryView] = useState<LibraryView>('categories')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [selectedToolId, setSelectedToolId] = useState<string | null>(null)
  const [nodes, , onNodesChange] = useNodesState<AuditFlowNode>(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId)
  const selectedTool = libraryTools.find((tool) => tool.id === selectedToolId)
  const visibleTools = libraryTools.filter((tool) => tool.categoryId === selectedCategoryId)
  const visibleActions = selectedToolId
    ? toolActions[selectedToolId] ?? [
        { icon: 'ADD', name: `Agregar ${selectedTool?.name ?? 'herramienta'} al workflow`, description: 'Crear nodo en el canvas.' },
        { icon: 'CFG', name: 'Configurar despues', description: 'Crear nodo y configurar sus opciones desde el inspector.' },
      ]
    : []

  const openLibrary = () => {
    setIsLibraryOpen(true)
    setLibraryView('categories')
    setSelectedCategoryId(null)
    setSelectedToolId(null)
  }

  const closeLibrary = () => {
    setIsLibraryOpen(false)
    setLibraryView('categories')
    setSelectedCategoryId(null)
    setSelectedToolId(null)
  }

  const selectCategory = (categoryId: string) => {
    setSelectedCategoryId(categoryId)
    setSelectedToolId(null)
    setLibraryView('tools')
  }

  const selectTool = (toolId: string) => {
    setSelectedToolId(toolId)
    setLibraryView('actions')
  }

  const goBackLibrary = () => {
    if (libraryView === 'actions') {
      setSelectedToolId(null)
      setLibraryView('tools')
      return
    }

    if (libraryView === 'tools') {
      setSelectedCategoryId(null)
      setLibraryView('categories')
    }
  }

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((currentEdges) => addEdge({ ...connection, animated: true }, currentEdges)),
    [setEdges],
  )

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AF</div>
          <h1>AuditFlow AI</h1>
        </div>

        <nav className="main-nav">
          {sidebarItems.map((item) => (
            <button key={item.title} className={item.active ? 'nav-item active' : 'nav-item'}>
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
          <span className="chevron">⌄</span>
        </div>
      </aside>

      <main className="builder">
        <header className="topbar">
          <div className="workflow-title">
            <button className="back-button">←</button>
            <div>
              <h2>Nuevo workflow</h2>
              <span>Laboratorio de Base de Datos</span>
            </div>
            <button className="edit-button">Editar</button>
          </div>

          <div className="top-actions">
            <button className="ghost-button">Guardar</button>
            <button className="ghost-button">Ejecutar</button>
            <button className="primary-button" onClick={openLibrary}>
              + Agregar herramienta
            </button>
          </div>
        </header>

        <section className="workspace" onClick={() => isLibraryOpen && closeLibrary()}>
          <div className="canvas-panel">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>

            {!isLibraryOpen && nodes.length === 0 && (
              <button
                className="empty-workflow-card"
                onClick={(event) => {
                  event.stopPropagation()
                  openLibrary()
                }}
              >
                <span>+</span>
                <strong>Agregar primer nodo</strong>
                <small>Elige lo que quieres construir o analizar</small>
              </button>
            )}

            {!isLibraryOpen && nodes.length > 0 && (
              <button
                className="floating-add-tool"
                onClick={(event) => {
                  event.stopPropagation()
                  openLibrary()
                }}
              >
                + Agregar herramienta
              </button>
            )}

            {isLibraryOpen && (
              <aside className="tool-library level-library" onClick={(event) => event.stopPropagation()}>
                <div className="library-header">
                  <div>
                    <span className="library-eyebrow">
                      {libraryView === 'categories' && 'Biblioteca'}
                      {libraryView === 'tools' && selectedCategory?.title}
                      {libraryView === 'actions' && selectedTool?.name}
                    </span>
                    <h3>
                      {libraryView === 'categories' && 'Agregar herramienta'}
                      {libraryView === 'tools' && 'Seleccionar herramienta'}
                      {libraryView === 'actions' && 'Seleccionar accion'}
                    </h3>
                    <p>
                      {libraryView === 'categories' && 'Elige una categoria para explorar herramientas.'}
                      {libraryView === 'tools' && selectedCategory?.description}
                      {libraryView === 'actions' && selectedTool?.description}
                    </p>
                  </div>
                </div>

                {libraryView !== 'categories' && (
                  <button className="library-back" onClick={goBackLibrary}>
                    ← Volver
                  </button>
                )}

                <div className="search-row single">
                  <input placeholder="Buscar..." />
                </div>

                {libraryView === 'categories' && (
                  <div className="level-list">
                    {categories.map((category) => (
                      <button
                        key={category.id}
                        className="level-card"
                        onClick={() => selectCategory(category.id)}
                      >
                        <span className="level-icon">{category.icon}</span>
                        <span>
                          <strong>{category.title}</strong>
                          <small>{category.description}</small>
                        </span>
                        <em>›</em>
                      </button>
                    ))}
                  </div>
                )}

                {libraryView === 'tools' && (
                  <div className="level-list">
                    {visibleTools.map((tool) => (
                      <button
                        key={tool.id}
                        className="level-card"
                        onClick={() => selectTool(tool.id)}
                      >
                        <span className="level-icon">{tool.icon}</span>
                        <span>
                          <strong>{tool.name}</strong>
                          <small>{tool.description}</small>
                        </span>
                        <em>›</em>
                      </button>
                    ))}
                  </div>
                )}

                {libraryView === 'actions' && (
                  <div className="level-list">
                    {visibleActions.map((action) => (
                      <button key={action.name} className="level-card action-level-card">
                        <span className="level-icon">{action.icon}</span>
                        <span>
                          <strong>{action.name}</strong>
                          <small>{action.description}</small>
                        </span>
                        <em>+</em>
                      </button>
                    ))}
                  </div>
                )}
              </aside>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App

