# GobIA Auditor — Documento de Pitch
### Colombia 5.0 · Hackathon Nacional Bogotá · 8 de mayo de 2026
---

## EL PROBLEMA: Corrupción invisible en datos públicos

Colombia gasta más de **$120 billones de pesos anuales** en contratación pública a través del SECOP II. Sin embargo, el **fraccionamiento contractual** —dividir un contrato grande en varios pequeños para eludir controles de transparencia y competencia— es una de las modalidades de corrupción más difíciles de detectar manualmente.

**¿Por qué es tan difícil detectarlo?**

- Una entidad puede celebrar decenas de contratos con el mismo proveedor en el mismo mes, cada uno "dentro de la norma"
- Los objetos contractuales están redactados con ligeras variaciones para parecer distintos
- Los montos se diseñan para quedar justo bajo el umbral de la licitación pública
- Ningún auditor humano puede revisar miles de contratos simultáneamente con la velocidad y precisión necesarias

**El resultado:** Miles de millones de pesos en contratos fractionados, colusión entre proveedores y entidades, y opacidad sistémica que los controles actuales no alcanzan a cubrir.

---

## LA SOLUCIÓN: GobIA Auditor

> **Un agente de inteligencia artificial que consume contratos reales del SECOP II, los analiza con modelos de lenguaje locales y genera un score de riesgo forense por proveedor, con las señales de alerta específicas detectadas — en tiempo real, usando exclusivamente datos públicos del Estado colombiano.**

GobIA Auditor no es un buscador. Es un sistema de **auditoría forense automatizada** que combina análisis semántico, detección de anomalías estadísticas, recuperación de contexto jurídico (RAG) y generación de reportes con LLMs, todo funcionando de manera local y sin exponer datos a terceros.

---

## CÓMO FUNCIONA: El flujo completo

```
  SECOP II API          Análisis Forense         Reporte Final
(datos.gov.co)    →    Multi-Algoritmo      →    Forense + Legal
     ↓                       ↓                        ↓
Contratos reales       Score 0–100              PDF exportable
por entidad            Red/Orange/Green         con citas legales
```

### Paso 1 — Ingesta de Datos (SECOP II)
El sistema consulta en tiempo real la API pública del SECOP II (`datos.gov.co/resource/p6dx-8zbt.json`) usando queries SOQL seguros. Por cada búsqueda se obtienen hasta 100 contratos de una entidad específica (ej. "CARDIQUE", "SENA", "GOBERNACIÓN DE LA GUAJIRA"), normalizados y agrupados automáticamente por proveedor (NIT).

**Datos procesados por contrato:**
- ID proceso, entidad contratante, NIT entidad
- Objeto contractual (descripción completa)
- Modalidad de contratación, estado del proceso
- Valor total, nombre y NIT del contratista
- Fecha de firma

---

### Paso 2 — Análisis Forense Multi-Algoritmo

Por cada clúster de contratos de un mismo proveedor, se ejecutan **5 algoritmos simultáneos**:

#### 🔴 Algoritmo 1 — Similitud Semántica (Embeddings 768D)
- Vectoriza los objetos contractuales con el modelo `nomic-embed-text` (768 dimensiones)
- Compara todos los pares de contratos con similitud coseno
- **>85% similitud** entre 3+ contratos = RIESGO CRÍTICO (contratos espejo)
- **>70% similitud** = SOSPECHOSO

#### ⏱️ Algoritmo 2 — Aglomeración Temporal
- Calcula el span de días entre la primera y última firma del clúster
- Detecta la densidad temporal: firmas en ráfaga
- **<90 días** con ≥3 contratos = BANDERA ROJA
- **Promedio <15 días** entre firmas = SOSPECHOSO

#### 💰 Algoritmo 3 — Bunching de Cuantías
- Calcula la varianza estadística de los montos del clúster
- Montos anormalmente similares revelan diseño deliberado para eludir umbrales
- **<5% de variación** con ≥4 contratos = BUNCHING CRÍTICO (elusión de umbral)
- **<15% de variación** = SOSPECHOSO

#### 📊 Algoritmo 4 — Concentración Económica
- Suma total del clúster proveedor
- **>$5,000,000,000 COP** a un solo proveedor = CRÍTICO
- **>$500,000,000 COP** = MODERADO

