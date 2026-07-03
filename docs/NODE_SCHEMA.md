# AuditFlow AI - Node Schema

## 1. Objetivo

Este documento define la estructura base de los nodos dentro de AuditFlow AI.

Un nodo representa una herramienta, accion, analisis, decision, documento, fuente de datos, salida o proceso dentro de un workflow.

Los nodos son el componente principal del sistema, ya que permiten construir flujos visuales de trabajo similares a n8n, pero enfocados en auditoria, analisis de datos e inteligencia artificial.

---

## 2. Principio general

Cada nodo debe tener:

1. Identificador unico.
2. Tipo.
3. Nombre visible.
4. Categoria.
5. Entradas.
6. Salidas.
7. Configuracion.
8. Estado de ejecucion.
9. Resultado.
10. Logs.

---

## 3. Node JSON base

{
  "id": "node_001",
  "type": "file_loader",
  "name": "Cargar Archivo",
  "category": "data",
  "position": {
    "x": 120,
    "y": 240
  },
  "inputs": [],
  "outputs": ["file"],
  "config": {},
  "status": "idle",
  "result": null,
  "logs": []
}

---

## 4. Campos principales

| Campo | Tipo | Descripcion |
|---|---|---|
| id | string | Identificador unico del nodo |
| type | string | Tipo interno del nodo |
| name | string | Nombre visible para el usuario |
| category | string | Categoria funcional del nodo |
| position | object | Posicion visual dentro del canvas |
| inputs | array | Entradas que recibe el nodo |
| outputs | array | Salidas que produce el nodo |
| config | object | Parametros configurables |
| status | string | Estado de ejecucion |
| result | object | Resultado generado por el nodo |
| logs | array | Bitacora del nodo |

---

## 5. Categorias oficiales de nodos

AuditFlow AI tendra las siguientes categorias iniciales.

| Categoria | Descripcion |
|---|---|
| data | Carga, lectura y preparacion de datos |
| document | Lectura y analisis de documentos |
| audit | Reglas y analisis de auditoria |
| logic | Condiciones, filtros, uniones y decisiones |
| ai | Nodos de inteligencia artificial |
| output | Generacion de salidas y reportes |
| procedure | Nodos de auditoria viva y seguimiento |
| expert | Herramientas avanzadas para usuarios tecnicos |

---

## 6. Data Nodes

Nodos orientados a carga y preparacion de datos.

Ejemplos:

| Nodo | Funcion |
|---|---|
| file_loader | Cargar archivos Excel, CSV, Word, PDF o JSON |
| excel_loader | Cargar archivo Excel |
| csv_loader | Cargar archivo CSV |
| sql_connector | Conectar a base de datos |
| convert_to_table | Convertir archivo a tabla de analisis |
| data_viewer | Visualizar tabla tipo Excel |
| sql_query | Ejecutar consulta SQL |

---

## 7. Document Nodes

Nodos orientados a documentos y evidencias.

Ejemplos:

| Nodo | Funcion |
|---|---|
| word_reader | Leer documento Word |
| pdf_reader | Leer documento PDF |
| evidence_extractor | Extraer fechas, nombres, montos o terminos |
| document_comparator | Comparar documentos |
| document_summary | Resumir documento |

---

## 8. Audit Nodes

Nodos especializados en auditoria.

Ejemplos:

| Nodo | Funcion |
|---|---|
| duplicate_detector | Detectar duplicados |
| threshold_check | Validar umbrales |
| outlier_detector | Detectar valores atipicos |
| risk_scoring | Calcular riesgo |
| compliance_validator | Validar cumplimiento |
| missing_evidence | Detectar evidencia faltante |
| anomaly_detector | Detectar anomalias |

---

## 9. Logic Nodes

Nodos para controlar flujo y decisiones.

Ejemplos:

| Nodo | Funcion |
|---|---|
| if_node | Condicion simple |
| switch_node | Rutas multiples |
| filter_node | Filtrar datos |
| merge_node | Unir resultados |
| loop_node | Iterar registros |
| aggregator_node | Agrupar informacion |

---

## 10. AI Nodes

Nodos de inteligencia artificial.

Ejemplos:

| Nodo | Funcion |
|---|---|
| ai_sql_assistant | Generar SQL desde lenguaje natural |
| ai_auditor | Analizar datos o documentos |
| ai_questions | Generar preguntas de auditoria |
| observation_writer | Redactar observaciones |
| report_summary | Resumir resultados |
| contradiction_detector | Detectar contradicciones |

