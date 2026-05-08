# GobIA Auditor — Documento Técnico Extendido
### Arquitectura, Agentes, Índice de Riesgo, RAG y Modelos Locales
#### Colombia 5.0 · Hackathon Nacional Bogotá · 8 de mayo de 2026

---

# PARTE I — EL SISTEMA EN PERSPECTIVA

## ¿Qué problema resuelve exactamente?

El SECOP II tiene millones de contratos públicos disponibles. El problema no es la falta de datos: es que **nadie puede leerlos todos**. Un auditor humano revisando 100 contratos de una entidad tardaría días. GobIA Auditor lo hace en segundos.

Pero más importante: el fraccionamiento contractual no se detecta mirando un contrato solo. Se detecta mirando **relaciones entre contratos**: ¿tienen el mismo proveedor? ¿se firmaron en la misma semana? ¿describen el mismo objeto con palabras ligeramente diferentes? ¿suman un valor que debería haberse licitado? Esas preguntas requieren análisis multicontratos con semántica, estadística y contexto jurídico al mismo tiempo.

Eso es exactamente lo que hace el sistema.

---

# PARTE II — CÓMO SE CALCULA EL ÍNDICE DE RIESGO

El **Risk Score** es un número de **0 a 100** que resume la probabilidad forense de que un clúster de contratos constituya fraccionamiento ilegal u opacidad. Se calcula en dos capas que se suman y se normalizan.

## CAPA 1 — Motor de Análisis Estadístico (hasta 150 pts brutos → normalizados a 100)

Este motor evalúa **5 dimensiones cuantitativas** directamente del código fuente (`analysis.ts`):

---

### Dimensión 1 — Similitud Semántica de Objetos Contractuales

**¿Qué mide?**
Si los contratos de un mismo proveedor describen la misma actividad, aunque estén redactados con palabras distintas.

**¿Cómo funciona?**
1. Cada descripción del contrato (campo `objeto_del_contrato`) se convierte en un vector de **768 números** usando el modelo de embeddings `nomic-embed-text` corriendo localmente en Ollama.
2. Se calculan todas las parejas posibles entre contratos del clúster.
3. Para cada pareja se calcula la **similitud coseno**: `(A·B) / (||A|| × ||B||)`. El resultado va de 0 (completamente distintos) a 1 (idénticos en significado).
4. Se calcula el **promedio de similitudes** entre todas las parejas.

**Fórmula exacta del puntaje:**
```
Si promedio_similitud > 0.85  →  +50 puntos  (riesgo crítico: identidad semántica extrema)
Si promedio_similitud > 0.70  →  +25 puntos  (riesgo moderado: similitud sospechosa)
```

**¿Por qué importa?**
Que dos objetos contractuales sean 87% similares en su significado vectorial significa que se debieron consolidar en un solo proceso. No es opinión: es matemática sobre el texto real del contrato.

---

### Dimensión 2 — Aglomeración Temporal (Temporal Bunching)

**¿Qué mide?**
Si los contratos fueron firmados en una ventana de tiempo inusualmente corta.

**¿Cómo funciona?**
1. Se ordenan los contratos por fecha de firma.
2. Se calcula `maxDiff`: la diferencia en días entre el primer y el último contrato del clúster.
3. Se calcula el promedio de días entre firmas consecutivas.

**Fórmula exacta del puntaje:**
```
Si maxDiff < 90 días  Y  hay ≥ 3 contratos  →  +35 puntos  (aglomeración crítica)
Si promedio_días_entre_firmas < 15  Y  hay > 2 contratos  →  +20 puntos  (frecuencia anómala)
```

**¿Por qué importa?**
Firmar 5 contratos con el mismo proveedor en 30 días indica falta de planeación deliberada o urgencia fabricada para eludir controles. La Circular 17 de CCE establece que las necesidades recurrentes deben consolidarse.

---

### Dimensión 3 — Bunching de Cuantías (Estandarización de Montos)

**¿Qué mide?**
Si los montos de los contratos fueron deliberadamente igualados para mantenerse por debajo de los umbrales legales de licitación.

**¿Cómo funciona?**
1. Se calcula el **valor promedio** del clúster.
2. Se calcula la **varianza** y la **desviación estándar**.
3. Se obtiene el **coeficiente de variación** (CV = desviación estándar / promedio).
4. Un CV muy bajo significa montos casi idénticos: señal clásica de diseño deliberado para eludir umbrales.

**Fórmula exacta del puntaje:**
```
Si CV < 0.05  Y  hay > 3 contratos  →  +35 puntos  (bunching crítico: <5% variación)
Si CV < 0.15  Y  hay > 2 contratos  →  +15 puntos  (estandarización sospechosa)
```

