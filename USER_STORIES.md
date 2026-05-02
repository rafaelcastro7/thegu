# Historias de Usuario: GobIA Auditor

## 1. Detección de Fraccionamiento Contractual
**Como** auditor de la Contraloría,
**Quiero** que el sistema identifique automáticamente grupos de contratos de un mismo proveedor con objetos similares y proximidad temporal,
**Para** detectar posibles casos de fraccionamiento que eluden la licitación pública.

### Criterios de Aceptación:
- El sistema debe agrupar contratos por NIT de proveedor y entidad.
- Debe calcular la similitud semántica de los objetos usando procesamieno de lenguaje natural.
- Debe aplicar un semáforo de riesgo (Rojo/Naranja/Verde) basado en umbrales configurables.
- Los casos de riesgo "Rojo" deben estar claramente resaltados.

## 2. Generación de Informes Forenses
**Como** investigador técnico,
**Quiero** generar un informe detallado y sustentado jurídicamente para cada hallazgo sospechoso,
**Para** tener una base sólida para iniciar una investigación formal.

### Criterios de Aceptación:
- El informe debe incluir un resumen ejecutivo, hechos detectados e indicadores técnicos.
- Debe citar textualmente la normativa aplicable (Ley 80, Ley 1474, etc.) mediante RAG.
- El lenguaje debe ser condicional e indiciario ("podría", "sugiere").
- Debe permitir la copia del informe al portapapeles.

## 3. Visualización y Filtrado de Resultados
**Como** analista de datos,
**Quiero** filtrar y ordenar la bandeja de hallazgos por nivel de riesgo y valor,
**Para** priorizar mi trabajo en los casos de mayor impacto fiscal.

### Criterios de Aceptación:
- Opción de filtrar por nivel de riesgo (Rojo, Naranja, Verde, Todos).
- Opción de ordenar por valor total, similitud o fecha.
- Visualización clara del nombre del proveedor, valor total y puntaje de similitud en la lista.

## 4. Personalización de Umbrales de Riesgo
**Como** administrador del sistema,
**Quiero** ajustar los valores de los umbrales que disparan las alertas,
**Para** adaptar la herramienta a diferentes contextos de auditoría o cambios normativos.

### Criterios de Aceptación:
- Interfaz para ajustar Similitud (%), Ventana Temporal (Días) y Valor Mínimo (COP).
- Validación de que los valores ingresados sean lógicos (ej. similitud entre 0 y 100).
- Aplicación de los nuevos umbrales en tiempo real al realizar nuevas búsquedas.

## 5. Auditoría del Sistema (Logging)
**Como** responsable de seguridad,
**Quiero** un registro de todas las acciones importantes realizadas en la plataforma,
**Para** garantizar la trazabilidad y el buen uso de la herramienta.

### Criterios de Aceptación:
- Registro de búsquedas (entidad buscada).
- Registro de generación de informes (proveedor analizado).
- Registro de exportaciones de datos.
- Los logs deben incluir timestamp y acción realizada.
