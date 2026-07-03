# AuditFlow AI - Workflow Schema

## 1. Objetivo

Este documento define como se guarda, organiza y ejecuta un workflow dentro de AuditFlow AI.

Un workflow representa un flujo visual compuesto por nodos conectados entre si.

La finalidad es permitir que el usuario pueda construir procesos de analisis, auditoria, revision documental, transformacion de datos e inteligencia artificial sin depender necesariamente de programacion avanzada.

---

## 2. Concepto general

AuditFlow AI trabajara con flujos visuales similares al concepto de n8n, pero enfocados en auditoria, analisis de bases de datos, documentos, evidencias, hallazgos y generacion de observaciones.

Ejemplo general:

Excel Loader -> Convertir a Tabla de Analisis -> Duplicate Detector -> Risk Scoring -> AI Observation Writer -> Report Export

---

## 3. Modos principales de workflow

AuditFlow AI tendra dos modos principales de trabajo.

| Modo | Descripcion |
|---|---|
| free_workspace | Espacio libre para analizar bases, documentos, SQL, Excel, CSV, Word, PDF, IA y herramientas sin crear una auditoria formal |
| audit_procedure | Procedimiento de auditoria viva con oficios, terminos, evidencias, avance porcentual, seguimiento y trazabilidad |

Regla principal:

Todo procedimiento de auditoria puede usar workflows, pero no todo workflow tiene que ser una auditoria viva.

---

## 4. Modo free_workspace

Este modo permite que el usuario utilice nodos de forma libre para analizar informacion.

Casos de uso:

- cargar una o varias bases Excel;
- revisar si el archivo cargado es correcto;
- visualizar tablas;
- convertir archivos a tablas de analisis;
- ejecutar consultas SQL;
- cruzar bases;
- detectar duplicados;
- analizar datos con IA;
- generar salidas en Excel, PDF o reporte.

Ejemplo:

Cargar Archivo -> Convertir a Tabla -> Consulta SQL -> Detectar Duplicados -> IA Auditora -> Exportar Resultado

---

## 5. Modo audit_procedure

Este modo permite llevar una auditoria completa o de seguimiento.

Casos de uso:

- crear procedimiento de auditoria;
- registrar oficio de requerimiento;
- controlar termino legal;
- registrar recepcion de evidencia;
- analizar bases de datos;
- revisar documentos;
- generar hallazgos;
- dar seguimiento;
- generar informe final.

Ejemplo:

Inicio Auditoria -> Oficio de Requerimiento -> Termino Legal -> Recepcion de Evidencia -> Analisis de Base -> Hallazgo Preliminar -> Observacion -> Informe Final

---

## 6. Estructura base de un workflow

Un workflow debe tener los siguientes elementos:

1. Identificador unico.
2. Nombre.
3. Version.
4. Modo de trabajo.
5. Estado.
6. Lista de nodos.
7. Lista de conexiones.
8. Configuracion global.
9. Metadatos.
10. Historial de ejecucion.

---

## 7. Workflow JSON base

Ejemplo de estructura interna:

{
  "id": "workflow_001",
  "name": "Analisis de compras",
  "version": "0.1",
  "mode": "free_workspace",
  "status": "draft",
  "nodes": [],
  "edges": [],
  "settings": {
    "executionMode": "manual",
    "stopOnError": true,
    "saveExecutionLogs": true
  },
  "metadata": {
    "createdBy": "Luis Donaldo",
    "createdAt": "2026-07-02T00:00:00",
    "updatedAt": "2026-07-02T00:00:00",
    "description": "Workflow inicial para analisis de bases de datos"
  }
}

---

## 8. Campos principales

| Campo | Tipo | Descripcion |
|---|---|---|
| id | string | Identificador unico del workflow |
| name | string | Nombre visible del workflow |
| version | string | Version del workflow |
| mode | string | free_workspace o audit_procedure |
| status | string | Estado del workflow |
| nodes | array | Lista de nodos |
| edges | array | Lista de conexiones entre nodos |
| settings | object | Configuracion global de ejecucion |
| metadata | object | Informacion de control, usuario, fecha y descripcion |

---

## 9. Estados del workflow

| Estado | Descripcion |
|---|---|
| draft | Workflow en edicion |
| active | Workflow listo para ejecutarse |
| running | Workflow en ejecucion |
| completed | Workflow ejecutado correctamente |
| failed | Workflow con error |
| archived | Workflow archivado |

---

## 10. Configuracion global del workflow

Cada workflow podra tener configuracion general.

Ejemplo:

{
  "executionMode": "manual",
  "stopOnError": true,
  "saveExecutionLogs": true,
  "allowPartialExecution": false,
  "showNodeOutputs": true
}

Descripcion:

| Campo | Descripcion |
|---|---|
| executionMode | Define si el workflow se ejecuta manual o automaticamente |
| stopOnError | Detiene el flujo si un nodo falla |
| saveExecutionLogs | Guarda bitacora de ejecucion |
| allowPartialExecution | Permite ejecutar solo una parte del flujo |
| showNodeOutputs | Permite ver resultados por nodo |

---

## 11. Estructura de nodos dentro del workflow

Cada nodo dentro del workflow debe tener una estructura base.

Ejemplo:

{
  "id": "node_excel_001",
  "type": "file_loader",
  "name": "Cargar Archivo",
  "category": "data",
  "position": {
    "x": 120,
    "y": 240
  },
  "config": {},
  "inputs": [],
  "outputs": ["file"]
}

