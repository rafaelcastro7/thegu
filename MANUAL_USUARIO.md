# Manual de Usuario — GobIA Auditor
**Versión:** 0.0.0 — rama `codex/pro-backend-rag-v2`  
**Fecha:** 2026-05-08  
**Sistema:** on-premise, `Manada-Gammer` (Windows 11, i7-7700, GTX 1070)

---

## Tabla de contenidos

1. [¿Qué es GobIA Auditor?](#1-qué-es-gobía-auditor)
2. [Arquitectura del sistema](#2-arquitectura-del-sistema)
3. [Instalación y puesta en marcha](#3-instalación-y-puesta-en-marcha)
4. [Flujo de trabajo completo](#4-flujo-de-trabajo-completo)
5. [Motor de Inteligencia Forense](#5-motor-de-inteligencia-forense)
6. [Base de conocimiento jurídico (RAG)](#6-base-de-conocimiento-jurídico-rag)
7. [Panel de Auditoría — guía de uso](#7-panel-de-auditoría--guía-de-uso)
8. [Auditor Interactivo (chat QA)](#8-auditor-interactivo-chat-qa)
9. [Exportación: PDF e informes](#9-exportación-pdf-e-informes)
10. [Panel de Sistema](#10-panel-de-sistema)
11. [Entidades bajo vigilancia especial](#11-entidades-bajo-vigilancia-especial)
12. [Referencia de API](#12-referencia-de-api)
13. [Guía de solución de problemas](#13-guía-de-solución-de-problemas)

---

## 1. ¿Qué es GobIA Auditor?

GobIA Auditor es una plataforma de analítica forense de contratación pública colombiana que opera **completamente en local**, sin enviar datos a servidores externos de IA.

Conecta en tiempo real con el repositorio oficial **SECOP II** (datos.gov.co), extrae contratos y aplica un pipeline de cinco capas:

| Capa | Tecnología | Qué detecta |
|---|---|---|
| Reglas determinísticas | TypeScript | Abuso de directa, sincronía temporal, entidades notorias, saltos de valor |
| Similitud semántica | Embeddings `nomic-embed-text` + coseno | Objetos contractuales repetidos (fraccionamiento, bunching) |
| RAG jurídico | PostgreSQL pgvector + Ollama | Normas y jurisprudencia aplicables al patrón detectado |
| Generación forense | `qwen3:4b` / `gemma4-fast` / `tinyllama` | Informe narrativo con señales, evidencia y recomendación |
| Memoria adaptativa | LocalStorage + reglas dinámicas | Acumulación de patrones aprendidos entre sesiones |

El resultado es un **expediente de riesgo** por proveedor, con puntaje 0–100, informe forense en Markdown y exportación a PDF.

---

## 2. Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React 19 SPA)                                         │
│  ┌───────────────┐  ┌───────────────────┐  ┌────────────────┐  │
│  │  App.tsx       │  │ TechnicalFindings │  │  AgentOffice   │  │
│  │  (orquestador) │  │   (datos forense) │  │ (logs agentes) │  │
│  └───────┬────────┘  └───────────────────┘  └────────────────┘  │
│          │ fetch /api/*                                          │
└──────────┼──────────────────────────────────────────────────────┘
           │ HTTP (misma origin — Express sirve SPA + API)
┌──────────▼──────────────────────────────────────────────────────┐
│  Express + tsx  (puerto 3000 dev / 3051 tests)                  │
│  GET  /api/health              → ping DB + Ollama               │
│  GET  /api/secop/contracts     → proxy → datos.gov.co           │
│  POST /api/ollama/embeddings   → proxy → nomic-embed-text       │
│  POST /api/ollama/generate     → proxy → qwen3:4b               │
│  POST /api/rag/legal-context   → RAG coseno sobre legal_context │
│  POST /api/cache/analysis      → persiste análisis              │
│  POST /api/cache/report        → persiste informe               │
└──────┬──────────────────────┬───────────────────────────────────┘
       │                      │
┌──────▼──────────┐   ┌───────▼──────────────────────────────────┐
│  PostgreSQL 5433 │   │  Ollama  http://localhost:11434           │
│  analysis_cache  │   │  nomic-embed-text  (274 MB embeddings)   │
│  report_cache    │   │  qwen3:4b          (2.5 GB generación)   │
│  legal_context   │   │  gemma4-fast       (9.6 GB fallback 1)   │
│  Fallback: Map<> │   │  tinyllama         (637 MB fallback 2)   │
└─────────────────┘   └──────────────────────────────────────────┘
```

### Hardware de ejecución

| Campo | Valor |
|---|---|
| Hostname | `Manada-Gammer` |
| SO | Windows 11 Home 23H2 (Build 10.0.26200) |
| CPU | Intel Core i7-7700 @ 3.60 GHz — 4 núcleos / 8 hilos |
| RAM | 48 GB DDR4 |
| GPU | NVIDIA GeForce GTX 1070 — 4 GB VRAM (CUDA para Ollama) |
| Disco rápido | Samsung NVMe 512 GB (sistema + proyecto) |
| Disco secundario | Seagate HDD 1 TB |
| Node.js | v24.13.0 |
| PostgreSQL | puerto 5433 (no estándar) |
| Ollama | localhost:11434 |

---

## 3. Instalación y puesta en marcha

### Requisitos previos

```
Node.js v20+
PostgreSQL 14+ (opcional — el sistema funciona sin él con Map<> en RAM)
Ollama instalado (https://ollama.com)
Git
```

### Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/rafaelcastro7/thegu.git
cd thegu

# 2. Instalar dependencias
npm install

# 3. Configurar entorno
cp .env.example .env
# editar .env si es necesario (por defecto apunta a localhost:5433 y localhost:11434)

# 4. Descargar modelos Ollama
ollama pull nomic-embed-text
ollama pull qwen3:4b
ollama pull tinyllama          # modelo de emergencia para tests E2E

# 5. (Opcional) PostgreSQL vía Docker
docker run -d --name gobiadb -e POSTGRES_USER=aiuser \
  -e POSTGRES_PASSWORD=changeme -e POSTGRES_DB=aiagency \
  -p 5433:5432 postgres:16

# 6. Iniciar en modo desarrollo
npm run dev

# 7. O iniciar en modo producción
npm start
```

La aplicación queda disponible en **http://localhost:3000**.

### Variables de entorno

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5433
DB_USER=aiuser
DB_PASSWORD=changeme
DB_NAME=aiagency
OLLAMA_HOST=http://localhost:11434
OLLAMA_TIMEOUT_MS=180000
JSON_LIMIT=50mb
```

### Tests E2E

```bash
npm run test:e2e
# Playwright headless — 6 tests — ~15 segundos
```

---

## 4. Flujo de trabajo completo

```
1. Buscar entidad
   └── Escribe el nombre (ej: "UNGRD") en el campo de búsqueda
   └── El sistema consulta SECOP II → hasta 100 contratos recientes

2. Analizar resultados
   └── Los contratos se agrupan por NIT de proveedor
   └── Cada grupo recibe un puntaje de riesgo 0–100
   └── La lista aparece ordenada por riesgo descendente

3. Abrir expediente
   └── Clic en cualquier tarjeta de proveedor
   └── El sistema ejecuta runCollaborativeAudit():
       ├── Obtiene contexto jurídico RAG (top-3 normas relevantes)
       ├── Genera informe forense vía LLM
       └── Cachea el resultado en DB / Map<>

4. Revisar expediente
   └── Resumen ejecutivo + señales de riesgo
   └── Marco jurídico activado (Ley 80, Ley 1474, etc.)
   └── Chat QA para preguntas específicas sobre el expediente

5. Exportar
   └── "EXPORTAR PDF OFICIAL" → descarga PDF con watermark
   └── "EXPORTAR CSV" → todos los resultados de la sesión
```

---

## 5. Motor de Inteligencia Forense

### Cálculo del puntaje de riesgo (0–100)

El `riskScore` es la suma de los pesos de reglas activadas, más penalizaciones estadísticas, normalizada a 100.

| Regla ID | Nombre | Peso | Fuente legal | Condición de disparo |
|---|---|---|---|---|
| `RULE_DIRECT_ABUSE` | Abuso de Contratación Directa | **40** | Ley 80 de 1993 | >80% de contratos bajo modalidad directa y grupo ≥ 4 contratos |
| `RULE_TIME_SQUEEZE` | Ventana de Ejecución Sospechosa | **35** | Circular 17 CCE | ≥2 contratos con fecha de firma idéntica |
| `RULE_NOTORIOUS_ENTITY` | Entidad de Alto Riesgo | **20** | Historial institucional | Entidad contratante en lista de notorias |
| `RULE_VALUE_SPIKE` | Incremento Volumétrico Atípico | **25** | Análisis estadístico | Valor acumulado > $5.000.000.000 COP |

**Penalizaciones adicionales:**
- Similitud semántica promedio > 0.85 → +15 pts
- Contratos en ventana < 30 días con objetos idénticos → +10 pts

**Clasificación de riesgo:**

| Rango | Nivel | Color |
|---|---|---|
| 75–100 | Crítico | 🔴 Rojo |
| 50–74 | Elevado | 🟠 Naranja |
| 0–49 | Bajo | 🟢 Verde |

### Reglas aprendidas dinámicamente

Después de 3+ expedientes analizados, el motor genera reglas nuevas combinando patrones:

- **DIRECT_TIME_STACK** — Directa + fecha sincronizada en la misma sesión
- **VALUE_LADDER** — Escalera de valores crecientes cerca del umbral de competencia
- **OBJECT_FAMILY** — Familia de objetos contractuales similares (similitud > 0.9)

Las reglas aprendidas se persisten en `localStorage` bajo la clave `neural_memory`.

---

## 6. Base de conocimiento jurídico (RAG)

El sistema tiene 8 entradas jurídicas pre-indexadas con embeddings `nomic-embed-text`. Al abrir un expediente, se recuperan las **3 más relevantes** mediante similitud coseno + bonus por palabras clave.

| ID | Fuente | Concepto clave |
|---|---|---|
| `ley-80-art-24-25` | Ley 80 de 1993, Arts. 24-25 | Prohibición de fraccionamiento; principio de planeación |
| `decreto-1082-2015-planeacion` | Decreto 1082 de 2015, Título I | Estudios previos; fragmentación como violación del régimen |
| `ley-1474-anticorrupcion-art90` | Ley 1474 de 2011, Art. 90 | Responsabilidad disciplinaria y fiscal por fraccionamiento |
| `ley-2195-2022-analitica` | Ley 2195 de 2022, Arts. 14-16 | Analítica preventiva como prueba válida para investigaciones |
| `cce-concepto-c122-2024-fraccionamiento` | CCE Concepto C-122-2024 | Definición técnica de fraccionamiento: identidad + tiempo + presupuesto |
| `oecd-integrity-procurement` | OCDE — Integridad en Compras | Monitoreo activo de indicadores; transparencia como regla general |
| `oecd-red-flags-bunching` | OCDE — Gestión de Riesgos | Bunching justo bajo umbrales legales como indicador crítico de fraude |
| `consejo-estado-fraccionamiento` | Consejo de Estado, Sección Tercera | Configuración objetiva sin dolo; basta vulnerar el régimen de competencia |

### Cómo funciona el RAG

```
Texto del contrato / señales de riesgo
        │
        ▼
getEmbedding() → /api/ollama/embeddings → nomic-embed-text (274 MB)
        │
        ▼
Comparar contra legal_context_cache en PostgreSQL (o Map<> en RAM)
Coseno + bonus keywords (fraccionamiento, bunching, modalidad, competencia)
        │
        ▼
Top-3 normas más relevantes → incluidas en el prompt del informe forense
```

---

## 7. Panel de Auditoría — guía de uso

### Barra de búsqueda

- Acepta nombre de entidad o NIT
- Normaliza automáticamente a mayúsculas
- Timeout de 30 segundos; fallback a resultado vacío con mensaje de error

### Barra de filtros y ordenamiento

```
[Todos] [Rojo] [Naranja] [Verde]     Ordenar: [Puntaje ▼] [Valor] [Contratos]
```

- **Filtro de riesgo**: filtra la lista visible por nivel de riesgo
- **Ordenar por Puntaje**: riesgo descendente (por defecto)
- **Ordenar por Valor**: monto total acumulado del grupo
- **Ordenar por Contratos**: grupos con más contratos primero

### Tarjeta de proveedor

```
┌─────────────────────────────────────────────────────┐
│ 🔴 NombreProveedor S.A.S.           Riesgo: 87/100  │
│ NIT: 900.123.456    Contratos: 12   Monto Total: $X  │
│ Observación rápida: "Patrón de contratación directa" │
│                                         [▶ VER]      │
└─────────────────────────────────────────────────────┘
```

- **Borde rojo/naranja/verde** según nivel de riesgo
- Clic en la tarjeta abre el **Expediente Forense**
- Doble clic en cualquier columna abre el contrato en SECOP II

### Expediente Forense (modal)

El expediente contiene cinco secciones:

1. **Resumen ejecutivo** — puntaje, proveedor, valor total, observación inicial
2. **Marco jurídico activado** — badges de las normas relevantes (Ley 80, Ley 1474, Circular 17, Sent. C-300)
3. **Señales detectadas** — lista de red flags con evidencia específica
4. **Informe forense narrativo** — generado por LLM, en Markdown renderizado
5. **Chat QA** — preguntas adaptativas sobre el expediente (ver sección 8)

---

## 8. Auditor Interactivo (chat QA)

Dentro del expediente, el Auditor Interactivo sugiere cuatro preguntas adaptativas que cambian dinámicamente según el contenido del informe:

| Pregunta | Propósito |
|---|---|
| ¿Qué queda por verificar después de la última respuesta? | Identificar lagunas probatorias |
| ¿Qué contratos comparables conviene revisar ahora? | Expandir el universo de investigación |
| ¿Cuál es el frente jurídico o procedimental que sigue abierto? | Determinar acciones procesales pendientes |
| ¿Cuál debería ser la siguiente pregunta más útil? | Meta-orientación del auditor |

El chat usa el modelo `qwen3:4b` (o fallback `gemma4-fast`) con el contexto del expediente completo en el prompt de sistema. Las respuestas se renderizan en Markdown.

---

## 9. Exportación: PDF e informes

### PDF Oficial

```
[EXPORTAR PDF OFICIAL]
```

- Genera una captura del expediente vía `html2canvas` + `jsPDF`
- Incluye watermark institucional
- Nombre de archivo: `informe_forense_NombreProveedor.pdf`
- Sólo disponible después de que el informe forense sea generado

### CSV de sesión

```
[EXPORTAR CSV]
```

- Exporta todos los grupos analizados en la sesión actual
- Encabezados bilingües (ES/EN): `Proveedor / Provider`, `Puntaje de Riesgo / Risk Score`, etc.
- BOM UTF-8 para compatibilidad con Excel
- Nombre de archivo: `auditoria_forense_YYYY-MM-DD.csv`
- Disponible en cualquier momento mientras haya resultados

---

## 10. Panel de Sistema

Accesible desde la pestaña **Sistema** en la navegación principal.

### Métricas en vivo

- Llamadas totales al LLM, tokens procesados, latencia promedio, tasa de error
- Estado de cada modelo Ollama (ONLINE / OFFLINE / BUSY / LOADING)
- Burn rate acumulado (coste por token × tokens usados)

### Operación del servidor

- Estado de PostgreSQL (conectado / memoria)
- Estado de Ollama (accesible / caído)
- Uptime del proceso

### Cobertura de la sesión

- Contratos analizados en la sesión
- Entradas jurídicas en la base RAG
- Caché de análisis activo

---

## 11. Entidades bajo vigilancia especial

El sistema marca automáticamente contratos de las siguientes entidades con la regla `RULE_NOTORIOUS_ENTITY` (+20 pts al riesgo):

| Entidad | Razón histórica |
|---|---|
| UNGRD | Auditorías previas con hallazgos de integridad en gestión de emergencias |
| UNIDAD NACIONAL PARA LA GESTIÓN DEL RIESGO DE DESASTRES | (mismo organismo, nombre completo) |
| GOBERNACIÓN DE LA GUAJIRA | Historial de opacidad técnica documentado |
| GOBERNACIÓN DEL CHOCÓ | Historial de opacidad técnica documentado |
| GOBERNACIÓN DE CÓRDOBA | Historial de opacidad técnica documentado |
| ALCALDÍA DE RIOHACHA | Historial de opacidad técnica documentado |
| CARDIQUE | Reportes de irregularidades en contratación ambiental |
| CORPOCESAR | Reportes de irregularidades en contratación ambiental |
| FONDO ADAPTACIÓN | Hallazgos en contratación post-desastre |
| INVÍAS | Historial de sobrecostos en infraestructura vial |

Para agregar entidades a esta lista, editar `src/lib/intelligence.ts` → array `NOTORIOUS_ENTITIES`.

---

## 12. Referencia de API

Todos los endpoints están en `http://localhost:3000/api/`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Ping a PostgreSQL y Ollama. Retorna `{ db, ollama, status }` |
| GET | `/api/secop/contracts?entity=X&limit=N` | Proxy a SECOP II. Retorna array de contratos |
| GET | `/api/secop/source?url=X` | HTML fuente de un proceso en SECOP |
| POST | `/api/cache/analysis` | Persiste un análisis. Body: `{ key, value }` |
| GET | `/api/cache/analysis/:key` | Recupera un análisis persistido |
| POST | `/api/cache/report` | Persiste un informe forense |
| GET | `/api/cache/report/:key` | Recupera un informe forense |
| POST | `/api/ollama/embeddings` | Proxy a Ollama `/api/embeddings`. Body: `{ model, prompt }` |
| POST | `/api/ollama/generate` | Proxy a Ollama `/api/generate`. Body: `{ model, prompt, stream }` |
| POST | `/api/rag/legal-context` | RAG jurídico. Body: `{ query, redFlags }`. Retorna top-3 normas |

### Ejemplo: consultar contexto jurídico RAG

```bash
curl -X POST http://localhost:3000/api/rag/legal-context \
  -H "Content-Type: application/json" \
  -d '{"query": "fraccionamiento contratos directa", "redFlags": ["contratación directa 90%"]}'
```

Respuesta:
```json
[
  { "id": "ley-80-art-24-25", "source": "Ley 80 de 1993, Artículos 24 y 25", "text": "...", "score": 0.94 },
  { "id": "cce-concepto-c122-2024-fraccionamiento", "source": "Colombia Compra Eficiente...", "text": "...", "score": 0.89 },
  { "id": "ley-1474-anticorrupcion-art90", "source": "Ley 1474 de 2011...", "text": "...", "score": 0.81 }
]
```

---

## 13. Guía de solución de problemas

### "No se encontraron contratos"

- Verificar conexión a internet (SECOP II requiere acceso a datos.gov.co)
- Probar con nombre más corto (ej: "UNGRD" en vez del nombre completo)
- Revisar `/api/health` — si `ollama: false`, los embeddings fallarán silenciosamente

### "El informe forense no se genera"

El sistema tiene tres niveles de fallback:
1. `tinyllama` → `gemma4-fast` → `qwen3:4b` (orden de carga creciente)
2. Si todos fallan → informe determinístico sin LLM (siempre funciona)

Para forzar el modelo específico: editar `src/lib/gemini.ts` → `MODEL_CHAIN`.

### "PostgreSQL no disponible"

El sistema degrada automáticamente a `Map<>` en RAM. Los análisis se pierden al reiniciar el proceso. Para persistencia completa:

```bash
# Verificar que PostgreSQL escucha en 5433
psql -h localhost -p 5433 -U aiuser -d aiagency -c "SELECT 1"
```

### "Ollama no responde"

```bash
# Verificar servicio
ollama ps

# Si no está corriendo
ollama serve

# Verificar que el modelo está descargado
ollama list
```

### "Los embeddings son lentos"

Con CUDA activo (GTX 1070): ~300 ms por embedding.  
Sin CUDA (CPU-only): 1.5–3 segundos por embedding, análisis de 100 contratos ~5 minutos.

Verificar uso de GPU:
```bash
nvidia-smi
# CUDA debe aparecer en el proceso ollama
```

### Regenerar el índice jurídico

Si `legal_context_cache` está corrupta en PostgreSQL:

```sql
-- Conectar a aiagency en puerto 5433
TRUNCATE TABLE legal_context_cache;
```

El índice se reconstruye automáticamente al siguiente arranque del servidor.

---

*Manual generado el 2026-05-08. Para actualizar, ejecutar `/project-audit` desde Claude Code.*