#### ⚖️ Algoritmo 5 — Ratio de Competitividad
- Calcula qué porcentaje de contratos usaron modalidades no competitivas (contratación directa, mínima cuantía, prestación de servicios)
- **>80% modalidades directas** = CRÍTICO (elusión de licitación)
- **>50%** = MODERADO

**Score final:** Ponderación de los 5 algoritmos → puntuación 0–100 → clasificación **Red / Orange / Green**

---

### Paso 3 — Motor de Inteligencia (Reglas Forenses + Auto-Aprendizaje)

El sistema mantiene una **base de reglas forenses** inspirada en los estándares de la OCDE y la legislación colombiana:

| Regla | Descripción | Peso | Fuente |
|-------|-------------|------|--------|
| `RULE_DIRECT_ABUSE` | >80% modalidades de contratación directa | 40 pts | Ley 80 de 1993 |
| `RULE_TIME_SQUEEZE` | Múltiples firmas en ventana <48h | 35 pts | Circular 17 CCE |
| `RULE_NOTORIOUS_ENTITY` | Entidad en lista de vigilancia histórica | 20 pts | Histórico BHA |
| `RULE_VALUE_SPIKE` | Total proveedor >$5B COP | 25 pts | Análisis estadístico |

**Auto-aprendizaje:** El sistema genera dinámicamente nuevas reglas cuando detecta patrones no catalogados (ej. "Colusión Inter-Entidad" si >5 contratos coordinados entre entidades). La sensibilidad se autoajusta tras cada auditoría (+0.005 por ciclo).

---

### Paso 4 — RAG Jurídico (Recuperación de Contexto Legal)

Antes de generar el reporte, el sistema busca en su **base de conocimiento jurídico vectorial** el contexto legal más relevante para los hallazgos detectados:

**Fuentes indexadas (8 documentos jurídicos):**
1. Ley 80 de 1993 — Prohibición de fraccionamiento (Arts. 24 y 25)
2. Ley 1474 de 2011 — Estatuto Anticorrupción
3. Ley 1150 de 2007 — Eficiencia y transparencia
4. Ley 2195 de 2022 — Analítica preventiva e interoperabilidad
5. Circular 17 CCE — Planificación y agregación de demanda
6. Sentencia C-300/12 — Transparencia constitucional
7. CCE Concepto C-122-2024 — Definición de fraccionamiento
8. OCDE Red Flags & Bunching — Estándares internacionales

**Proceso RAG:**
- Las banderas de riesgo se vectorizan (nomic-embed-text)
- Se busca por similitud coseno contra los 8 documentos
- Bonus de relevancia cuando el texto jurídico menciona la misma bandera
- Se devuelven los top 3 fragmentos más relevantes con su score de relevancia forense

**Output ejemplo:**
```
### Ley 80 de 1993, Artículos 24 y 25
El fraccionamiento ocurre cuando una entidad divide artificialmente...
(Relevancia Forense: 87.5%)

### OCDE — Managing Risks in Public Procurement
El agolpamiento de contratos (bunching) es indicativo de...
(Relevancia Forense: 76.2%)
```

---

### Paso 5 — Auditoría Multi-Agente Colaborativa

El sistema orquesta **6 agentes de IA especializados** que trabajan en secuencia y en paralelo:

| Agente | Especialización | Función |
|--------|----------------|---------|
| **Audit Sentinel** | Reconocimiento de Patrones OCDE | Analiza anomalías estadísticas |
| **Juris Guard** | Compliance y Jurisprudencia | Valida vs bloque constitucional |
| **Resilience Node** | Auto-optimización del sistema | Estabilidad y memoria neural |
| **Fiscal Hunter** | Money Trailing | Rastrea flujos de capital |
| **Probity Arbiter** | Conflicto de interés | Verifica integridad de contratistas |
| **Ground Scout** | Verificación en campo | Valida coherencia logística |

**Flujo de auditoría:**
```
1. Resilience Node    → Restaura pesos neurales de ciclos previos
2. Juris Guard        → Escanea banderas contra bloque constitucional
3. Probity Arbiter    → Detecta conflictos de interés
4. Fiscal Hunter      → Traza flujos de capital y concentración
5. Ground Scout       → Verifica coherencia física/logística
6. Audit Sentinel     → Síntesis forense final + reporte
7. Resilience Node    → Aprende: incrementa contador, agrega patrones
```