---

## 11. Output Nodes

Nodos de salida.

Ejemplos:

| Nodo | Funcion |
|---|---|
| excel_export | Exportar resultado a Excel |
| pdf_export | Exportar resultado a PDF |
| word_report | Generar reporte Word |
| dashboard_output | Mostrar dashboard |
| notification_node | Generar alerta o notificacion |

---

## 12. Procedure Nodes

Nodos para auditoria viva o seguimiento.

Ejemplos:

| Nodo | Funcion |
|---|---|
| audit_start | Inicio de auditoria |
| requirement_office | Oficio de requerimiento |
| legal_deadline | Termino legal |
| evidence_received | Recepcion de evidencia |
| finding_node | Hallazgo preliminar |
| observation_node | Observacion |
| follow_up_node | Seguimiento |
| final_report | Informe final |

---

## 13. Expert Nodes

Nodos para usuarios con conocimiento tecnico.

Ejemplos:

| Nodo | Funcion |
|---|---|
| custom_sql | Consulta SQL manual |
| python_script | Script Python controlado |
| regex_tool | Validacion con expresiones regulares |
| json_transform | Transformacion JSON |
| advanced_join | Cruces avanzados |

---

## 14. Estados del nodo

| Estado | Descripcion |
|---|---|
| idle | Nodo sin ejecutar |
| configured | Nodo configurado |
| running | Nodo en ejecucion |
| success | Ejecucion correcta |
| warning | Ejecucion con advertencias |
| failed | Ejecucion fallida |
| skipped | Nodo omitido |

---

## 15. Resultado del nodo

Cada nodo debe poder guardar su resultado.

Ejemplo:

{
  "status": "success",
  "rows": 12430,
  "columns": 18,
  "outputType": "dataset",
  "message": "Archivo convertido correctamente a tabla de analisis"
}

---

## 16. Visualizacion del resultado

Cada nodo podra mostrar su resultado segun el tipo de salida.

| Tipo de salida | Visualizacion |
|---|---|
| file | Vista de archivo |
| dataset | Tabla tipo Excel |
| document | Visor documental |
| sql_result | Tabla de resultado SQL |
| audit_result | Panel de hallazgos |
| ai_result | Respuesta IA |
| report | Vista de reporte |
| deadline | Linea de tiempo |

---

## 17. Reglas de configuracion

1. Todo nodo debe tener configuracion visible en el inspector.
2. Todo nodo debe poder validarse antes de ejecutarse.
3. Todo nodo debe mostrar errores entendibles para el usuario.
4. Todo nodo debe poder guardar logs.
5. Todo nodo debe poder mostrar su resultado.
6. Algunos nodos podran ser simples y otros avanzados.
7. El usuario tecnico podra activar opciones expertas cuando sea necesario.

---

## 18. Ejemplo de nodo File Loader

{
  "id": "node_file_001",
  "type": "file_loader",
  "name": "Cargar Archivo",
  "category": "data",
  "inputs": [],
  "outputs": ["file"],
  "config": {
    "allowedTypes": ["xlsx", "csv", "docx", "pdf", "json"],
    "autoDetectType": true
  },
  "status": "idle"
}

---

## 19. Ejemplo de nodo Convert to Table

{
  "id": "node_table_001",
  "type": "convert_to_table",
  "name": "Convertir a Tabla de Analisis",
  "category": "data",
  "inputs": ["file"],
  "outputs": ["dataset"],
  "config": {
    "autoDetectColumns": true,
    "normalizeHeaders": true,
    "createSqlTable": true
  },
  "status": "idle"
}

---

## 20. Ejemplo de nodo IA Auditora

{
  "id": "node_ai_001",
  "type": "ai_auditor",
  "name": "IA Auditora",
  "category": "ai",
  "inputs": ["dataset", "document", "audit_result"],
  "outputs": ["ai_result"],
  "config": {
    "mode": "analysis",
    "explainFindings": true,
    "generateQuestions": true
  },
  "status": "idle"
}

---

## 21. Estado actual

Estado: Draft

Fase actual: Phase 1 - Architecture Lock

Siguiente paso: actualizar PROJECT_CONTROL.md y crear checkpoint v0.2