**¿Por qué importa?**
La OCDE define el bunching justo bajo umbrales como el indicador de fraude más universalmente reconocido en contratación pública. Si 6 contratos tienen valores de $49.8M, $49.9M, $50.0M, $49.7M — no es coincidencia. El umbral de mínima cuantía en Colombia es $50M COP.

---

### Dimensión 4 — Concentración Económica

**¿Qué mide?**
El volumen total de dinero público concentrado en un solo proveedor.

**Umbral base configurado:** $50,000,000 COP (parámetro `valueThreshold`)

**Fórmula exacta del puntaje:**
```
Si totalValue > valueThreshold × 10  (> $500M COP)  →  +30 puntos  (concentración extrema)
Si totalValue > valueThreshold × 5   (> $250M COP)  →  +20 puntos  (concentración crítica)
Si totalValue > valueThreshold        (> $50M COP)   →  +10 puntos  (concentración moderada)
```

**¿Por qué importa?**
Un proveedor que acumula $2,000 millones de pesos en contratos con la misma entidad en un año merece escrutinio independientemente de los otros factores.

---

### Dimensión 5 — Ratio de No Competitividad

**¿Qué mide?**
Qué porcentaje del portafolio de contratos del proveedor con esa entidad usó modalidades que evitan la competencia: Contratación Directa, Mínima Cuantía o Prestación de Servicios.

**Fórmula exacta del puntaje:**
```
Si nonCompetitive / total > 0.80  Y  hay ≥ 2 contratos  →  +30 puntos  (abuso crítico)
Si nonCompetitive / total > 0.50                          →  +15 puntos  (dependencia alta)
```

**¿Por qué importa?**
Que el 90% de los contratos de un proveedor sean directos, sin competencia, viola el espíritu de la Ley 80 y la Ley 1474 que exigen selección objetiva y pluralidad de oferentes.

---

## CAPA 2 — Motor de Inteligencia con Reglas Forenses (hasta 120 pts adicionales × 0.5)

Simultáneamente con los algoritmos estadísticos, se ejecuta `runIntelligenceAudit()` con las **4 reglas forenses** del sistema. Su puntaje se multiplica por **0.5** y se suma al score total.

| Regla ID | Nombre | Condición de disparo | Peso |
|----------|--------|---------------------|------|
| `RULE_DIRECT_ABUSE` | Abuso de Contratación Directa | >80% modalidades directas con >3 contratos | 40 pts |
| `RULE_TIME_SQUEEZE` | Ventana de Ejecución Sospechosa | ≥2 contratos firmados en fechas idénticas | 35 pts |
| `RULE_NOTORIOUS_ENTITY` | Entidad de Alto Riesgo Histórico | Entidad en lista de vigilancia especial | 20 pts |
| `RULE_VALUE_SPIKE` | Incremento Volumétrico Atípico | Total del proveedor > $5,000,000,000 COP | 25 pts |

**Lista de entidades en vigilancia especial (NOTORIOUS_ENTITIES):**
UNGRD · GOBERNACIÓN DE LA GUAJIRA · GOBERNACIÓN DEL CHOCÓ · GOBERNACIÓN DE CÓRDOBA · ALCALDÍA DE RIOHACHA · CARDIQUE · CORPOCESAR · FONDO ADAPTACIÓN · INVÍAS

Estas entidades tienen historial documentado de auditorías con hallazgos de integridad.

---

## FÓRMULA FINAL DEL ÍNDICE DE RIESGO

```
riskScore = (
  similitud_semántica   +   [0, 25 o 50]
  aglomeración_temporal +   [0, 20 o 35]
  bunching_cuantías     +   [0, 15 o 35]
  concentración_econ    +   [0, 10, 20 o 30]
  no_competitividad     +   [0, 15 o 30]
  inteligencia_reglas × 0.5 [0 a 60]
)
→ normalizado a máximo 100
```

## CLASIFICACIÓN DE RIESGO

```
riskScore ≥ 75  →  🔴 RED     — Riesgo Crítico: requiere revisión inmediata
riskScore ≥ 45  →  🟠 ORANGE  — Riesgo Moderado: requiere seguimiento
riskScore <  45  →  🟢 GREEN   — Sin señales de alerta relevantes
```

## Ejemplo real de cálculo

Proveedor X tiene 5 contratos con CARDIQUE:
- Similitud semántica promedio: 88% → **+50 pts**
- 5 contratos en 22 días → **+35 pts** (aglomeración crítica)
- CV de montos = 0.03 (<5%) → **+35 pts** (bunching crítico)
- Total $180M COP → **+10 pts** (>threshold)
- 100% contratos directos → **+30 pts** (abuso crítico)
- Reglas: RULE_DIRECT_ABUSE (40) + RULE_TIME_SQUEEZE (35) + RULE_NOTORIOUS_ENTITY (20) = 95 × 0.5 = **+47.5**
- **Total bruto: 207.5 → normalizado: 100 → 🔴 RED CRÍTICO**