---

### Paso 6 — Generación de Reporte Forense con LLM

El agente Audit Sentinel usa un LLM local (con cadena de fallback automática) para generar un **informe forense estructurado**:

**Estructura del reporte:**
```
RESUMEN EJECUTIVO
  → Hallazgo principal en 2-3 oraciones técnicas

MATRIZ DE RIESGOS
  → Tabla por proveedor: score, banderas, valor total

EVIDENCIA TÉCNICA
  → Cada bandera detectada con datos específicos
  → "3 contratos con 89.4% similitud semántica firmados en 17 días"

FUNDAMENTOS JURÍDICOS
  → Citas RAG del corpus legal (Ley 80, OCDE, etc.)

RECOMENDACIONES DE MITIGACIÓN
  → Acciones concretas para la entidad y para el ente de control
```

**Modelos de lenguaje (fallback automático):**
1. `tinyllama:latest` — Primario (1.1B params, ultrarrápido)
2. `gemma4-fast:latest` — Fallback 1 (4B params, mayor precisión)
3. `qwen3:4b` — Fallback 2 (4B params, respaldo final)
4. **Generación determinística** — Si todos los LLMs fallan, genera el reporte con plantilla estructurada sin IA

**Parámetros de generación:** Temperature 0.2 (outputs determinísticos y reproducibles), retry con backoff exponencial.

---

### Paso 7 — Chat Interactivo Forense

El auditor puede hacer preguntas en lenguaje natural sobre cualquier hallazgo:
- *"¿Por qué este contrato está clasificado como riesgo crítico?"*
- *"¿Cuál es la norma que se estaría violando?"*
- *"¿Este patrón ha sido sancionado antes por el Consejo de Estado?"*

El LLM responde con contexto técnico + jurídico, en máximo 3 párrafos, citando las normas relevantes del RAG.

---