---

## 12. Estructura de conexion entre nodos

Cada conexion representa el enlace entre dos nodos.

Ejemplo:

{
  "id": "edge_001",
  "source": "node_excel_001",
  "target": "node_table_001",
  "sourceHandle": "output",
  "targetHandle": "input",
  "label": "file"
}

Descripcion:

| Campo | Descripcion |
|---|---|
| id | Identificador unico de la conexion |
| source | Nodo origen |
| target | Nodo destino |
| sourceHandle | Salida del nodo origen |
| targetHandle | Entrada del nodo destino |
| label | Tipo de informacion que viaja por la conexion |

---

## 13. Tipos de informacion entre nodos

Los nodos podran intercambiar diferentes tipos de informacion.

| Tipo | Descripcion |
|---|---|
| file | Archivo cargado |
| dataset | Tabla o base de datos procesada |
| document | Documento extraido o interpretado |
| text | Texto plano |
| sql_result | Resultado de consulta SQL |
| audit_result | Resultado de analisis de auditoria |
| ai_result | Respuesta generada por IA |
| report | Reporte generado |
| evidence | Evidencia documental |
| deadline | Termino o vencimiento |

---

## 14. Reglas de ejecucion

1. Un workflow debe tener al menos un nodo de entrada para ejecutarse.
2. Un nodo no debe ejecutarse si sus dependencias no han terminado.
3. Cada nodo debe registrar estado, tiempo de ejecucion y resultado.
4. Los outputs de un nodo deben poder pasar como inputs al siguiente nodo.
5. El Workflow Engine debe registrar logs por nodo.
6. Los errores deben detener el flujo o activar una regla de manejo de error.
7. La ejecucion debe ser reproducible para fines de auditoria.
8. El workflow debe poder ejecutarse sin depender directamente del frontend.
9. El usuario debe poder ejecutar un solo nodo para validar su resultado.
10. El usuario debe poder visualizar el resultado de un nodo antes de continuar.

---

## 15. Reglas de visualizacion de resultados

Cada nodo debe poder mostrar su resultado sin saturar la pantalla.

Reglas:

1. Al hacer clic en un nodo, se debe mostrar configuracion basica.
2. El resultado del nodo debe poder abrirse en un panel contextual.
3. Si el resultado es una tabla, debe mostrarse en vista tipo Excel.
4. Si el resultado es documento, debe mostrarse en visor documental.
5. Si el resultado es IA, debe mostrarse como analisis, resumen o preguntas.
6. El usuario debe poder fijar una vista si desea mantenerla abierta.
7. El usuario debe poder cerrar vistas para mantener limpio el canvas.

---

## 16. Ejemplo de workflow libre con datos

Flujo:

Cargar Archivo
   -> Detectar Tipo
   -> Convertir a Tabla de Analisis
   -> Vista de Datos
   -> Consulta SQL
   -> Detectar Duplicados
   -> IA Auditora
   -> Exportar Resultado

Objetivo:

Permitir que el usuario cargue una base Excel, la convierta a tabla de analisis, la visualice, ejecute herramientas y obtenga resultados.

---

## 17. Ejemplo de workflow con varias bases

Flujo:

Cargar Bases Excel
   -> Detectar Estructuras
   -> Vista Comparativa
   -> Convertir a Tablas SQL
   -> Cruzar Informacion
   -> Detectar Diferencias
   -> IA Auditora
   -> Generar Hallazgo

Objetivo:

Permitir comparar varias bases y analizar relaciones entre ellas.

---

## 18. Ejemplo de workflow de auditoria viva

Flujo:

Inicio Auditoria
   -> Oficio de Requerimiento
   -> Termino Legal
   -> Recepcion de Evidencia
   -> Analisis Documental
   -> Analisis de Base
   -> Hallazgo Preliminar
   -> Observacion
   -> Seguimiento
   -> Informe Final

Objetivo:

Controlar una auditoria completa con etapas, terminos, evidencias, avances y resultados.

---

## 19. Reglas para auditoria viva

Cuando el workflow este en modo audit_procedure, debe poder manejar:

1. Avance porcentual.
2. Oficios.
3. Terminos legales.
4. Evidencias requeridas.
5. Evidencias recibidas.
6. Alertas de vencimiento.
7. Lineas verdes para plazos vigentes.
8. Lineas rojas para plazos vencidos.
9. Hallazgos preliminares.
10. Seguimiento de observaciones.
11. Informe final.

---

## 20. Integracion con IA

Un workflow podra conectar nodos de IA para:

- hacer preguntas sobre una base;
- explicar resultados;
- generar SQL;
- detectar riesgos;
- sugerir hallazgos;
- redactar observaciones;
- resumir documentos;
- generar preguntas de auditoria.

Ejemplo:

Vista de Datos -> IA Auditora -> Generar Observacion

---

## 21. Integracion con SQL

Los datos cargados desde Excel, CSV o fuentes externas podran convertirse a tablas de analisis.

El usuario no tecnico podra usar herramientas visuales.

El usuario tecnico podra usar consultas SQL.

Ejemplo:

SELECT *
FROM compras
WHERE monto > 50000;

---

## 22. Relacion con otros documentos

Este documento se complementa con:

- NODE_SCHEMA.md
- ARCHITECTURE.md
- PROJECT_CONTROL.md

---

## 23. Estado actual

Estado: Draft

Fase actual: Phase 1 - Architecture Lock

Siguiente documento: NODE_SCHEMA.md