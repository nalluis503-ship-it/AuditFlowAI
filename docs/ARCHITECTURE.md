# AuditFlow AI — Architecture

## 1. Visión general

AuditFlow AI es una plataforma de workflows visuales tipo n8n, especializada en auditoría, análisis de datos e inteligencia artificial.

El sistema permitirá construir flujos visuales mediante nodos propios orientados a:

- carga de datos;
- validación de bases;
- análisis de auditoría;
- detección de riesgos;
- generación de observaciones;
- exportación de resultados.

---

## 2. Principio arquitectónico base

La plataforma se basa en el siguiente flujo:

Data Source -> Workflow Engine -> Node System -> Audit Engine -> AI Engine -> Output

Ejemplo:

Excel Loader -> Duplicate Detector -> Risk Scoring -> AI Observation Writer -> Report Export

---

## 3. Motores principales

### 3.1 Workflow Engine

Responsable de:

- crear workflows;
- ejecutar nodos en orden;
- manejar conexiones;
- controlar estados;
- registrar logs;
- manejar errores.

Estado: Draft

---

### 3.2 Node System

Responsable de definir y administrar nodos personalizados.

Categorías oficiales:

- Data Nodes;
- Audit Nodes;
- Logic Nodes;
- AI Nodes;
- Output Nodes.

Estado: Draft

---

### 3.3 Visual Canvas

Responsable de la interfaz tipo n8n.

Componentes:

- Sidebar de nodos;
- Canvas central;
- Inspector derecho;
- Panel inferior de logs;
- Visualizador de datos.

Estado: Draft

---

### 3.4 Data Engine

Responsable de cargar, interpretar y transformar datos.

Fuentes previstas:

- Excel;
- CSV;
- JSON;
- SQL Server;
- PostgreSQL;
- MySQL;
- Oracle;
- DuckDB.

Estado: Draft

---

### 3.5 Audit Intelligence Engine

Responsable de aplicar lógica de auditoría.

Capacidades previstas:

- detección de duplicados;
- detección de anomalías;
- validación de umbrales;
- scoring de riesgo;
- validación de cumplimiento;
- generación de hallazgos preliminares.

Estado: Draft

---

### 3.6 AI Engine

Responsable de integrar capacidades de inteligencia artificial.

Capacidades previstas:

- asistente SQL;
- redacción de observaciones;
- generación de preguntas de auditoría;
- agente auditor;
- memoria de criterios.

Estado: Draft

---

## 4. Stack tecnológico oficial

### Frontend

- React;
- TypeScript;
- React Flow;
- Tailwind CSS;
- AG Grid.

### Backend

- Python;
- FastAPI.

### Base de datos

- PostgreSQL.

### IA

- Ollama / LLM local en fase posterior.

---

## 5. Estructura oficial del proyecto

AuditFlowAI/
+-- frontend/
+-- backend/
+-- docs/
+-- datasets/
+-- workflows/
+-- scripts/
+-- infrastructure/

---

## 6. Reglas arquitectónicas

1. Todo cambio estructural debe registrarse como Change Request.
2. Ningún motor debe depender directamente de la interfaz visual.
3. El Workflow Engine debe poder ejecutarse sin frontend.
4. Los nodos deben tener entrada, salida y configuración claramente definidas.
5. La IA no debe sustituir el motor de reglas; debe complementar el análisis.
6. Los datos sensibles no deben almacenarse sin control.
7. Cada fase cerrada debe generar checkpoint en Git.

---

## 7. Estado actual

Arquitectura: Draft

Fase actual: Phase 1 — Architecture Lock

Siguiente documento: WORKFLOW_SCHEMA.md