## ARQUITECTURA TÉCNICA

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 18 + TS)                 │
│  Dashboard · AgentOffice · CortexDashboard · KnowledgeBase  │
│  Framer Motion · Recharts · html2canvas · jsPDF             │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP / Vite HMR
┌──────────────────────────▼──────────────────────────────────┐
│                   BACKEND (Express + TypeScript)             │
│  /api/secop/contracts · /api/ollama/* · /api/rag/*          │
│  /api/cache/analysis · /api/cache/report · /api/health      │
└──────────┬───────────────────────────┬───────────────────────┘
           │                           │
┌──────────▼──────────┐   ┌────────────▼──────────────────────┐
│   PostgreSQL (local) │   │         Ollama (local)            │
│  analysis_cache      │   │  nomic-embed-text (embeddings)    │
│  report_cache        │   │  tinyllama / gemma4 / qwen3:4b    │
│  legal_context_cache │   │  (generación de texto)            │
│  (vectores 768D)     │   │                                   │
└─────────────────────┘   └───────────────────────────────────┘
```

**Stack completo:**
- **Frontend:** React 18 + TypeScript strict + Vite + Tailwind CSS 4 + Framer Motion
- **Backend:** Express.js + TypeScript + tsx (runtime)
- **Base de datos:** PostgreSQL 16 (caché persistente + vectores embeddings)
- **IA local:** Ollama (nomic-embed-text + tinyllama/gemma4/qwen3)
- **Fuente de datos:** SECOP II API pública (datos.gov.co)
- **Testing:** Playwright (E2E)
- **Infraestructura:** Docker + docker-compose

---

## PROPUESTA DE VALOR

### Para el Estado colombiano
- **Detección proactiva** de patrones de fraccionamiento antes de que ocurra el daño
- **Escalabilidad:** Un auditor puede revisar 100 contratos en segundos vs. semanas manualmente
- **Evidencia jurídica estructurada:** Los reportes están listos para ser presentados ante entes de control (Contraloría, Procuraduría)
- **Interoperabilidad:** Funciona con cualquier entidad del SECOP II

### Para los ciudadanos
- **Transparencia activa:** Convierte datos abiertos en conocimiento accionable
- **Empoderamiento civil:** Organizaciones de sociedad civil pueden auditar su municipio en minutos

### Para los entes de control
- **Priorización inteligente:** Los auditores humanos se enfocan en los clústeres de riesgo crítico (Red), no en revisar todo
- **Reproducibilidad:** Los análisis son determinísticos y auditables
- **Fundamentos legales:** Cada hallazgo viene con citas jurídicas (Ley 80, OCDE, jurisprudencia)

---

## PRIVACIDAD Y SOBERANÍA DE DATOS

> **Zero-Data-Leakage garantizado.**

| Componente | Origen de datos | ¿Sale a internet? |
|------------|----------------|-------------------|
| Contratos SECOP | API pública datos.gov.co | Solo lectura, datos públicos |
| Embeddings vectoriales | Calculados con Ollama local | ❌ No |
| Generación de reportes | LLM local (Ollama) | ❌ No |
| Caché de análisis | PostgreSQL local | ❌ No |
| Base de conocimiento jurídico | Indexada localmente | ❌ No |

**Los datos nunca abandonan el servidor del auditor.** No hay dependencia de APIs de IA de terceros (no OpenAI, no Google, no Anthropic). El sistema puede operar en redes privadas o air-gapped de entidades gubernamentales.

---

## IMPACTO POTENCIAL

### Escala del problema (Colombia)
- **$120 billones COP/año** en contratación pública
- **+250,000 contratos/año** registrados en SECOP II
- La OCDE estima que entre el **10-30%** del gasto público en países en desarrollo está afectado por corrupción en contratación
- Solo en 2023, la Contraloría detectó hallazgos fiscales por **$11 billones COP**

### Lo que GobIA Auditor puede hacer
- Analizar **100 contratos en <30 segundos** (vs. días de auditoría manual)
- Cubrir **todas las entidades** del SECOP II simultáneamente (con infraestructura escalada)
- Reducir el costo por auditoría en **>90%**
- Generar alertas tempranas **antes** de que el daño sea irreversible

### Casos de uso inmediatos
1. **Contralorías departamentales** — Monitoreo continuo de entidades de alto riesgo
2. **Organizaciones de control ciudadano** — Auditoría de municipios pequeños (sin capacidad técnica propia)
3. **Ministerio de Hacienda** — Alertas sobre concentración de gasto en proveedores únicos
4. **Periodismo de datos** — Investigaciones basadas en evidencia forense reproducible

---

## DIFERENCIADORES TÉCNICOS

| Característica | GobIA Auditor | Soluciones tradicionales |
|----------------|--------------|--------------------------|
| Análisis semántico de objetos contractuales | ✅ Embeddings 768D | ❌ Solo palabras clave |
| Detección de bunching estadístico | ✅ Varianza + coeficiente | ❌ Manual |
| Contexto jurídico automático (RAG) | ✅ 8 fuentes legales indexadas | ❌ No |
| Generación de reportes forenses | ✅ LLM local, estructurado | ❌ No |
| Chat interactivo sobre hallazgos | ✅ Contextual + legal | ❌ No |
| Privacidad total (datos locales) | ✅ Zero-data-leakage | ⚠️ Variable |
| Auto-aprendizaje de patrones | ✅ Memoria neural persistente | ❌ No |
| Multi-agente colaborativo | ✅ 6 agentes especializados | ❌ No |
| Exportación PDF lista para entes | ✅ html2canvas + jsPDF | ❌ No |
| Fuente de datos | ✅ SECOP II (100% datos abiertos) | ⚠️ Variable |

---

## DEMOSTRACIÓN EN VIVO (5 minutos)

### Guión del pitch

**[0:00–0:45] — El problema**
> *"Cada año, entidades como la UNGRD, gobernaciones y alcaldías firman decenas de contratos con el mismo proveedor en el mismo mes. Cada contrato cumple la norma en papel. Juntos, constituyen fraccionamiento ilegal. Detectarlo manualmente es imposible a escala. GobIA Auditor lo hace en 30 segundos."*

**[0:45–2:30] — Demo en vivo**
1. Digitar entidad (ej: `CARDIQUE` o `GOBERNACIÓN GUAJIRA`) → **Cargar 100 contratos**
2. Análisis automático → Aparecen clústeres clasificados: 🔴 Riesgo Crítico / 🟠 Moderado / 🟢 Normal
3. Click en clúster rojo → Ver banderas: *"3 contratos con 91.2% similitud semántica, firmados en 14 días, por $4,200M COP"*
4. Scroll al contexto jurídico → *"Ley 80 Art. 24 — Relevancia Forense: 89.1%"*
5. Chat: *"¿Qué norma se estaría violando?"* → Respuesta del LLM en 2 segundos
6. Click en **Exportar PDF** → Reporte forense completo descargado

**[2:30–3:30] — Arquitectura y privacidad**
> *"Todo corre localmente. No hay ninguna llamada a OpenAI, ni a Google, ni a ningún tercero. Los contratos del Estado colombiano se analizan con modelos de IA que corren en el servidor del auditor. Zero-data-leakage."*

**[3:30–4:30] — Impacto y escalabilidad**
> *"Si conectamos GobIA Auditor a un pipeline de monitoreo continuo, podemos cubrir las 3,000+ entidades del SECOP II en tiempo real. La Contraloría priorizaría solo los clústeres Red. El costo por auditoría baja de semanas de trabajo a segundos de cómputo."*

**[4:30–5:00] — Cierre**
> *"Los datos de la corrupción ya son públicos. Los ponemos a trabajar con inteligencia artificial para que nadie más los ignore."*

---

## MÉTRICAS DEL SISTEMA

| Métrica | Valor |
|---------|-------|
| Líneas de código | ~4,500 LOC TypeScript |
| Tiempo de análisis (100 contratos) | < 30 segundos |
| Dimensiones de embeddings | 768D (nomic-embed-text) |
| Fuentes jurídicas indexadas | 8 documentos |
| Algoritmos de detección | 5 + reglas forenses |
| Agentes de IA colaborativos | 6 especializados |
| Modelos LLM (con fallback) | 3 (tinyllama → gemma4 → qwen3) |
| Tablas de caché PostgreSQL | 3 (análisis, reportes, vectores) |
| Cobertura de datos | 100% SECOP II (API pública) |
| Idiomas soportados | Español + Inglés |
| Dependencia de APIs externas | 0 (solo datos.gov.co, datos públicos) |

---

## EQUIPO

**Proyecto:** GobIA Auditor (Thegu — "Vigilante" en lengua Nassa)
**Categoría del reto:** 🤖 GobIA Auditor — SECOP II
**Hackathon:** Colombia 5.0 · Bogotá · 8 de mayo de 2026

---

## VISIÓN A FUTURO

### Fase 2 — Monitoreo Continuo
- Pipeline automatizado que analiza nuevos contratos del SECOP II cada 24 horas
- Sistema de alertas a entes de control (email, API)
- Dashboard nacional de riesgo por departamento

### Fase 3 — Red de Auditores
- Multi-tenant: cada Contraloría departamental tiene su instancia
- Sincronización de patrones aprendidos entre nodos (sin compartir datos sensibles)
- API pública para que periodistas y organizaciones civiles consulten scores

### Fase 4 — Expansión Regional
- Adaptación a sistemas de contratación de Ecuador (SERCOP), Perú (SEACE), Chile (Mercado Público)
- Modelo base re-entrenado con jurisprudencia de cada país

---

## ALINEACIÓN CON LOS OBJETIVOS DE COLOMBIA 5.0

| Objetivo Colombia 5.0 | Cómo GobIA Auditor contribuye |
|-----------------------|-------------------------------|
| Datos abiertos como palanca | Usa exclusivamente SECOP II (datos.gov.co) |
| Analítica avanzada para el Estado | Motor forense multi-algoritmo sobre contratación pública |
| IA para transformar sectores clave | IA local (privada) para transparencia gubernamental |
| Soluciones sostenibles | Sin dependencia de APIs pagas, 100% stack open-source |
| Impacto nacional | Escala a todas las entidades públicas de Colombia |

---

*GobIA Auditor — Convirtiendo datos públicos en justicia algorítmica.*
*Desarrollado con ❤️ para Colombia 5.0 · Mayo 2026*