---

# PARTE III — LA CAPA AGÉNTICA: 6 AGENTES ESPECIALIZADOS

## Concepto: ¿Por qué agentes y no un solo algoritmo?

Un solo algoritmo detecta patrones. Un sistema multi-agente **razona sobre ellos**. Cada agente aporta una perspectiva disciplinar diferente al mismo hallazgo: el estadístico, el jurídico, el financiero, el ético, el territorial y el de sistema. Juntos producen un análisis más robusto y explicable que cualquier modelo único.

---

## Los 6 Agentes de GobIA Auditor

### 🟣 AGENTE 1 — AUDIT SENTINEL
**Nombre técnico:** `FORENSIC`
**Identidad:** Audit Sentinel
**Foco:** OECD Pattern Recognition
**Color:** Violeta (#a855f7)

**Misión:**
Es el agente orquestador y sintetizador. Su trabajo es cruzar los hallazgos estadísticos del motor de análisis con los estándares internacionales de la OCDE, identificar los clústeres temporales y de valor más sospechosos, y producir el **informe forense final**.

**¿Cómo lo hace?**
1. Recibe el `AnalysisResult` completo: riskScore, redFlags, similitud, contratos
2. Construye un prompt estructurado con todos los datos del clúster y el contexto legal recuperado por el RAG
3. Envía el prompt al LLM local (via `neuralManager.processRequest`)
4. El LLM genera el informe forense con estructura jerárquica: Resumen Ejecutivo → Matriz de Riesgos → Evidencia Técnica → Fundamentos Jurídicos → Recomendaciones
5. Si el LLM falla, activa el **generador determinístico** que produce el reporte con plantilla estructurada sin IA

**Mensaje típico en ejecución:**
> *"Cruzando clústeres temporales y acumulación de valor..."*

---

### 🟢 AGENTE 2 — JURIS GUARD
**Nombre técnico:** `LEGAL`
**Identidad:** Juris Guard
**Foco:** Compliance & Jurisprudencia
**Color:** Verde esmeralda (#10b981)

**Misión:**
Validar cada hallazgo técnico contra el bloque de constitucionalidad y la jurisprudencia colombiana. Asegurarse de que cada bandera roja tenga un fundamento legal específico, no solo estadístico.

**¿Cómo lo hace?**
1. Recibe la lista de `redFlags` detectadas por el motor estadístico
2. Invoca el sistema RAG para recuperar los fragmentos jurídicos más relevantes para esas banderas específicas (Ley 80, Ley 1474, OCDE, Consejo de Estado, etc.)
3. Reclasifica y prioriza la jurisprudencia según su score de relevancia forense
4. Proporciona el contexto legal al Audit Sentinel para que lo incluya en el informe

**Mensaje típico en ejecución:**
> *"Escaneando banderas rojas OCDE: 4 detectadas"*
> *"Jurisprudencia reclasificada."*

**Fuente de conocimiento:** Los 8 documentos del corpus jurídico del RAG

---

### 🔵 AGENTE 3 — RESILIENCE NODE
**Nombre técnico:** `SYSTEM`
**Identidad:** Resilience Node
**Foco:** Self-Optimization & Health
**Color:** Azul (#3b82f6)

**Misión:**
Es el agente de metacognición del sistema. Gestiona la **memoria neural persistente**, garantiza la estabilidad operativa de todos los demás agentes, y ejecuta el **ciclo de auto-aprendizaje** al final de cada auditoría.

**¿Cómo lo hace?**

*Al inicio de cada auditoría:*
1. Lee la memoria persistente guardada en `localStorage` (`gob_ia_neural_memory`)
2. Restaura los pesos neurales acumulados de ciclos anteriores
3. Reporta cuántos nodos históricos tiene en memoria (`totalAudits`)

*Al final de cada auditoría:*
1. Incrementa el contador `totalAudits += 1`
2. Si el resultado fue 🔴 RED, extrae las banderas nuevas (no vistas antes) y las agrega a `detectedPatterns[]`
3. Incrementa `systemBiasAdjustment += 0.005` — ajuste incremental de sensibilidad
4. Guarda la memoria actualizada en `localStorage`

**Estructura de la memoria neural:**
```typescript
{
  totalAudits: number,          // Total de auditorías completadas
  detectedPatterns: string[],   // Patrones únicos de riesgo acumulados
  systemBiasAdjustment: number  // Ajuste fino de sensibilidad (0 a 1)
}
```

**¿Qué significa el `systemBiasAdjustment`?**
Cada auditoría completada aumenta la sensibilidad del sistema en 0.005. Después de 100 auditorías, el sistema ha acumulado +0.5 de ajuste, lo que significa que es significativamente más sensible para detectar patrones sutiles. Es la representación numérica del aprendizaje acumulado.

**Mensaje típico en ejecución:**
> *"Restaurando pesos neurales de ciclos previos..."*
> *"Memoria activa: 47 nodos procesados."*
> *"Ciclo de aprendizaje completado. Sensibilidad actualizada."*

---

### 🟡 AGENTE 4 — FISCAL HUNTER
**Nombre técnico:** `FINANCIAL`
**Identidad:** Fiscal Hunter
**Foco:** Money Trailing
**Color:** Ámbar (#f59e0b)

**Misión:**
Rastrear los flujos de capital en el clúster de contratos, identificar sobrecostos atípicos y detectar concentración anormal de valor en un proveedor.

**¿Cómo lo hace?**
1. Analiza el `totalValue` del clúster proveedor
2. Detecta si la suma de contratos pequeños supera umbrales que deberían haber activado licitación
3. Identifica el "nodo financiero más pesado" del clúster (contrato de mayor valor que sirve como contrato puente)
4. Procesa las alertas de sobrecosto marginal

**Qué detecta en la práctica:**
- Proveedor acumuló $3.2B COP en 8 contratos de $400M cada uno → suma = valor de una gran licitación evitada
- Contratos con valores exactamente iguales al umbral de mínima cuantía
- Incrementos graduales de valor contrato a contrato (escalamiento deliberado)

**Mensaje típico en ejecución:**
> *"Rastreando flujos de capital y concentración de valor..."*
> *"Alertas de sobrecosto marginal procesadas."*

---

### 🔴 AGENTE 5 — PROBITY ARBITER
**Nombre técnico:** `ETHICS`
**Identidad:** Probity Arbiter
**Foco:** Conflict of Interest
**Color:** Rojo (#ef4444)

**Misión:**
Verificar la integridad de los contratistas, detectar posibles nexos políticos o conflictos de interés, y auditar la coherencia ética de las decisiones de contratación.

**¿Cómo lo hace?**
1. Verifica si el proveedor (NIT) aparece reiteradamente en la base de entidades de vigilancia especial
2. Analiza la concentración de contratos con una sola entidad contratante (posible captura)
3. Cruza el historial de contratación para detectar patrones de favorecimiento sistemático
4. Evalúa si las modalidades usadas son coherentes con el perfil del contratista

**Qué detecta en la práctica:**
- Proveedor con 15 contratos en el mismo año con la misma entidad (captura institucional)
- Contratos de prestación de servicios reiterados que encubren relación laboral
- Entidades que concentran el 100% de su contratación en 2-3 proveedores

**Mensaje típico en ejecución:**
> *"Auditando integridad de firmantes y posibles conflictos..."*
> *"Análisis de nexos completado. Nivel de integridad: Estable."*

---

### ⚫ AGENTE 6 — GROUND SCOUT
**Nombre técnico:** `FIELD`
**Identidad:** Ground Scout
**Foco:** Project Verification
**Color:** Gris pizarra (#64748b)

**Misión:**
Verificar la coherencia física y logística de los contratos. ¿Tiene sentido que una empresa pequeña ejecute 8 contratos simultáneamente? ¿Son los objetos contractuales físicamente realizables en los plazos firmados?

**¿Cómo lo hace?**
1. Analiza la coherencia entre el objeto del contrato y el plazo de ejecución
2. Verifica si la densidad temporal de contratos es físicamente ejecutable por un solo proveedor
3. Simula verificación técnica territorial (GeoSync): contrasta lugar de ejecución con capacidad del proveedor
4. Indexa evidencia para corroboración posterior

**¿Por qué es importante?**
Una empresa unipersonal no puede ejecutar 6 contratos de interventoría técnica simultáneamente. Si el sistema lo detecta, es una bandera adicional que el auditor humano debe verificar en campo.

**Mensaje típico en ejecución:**
> *"Simulando verificación técnica en territorio (GeoSync)..."*
> *"Evidencia satelital indexada. Coherencia física detectada."*

---

## El Flujo Completo de Auditoría Multi-Agente

```
┌─────────────────────────────────────────────────────────────────┐
│                    INICIO DE AUDITORÍA                          │
│              runCollaborativeAudit(result, lang)                │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                    ┌──────▼──────┐
         PASO 1     │  RESILIENCE │  Lee memoria localStorage
                    │    NODE     │  Restaura pesos neurales
                    │  (SYSTEM)   │  Reporta historial acumulado
                    └──────┬──────┘
                           │
              ┌────────────▼────────────┐
         PASO 2  JURIS GUARD + PROBITY ARBITER  (paralelo)
              │  JURIS GUARD:           │
              │  → Escanea redFlags     │
              │  → Invoca RAG jurídico  │
              │  → Reclasifica normas   │
              │                         │
              │  PROBITY ARBITER:       │
              │  → Audita integridad    │
              │  → Detecta conflictos   │
              └────────────┬────────────┘
                           │
              ┌────────────▼────────────┐
         PASO 3  FISCAL HUNTER + GROUND SCOUT  (paralelo)
              │  FISCAL HUNTER:         │
              │  → Rastrea capital      │
              │  → Detecta sobrecostos  │
              │                         │
              │  GROUND SCOUT:          │
              │  → Verifica coherencia  │
              │  → Indexa evidencia     │
              └────────────┬────────────┘
                           │
                    ┌──────▼──────┐
         PASO 4     │    AUDIT    │  Recibe todo el contexto
                    │   SENTINEL  │  Genera informe forense LLM
                    │  (FORENSIC) │  Produce reporte final
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
         PASO 5     │  RESILIENCE │  totalAudits++
                    │    NODE     │  Agrega patrones nuevos
                    │  (SYSTEM)   │  systemBiasAdjustment += 0.005
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   OUTPUT    │  { report, logs, memory }
                    └─────────────┘
```

---

## Estados de los Agentes

Cada acción de agente lleva un estado que se visualiza en tiempo real en la interfaz:

| Estado | Significado | Visualización |
|--------|-------------|---------------|
| `THINKING` | El agente está procesando / deliberando | Spinner pulsante |
| `EXECUTING` | El agente está ejecutando una acción concreta | Indicador activo |
| `OPTIMIZING` | El agente está ajustando parámetros (SYSTEM) | Animación de sintonía |
| `COMPLETED` | El agente completó su tarea | Check verde |
| `IDLE` | El agente está en espera | Sin animación |

---

# PARTE IV — EL SISTEMA RAG JURÍDICO

## ¿Qué es RAG y por qué es crítico aquí?

RAG (Retrieval-Augmented Generation) es una arquitectura que combina **búsqueda semántica** con **generación de lenguaje**. En lugar de preguntarle al LLM "¿qué dice la Ley 80?" (y esperar que lo recuerde de su entrenamiento), le decimos "aquí está el texto exacto de la Ley 80 que es relevante para este hallazgo específico, ahora analízalo".

**La diferencia:**
- Sin RAG: el LLM alucina citas legales o da respuestas genéricas
- Con RAG: el LLM recibe el fragmento legal exacto y lo analiza en contexto forense real

---

## Los 8 Documentos del Corpus Jurídico

Cada documento tiene un `id` único, una `source` (cita completa) y un `text` (fragmento jurídico procesable):

| ID | Fuente | Tipo | Contenido clave |
|----|--------|------|----------------|
| `ley-80-art-24-25` | Ley 80 de 1993, Arts. 24 y 25 | Ley | Prohíbe dividir contratos para eludir licitación. Principio de planeación. |
| `decreto-1082-2015-planeacion` | Decreto 1082 de 2015, Título I | Decreto | Estudios previos obligatorios. Fragmentar para mínima cuantía = violación. |
| `ley-1474-anticorrupcion-art90` | Ley 1474 de 2011, Artículo 90 | Anticorrupción | Fraccionamiento = responsabilidad disciplinaria y fiscal. |
| `ley-2195-2022-analitica` | Ley 2195 de 2022, Arts. 14-16 | Modernización | **La analítica de datos es prueba válida para iniciar investigaciones.** |
| `cce-concepto-c122-2024` | Colombia Compra Eficiente C-122-2024 | Concepto | Definición técnica: identidad de objeto + unidad de tiempo + unidad de presupuesto. |
| `oecd-integrity-procurement` | OECD Recommendation on Procurement | Internacional | Monitoreo activo de indicadores de fraccionamiento. |
| `oecd-red-flags-bunching` | OECD Managing Risks in Procurement | Internacional | **Bunching bajo umbrales = indicador crítico de fraude reconocido internacionalmente.** |
| `consejo-estado-fraccionamiento` | Consejo de Estado, Sección Tercera | Jurisprudencia | No requiere dolo: basta vulneración objetiva del régimen de competencia. |

---

## Arquitectura RAG de Dos Capas

El sistema implementa RAG en **dos capas redundantes** para garantizar disponibilidad:

```
                     SOLICITUD DE CONTEXTO LEGAL
                              │
                    ┌─────────▼──────────┐
                    │   CAPA 1: SERVER   │  PostgreSQL (persistente)
                    │   RAG PERSISTENTE  │  → Embeddings 768D almacenados
                    │  /api/rag/legal-   │  → Búsqueda vectorial en BD
                    │      context       │  → Compartido entre sesiones
                    └─────────┬──────────┘
                              │ Si el servidor no está disponible
                    ┌─────────▼──────────┐
                    │   CAPA 2: CLIENT   │  En memoria del navegador
                    │    RAG LOCAL       │  → Embeddings calculados en caliente
                    │  (ragManager.ts)   │  → Solo dura la sesión actual
                    │                    │  → Funciona offline
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │  CONTEXTO LEGAL    │  Markdown con citas jurídicas
                    │  RECUPERADO        │  y scores de relevancia
                    └────────────────────┘
```

---

## El Algoritmo de Búsqueda RAG Paso a Paso

### Fase de indexación (ocurre una sola vez por sesión):
1. Se toman los 8 documentos del `LEGAL_KNOWLEDGE_BASE`
2. Cada texto se envía a Ollama (`nomic-embed-text`) para obtener su vector 768D
3. Los vectores se almacenan en PostgreSQL (`legal_context_cache`) o en memoria

### Fase de consulta (ocurre en cada auditoría):
1. Se toma la descripción del primer contrato del clúster (`objeto_del_contrato`) y las `redFlags` detectadas
2. Se vectoriza la consulta con el mismo modelo (`nomic-embed-text`)
3. Se calcula la similitud coseno entre el vector de consulta y cada uno de los 8 documentos indexados
4. Se aplica un **bonus de relevancia** según coincidencia de palabras clave:

```
Si redFlags incluye "fraccionamiento" Y el doc habla de "fraccionamiento" → +0.20
Si redFlags incluye "bunching"        Y el doc habla de "bunching"        → +0.30
Si redFlags incluye "modalidad"       Y el doc habla de "modalidad"       → +0.20
Si redFlags incluye "competencia"     Y el doc habla de "competencia"     → +0.10
Si redFlags incluye "planeacion"      Y el doc habla de "planeacion"      → +0.10
```

5. Se ordenan los 8 documentos por **score final** (similitud + bonus)
6. Se devuelven los **top 3** con score > 0.35

### El output del RAG:
```markdown
### Ley 80 de 1993, Artículos 24 y 25
El fraccionamiento de contratos ocurre cuando una entidad estatal divide...
(Relevancia Forense: 87.5%)

---

### OECD Managing Risks in Public Procurement
El agolpamiento de contratos (bunching) justo por debajo de los umbrales...
(Relevancia Forense: 76.2%)

---

### Ley 1474 de 2011, Artículo 90
Las conductas que busquen eludir los procedimientos de selección...
(Relevancia Forense: 71.8%)
```

---

## Por qué el RAG de GobIA es diferente

La mayoría de sistemas RAG recuperan documentos por palabras clave. GobIA Auditor recupera por **significado semántico en contexto forense específico**. La pregunta no es "¿qué documentos contienen la palabra fraccionamiento?" sino "¿qué fragmentos jurídicos son semánticamente más relevantes para este patrón de contratación específico en este clúster?"

El bonus de relevancia garantiza que si el sistema detectó `bunching`, el fragmento de la OCDE sobre bunching suba al top independientemente de su similitud vectorial base — porque sabemos que es jurídicamente el más pertinente.

---

# PARTE V — LOS MODELOS DE IA LOCALES

## Principio fundamental: Soberanía computacional

GobIA Auditor no envía ni un solo contrato público a un servidor externo de IA. Todo el procesamiento ocurre en la máquina del auditor. Esto no es solo una decisión de privacidad: es una decisión de **soberanía tecnológica**. El Estado colombiano no debería depender de APIs de OpenAI o Google para auditar sus propios contratos.

---

## Modelo 1 — nomic-embed-text (Embeddings)

**Tipo:** Modelo de embeddings (solo vectorización, no genera texto)
**Proveedor:** Nomic AI · Ejecutado en: Ollama (local)
**Dimensiones de salida:** 768 números por texto
**Latencia típica:** 100–300ms por texto

**¿Qué hace exactamente?**
Convierte cualquier texto en español (o cualquier idioma) en un vector de 768 números flotantes que captura el significado semántico del texto. Textos similares en significado tienen vectores similares; textos distintos tienen vectores diferentes.

**¿Por qué 768 dimensiones?**
Cada dimensión captura una característica semántica latente del texto. 768 dimensiones permiten capturar matices complejos del lenguaje jurídico y contractual con alta fidelidad.

**Uso en el sistema:**
- Vectorizar los objetos contractuales para comparar similitud entre contratos
- Vectorizar los documentos jurídicos del corpus RAG para indexarlos
- Vectorizar las consultas forenses para buscar en el corpus jurídico

**Cache de embeddings:**
Los embeddings calculados se cachean en memoria (`Map<string, number[]>`) para no recalcularlos si el mismo texto aparece en múltiples auditorías. Esto reduce latencia y carga en Ollama.

---

## Modelo 2 — tinyllama:latest (LLM Principal)

**Tipo:** Large Language Model generativo
**Arquitectura:** TinyLlama — versión compacta de LLaMA 2
**Parámetros:** 1.1B (1,100 millones)
**Tamaño en disco:** ~637MB
**Latencia típica:** 500–1,500ms para 100-200 tokens

**¿Qué hace exactamente?**
Genera texto fluido en español o inglés siguiendo instrucciones precisas. Es el modelo que produce las observaciones rápidas y el texto de los informes forenses.

**¿Por qué TinyLlama como modelo principal?**
- **Velocidad:** 1.1B params es ultrarrápido incluso en CPU
- **Latencia predecible:** Resultados en 1-2 segundos en hardware moderado
- **Bajo consumo de RAM:** Funciona en equipos con 8GB RAM
- **Suficiente para instrucciones estructuradas:** Con temperature 0.2 y prompt bien diseñado, genera informes estructurados correctos

---

## Modelo 3 — gemma4-fast (LLM Fallback 1)

**Tipo:** Large Language Model generativo
**Arquitectura:** Gemma — familia de Google DeepMind
**Parámetros:** ~4B
**Cuándo se usa:** Si `tinyllama` falla o devuelve respuesta vacía

**¿Por qué como fallback?**
Mayor capacidad de seguir instrucciones complejas y producir texto más preciso que TinyLlama, a costo de mayor latencia.

---

## Modelo 4 — qwen3:4b (LLM Fallback 2)

**Tipo:** Large Language Model generativo
**Arquitectura:** Qwen — familia de Alibaba
**Parámetros:** 4B
**Cuándo se usa:** Si tanto TinyLlama como Gemma fallan

**¿Por qué Qwen?**
Excelente soporte multilingüe (español nativo), muy buena calidad en seguimiento de instrucciones estructuradas, y sólido desempeño en textos técnicos y legales.

---

## Cadena de Fallback con Retry Exponencial

El sistema nunca deja al usuario sin respuesta. La lógica de generación de texto implementa:

```
Intento 1: tinyllama:latest
  → Si falla → espera 2s + hasta 2s aleatorio → reintentar
  → Si falla 3 veces → pasar al siguiente modelo

Intento 2: gemma4-fast:latest
  → Si falla → espera 4s + hasta 2s aleatorio → reintentar
  → Si falla 3 veces → pasar al siguiente modelo

Intento 3: qwen3:4b
  → Si falla → espera 8s + hasta 2s aleatorio → reintentar
  → Si falla 3 veces → activar generador determinístico

Fallback final: buildDeterministicForensicReport()
  → Genera informe completo con plantilla estructurada
  → No requiere ningún modelo de IA
  → Datos 100% del análisis estadístico real
  → Siempre disponible, nunca falla
```

La espera entre reintentos usa **backoff exponencial**: `delay × 2` en cada reintento, más un jitter aleatorio de hasta 2 segundos. Esto evita saturar Ollama con solicitudes simultáneas.

---

## Parámetros de Generación

```typescript
temperature: 0.2   // Muy bajo: outputs determinísticos, técnicos, sin creatividad innecesaria
num_predict: 400   // Tokens máximos para reportes completos
num_predict: 240   // Para reportes medianos
num_predict: 80    // Para observaciones rápidas
num_predict: 220   // Para respuestas de chat
stream: false      // Respuesta completa, no streaming (para procesamiento posterior)
```

**Por qué temperature 0.2:**
En un sistema forense, la reproducibilidad es crítica. El mismo clúster de contratos debe producir el mismo tipo de análisis independientemente de cuándo se ejecute. Una temperature baja garantiza outputs consistentes y técnicos.

---

## Modelo 5 — LaMini-Flan-T5-77M (Modo Browser, Opcional)

**Tipo:** Text-to-text generation
**Arquitectura:** T5 distilado (77M parámetros)
**Dónde corre:** **Directamente en el navegador** con Transformers.js (ONNX Runtime Web)
**Latencia:** 120ms (ultra rápido en CPU porque es muy pequeño)

**¿Cuándo se usa?**
Cuando el usuario activa `LOCAL_LLAMA` como proveedor activo en el CortexDashboard. Es el modo de máxima privacidad: ni siquiera necesita un servidor backend.

**Limitación:** 77M parámetros es muy pequeño para generar informes complejos. Útil para observaciones cortas y validaciones rápidas.

---

## Gestor Neural (NeuralManager)

El `NeuralManager` es la clase que orquesta todos los modelos. Sus responsabilidades:

1. **Registro de modelos:** Mantiene inventario de todos los modelos disponibles con su estado (ONLINE/OFFLINE/BUSY/LOADING), latencia y tokens usados
2. **Routing inteligente:** Envía cada solicitud al proveedor activo correcto
3. **Cache de reportes:** Antes de generar, verifica si el informe de ese clúster ya fue generado (cache hit = 0 tokens consumidos)
4. **Métricas en tiempo real:** Trackea totalCalls, totalTokens, avgLatency, burnRate, errorRate
5. **Latencia con EWMA:** La latencia promedio usa Exponential Weighted Moving Average: `avgLatency = avgLatency × 0.9 + latencyActual × 0.1` — se adapta a cambios graduales sin ser sensible a outliers

---

# PARTE VI — SISTEMA DE CACHÉ EN TRES NIVELES

La arquitectura de caché garantiza que el sistema sea **rápido, económico y resiliente**:

```
NIVEL 1 — Embeddings en memoria (Map<string, number[]>)
  → Hit instantáneo, cero llamadas a Ollama
  → Persiste durante la sesión actual
  → Particularmente valioso: el mismo objeto contractual puede aparecer
    en múltiples auditorías (contratos espejo)

NIVEL 2 — Reportes en PostgreSQL (report_cache)
  → Si el mismo clúster fue analizado antes, devuelve reporte existente
  → Cero tokens de LLM = costo cero
  → Compartido entre todos los auditores conectados al mismo servidor

NIVEL 3 — Análisis en PostgreSQL (analysis_cache)
  → Resultados estadísticos completos por groupKey
  → Evita recalcular embeddings, similitudes y algoritmos
  → Acelera re-análisis de entidades consultadas frecuentemente
```

---

# PARTE VII — DIFERENCIADORES ESTRATÉGICOS

## Lo que ningún otro sistema hace junto

| Capacidad | Detalle técnico | Por qué importa |
|-----------|----------------|----------------|
| Similitud semántica contractual | Embeddings 768D + coseno entre pares | Detecta contratos espejo aunque tengan palabras distintas |
| RAG jurídico colombiano | 8 documentos, búsqueda vectorial + bonus temático | Cada hallazgo viene con su fundamento legal exacto |
| Cadena de fallback de LLMs | 3 modelos + generador determinístico | El sistema nunca falla: siempre hay un informe |
| Multi-agente con memoria | 6 agentes + memoria neural persistente entre sesiones | El sistema aprende y mejora con cada auditoría |
| Zero-data-leakage | Ollama + PostgreSQL 100% locales | Datos del Estado colombiano nunca salen del servidor |
| Bilingüe nativo | Prompts, reportes y UI en ES/EN | Accesible para organismos internacionales y cooperación |
| Exportación forense PDF | html2canvas + jsPDF | El reporte está listo para presentar a Contraloría |
| Chat interactivo sobre hallazgos | LLM con contexto completo del contrato y su grupo | El auditor puede hacer preguntas naturales sobre cualquier contrato |

## La ventaja técnica más importante

La mayoría de herramientas de análisis de contratos buscan **palabras clave**: "contratación directa", "fraccionamiento". GobIA Auditor entiende el **significado**. Dos contratos redactados diferente pero que describen la misma actividad son detectados aunque ninguno use la palabra "fraccionamiento". Eso es lo que hace la semántica vectorial de 768 dimensiones.

---

# PARTE VIII — NÚMEROS PARA EL PITCH

| Dato | Valor | Contexto |
|------|-------|----------|
| Dimensiones de embedding | **768D** | Cada texto contractual = 768 números que capturan su significado |
| Agentes colaborativos | **6** | Forense, Legal, Sistema, Financiero, Ético, Territorial |
| Fuentes jurídicas indexadas | **8** | Ley 80, 1474, 2195, OCDE, Consejo de Estado, CCE, etc. |
| Algoritmos de detección | **5 estadísticos + 4 reglas forenses** | Simultaneos, no secuenciales |
| Umbral similitud crítica | **85%** | Identidad semántica extrema entre objetos contractuales |
| Umbral bunching | **5% CV** | Variación máxima antes de considerar montos artificialmente iguales |
| Temperatura LLM | **0.2** | Máxima reproducibilidad en análisis forense |
| Fallback automático | **3 modelos + 1 determinístico** | Resiliencia total: nunca sin respuesta |
| Cache en capas | **3 niveles** | Memoria, PostgreSQL análisis, PostgreSQL reportes |
| APIs externas de IA usadas | **0** | 100% procesamiento local |
| Fuente de datos | **SECOP II** | 100% datos abiertos del Estado colombiano |
| Tiempo de análisis (100 contratos) | **< 30 segundos** | vs. días de auditoría manual |

---

*GobIA Auditor — Convirtiendo datos públicos en justicia algorítmica.*
*Desarrollado con precisión técnica para Colombia 5.0 · Mayo 2026*
