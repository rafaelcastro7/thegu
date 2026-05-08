# Arquitectura del sistema — GobIA Auditor

**Versión:** 0.0.0  
**Rama activa:** `codex/pro-backend-rag-v2`  
**Repositorio:** https://github.com/rafaelcastro7/thegu  
**Fecha de redacción:** 2026-05-08

---

## 1. Máquina de ejecución

| Campo | Valor |
|---|---|
| Hostname | `Manada-Gammer` |
| SO | Windows 11 Home 23H2 (Build 10.0.26200) |
| Arquitectura | x64 |
| CPU | Intel Core i7-7700 @ 3.60 GHz — 4 núcleos / 8 hilos |
| RAM | 48 GB DDR4 |
| GPU principal | NVIDIA GeForce GTX 1070 — 4 GB VRAM |
| GPU integrada | Intel HD Graphics 630 — 1 GB compartido |
| Almacenamiento 1 | Samsung NVMe 512 GB (SSD M.2 — sistema y proyecto) |
| Almacenamiento 2 | Seagate HDD 1 TB (datos secundarios) |

La GPU GTX 1070 es usada por Ollama para aceleración CUDA al inferir modelos locales. Sin GPU, Ollama cae a CPU-only con latencia 3–5× mayor.

---

## 2. Runtimes instalados

| Componente | Versión |
|---|---|
| Node.js | v24.13.0 |
| npm | 11.6.2 |
| tsx | 4.21.0 (transpilación TypeScript en runtime) |
| TypeScript | 5.8.2 |
| Ollama | local (API REST en `http://localhost:11434`) |
| PostgreSQL | puerto 5433 (instancia local, usuario `aiuser`, base `aiagency`) |

---

## 3. Modelos de IA locales (Ollama)

Todos los modelos residen en el disco local. No se usa ninguna API externa de IA.

| Modelo | Tamaño | Rol en el sistema |
|---|---|---|
| `qwen3:4b` | 2.5 GB | Modelo principal de generación — informes forenses, QA adaptativo |
| `gemma4-fast:latest` | 9.6 GB | Fallback 1 de generación (si qwen3 falla) |
| `gemma4-think:latest` | 9.6 GB | Fallback 2 de generación (razonamiento profundo) |
| `nomic-embed-text:latest` | 274 MB | Embeddings semánticos — análisis de similitud de contratos y RAG jurídico |
| `tinyllama:latest` | 637 MB | Fallback mínimo de generación en tests E2E |
| `qwen2.5-coder:7b` | 4.7 GB | Disponible (no activo en flujo de auditoría) |
| `llama3:8b` | 4.7 GB | Disponible (no activo en flujo de auditoría) |

La cadena de generación implementa reintentos ordenados: `tinyllama → gemma4-fast → qwen3:4b`. Si todos fallan, se activa el reporte determinístico de contingencia (sin LLM).

---

## 4. Arquitectura de la aplicación

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React 19 SPA)                                         │
│  ┌───────────────┐  ┌───────────────┐  ┌────────────────────┐  │
│  │  App.tsx       │  │ TechnicalFind │  │  AgentOffice       │  │
│  │  (orquestador) │  │  ings.tsx     │  │  (logs de agentes) │  │
│  └───────┬────────┘  └───────────────┘  └────────────────────┘  │
│          │ fetch /api/*                                          │
└──────────┼──────────────────────────────────────────────────────┘
           │ HTTP (misma origin — Express sirve SPA + API)
┌──────────▼──────────────────────────────────────────────────────┐
│  Express Server  (server.ts → tsx, puerto 3000 dev / 3051 test) │
│                                                                 │
│  Rutas principales:                                             │
│  GET  /api/health              → ping DB + Ollama host          │
│  GET  /api/secop/contracts     → proxy → datos.gov.co           │
│  GET  /api/secop/source        → fetch HTML fuente SECOP        │
│  POST /api/cache/analysis      → guarda análisis en DB          │
│  GET  /api/cache/analysis/:key → recupera análisis              │
│  POST /api/cache/report        → guarda informe en DB           │
│  GET  /api/cache/report/:key   → recupera informe               │
│  POST /api/ollama/embeddings   → proxy → Ollama /api/embeddings │
│  POST /api/ollama/generate     → proxy → Ollama /api/generate   │
│  POST /api/rag/legal-context   → RAG persistente (DB + cosine)  │
│                                                                 │
│  Middleware: express.json (50 MB), asyncHandler, HttpError      │
└──────┬──────────────────────────────┬───────────────────────────┘
       │                              │
┌──────▼──────────┐        ┌──────────▼──────────────────────────┐
│  PostgreSQL      │        │  Ollama (localhost:11434)           │
│  puerto 5433     │        │                                     │
│                 │        │  POST /api/embeddings               │
│  analysis_cache  │        │    modelo: nomic-embed-text         │
│  report_cache    │        │                                     │
│  legal_context   │        │  POST /api/generate                 │
│  _cache          │        │    modelos: tinyllama / gemma4-fast │
│                 │        │             / qwen3:4b              │
│  Fallback:       │        │                                     │
│  Map<> en RAM   │        │  Aceleración: CUDA (GTX 1070)       │
└─────────────────┘        └─────────────────────────────────────┘
```

### Modo dual de base de datos

`src/server/database.ts` implementa degradación automática: si PostgreSQL no responde al arrancar o durante operación, el sistema muta a modo `"memory"` usando `Map<>` en proceso. Todas las consultas son interceptadas por `queryInMemory()` que emula el subconjunto de SQL necesario. Esto permite que la aplicación opere completamente sin PostgreSQL instalado, aunque la persistencia se pierde al reiniciar el proceso.

---

## 5. Flujo de datos de una auditoría

```
Usuario busca entidad
        │
        ▼
fetchContractsByEntity()
  └── GET /api/secop/contracts
        └── datos.gov.co (Socrata SODA API)
              └── $where entidad LIKE '%X%'
                  $order precio_base DESC
                  $limit 50–100
        │
        ▼
groupContractsByProvider()
  └── agrupa por documento_proveedor (NIT)
  └── clave: "REF:{NIT}"
        │
        ▼
analyzeContractGroup() — por cada grupo
  ├── getEmbedding() → /api/ollama/embeddings → nomic-embed-text
  │     (caché en Map<string, number[]> en memoria del browser)
  ├── cosineSimilarity() — similitud promedio entre pares
  ├── runIntelligenceAudit() — reglas forenses:
  │     RULE_DIRECT_ABUSE    (contratación directa >80%)
  │     RULE_TIME_SQUEEZE    (firmas misma fecha)
  │     RULE_NOTORIOUS_ENTITY (entidades históricamente opacas)
  │     RULE_VALUE_SPIKE     (valor total >5B COP)
  │     + reglas aprendidas dinámicamente
  └── riskScore = suma ponderada de reglas + penalizaciones estadísticas
        │
        ▼
runCollaborativeAudit() — al abrir expediente
  ├── getLegalContext() → /api/rag/legal-context
  │     └── getPersistentLegalContext():
  │           ensureLegalContextIndex() → embeds LEGAL_KNOWLEDGE_BASE
  │           cosine similarity → top-3 referencias jurídicas
  │     Fallback: getLocalLegalContext() → index en browser
  │     Fallback 2: getQuickLegalContext() → keyword matching
  │
  ├── generateForensicReport() → /api/ollama/generate
  │     modelo: tinyllama → gemma4-fast → qwen3:4b (en orden)
  │     Fallback: buildDeterministicForensicReport() (sin LLM)
  │
  └── cacheReport() → POST /api/cache/report → DB / Map<>
```

---

## 6. Capa de conocimiento jurídico (RAG)

`src/lib/legalKnowledgeBase.ts` contiene **~49 entradas** de jurisprudencia y normativa colombiana:

- Ley 80 de 1993 (estatuto general de contratación)
- Decreto 1082 de 2015
- Ley 1474 de 2011 (estatuto anticorrupción)
- Ley 2195 de 2022 (analítica preventiva)
- Circulares y conceptos de Colombia Compra Eficiente (CCE)
- Sentencias de la Corte Constitucional y Consejo de Estado
- Directrices OCDE sobre transparencia en compras públicas

Al iniciar, el servidor indexa estas entradas en `legal_context_cache` con embeddings `nomic-embed-text`. Las consultas usan similaridad coseno + bonus por palabras clave (fraccionamiento, bunching, modalidad, competencia).

---

## 7. Pipeline de build

```
npm run build
  └── vite build
        ├── React SPA → dist/index.html + assets/
        └── Code splitting manual (vite.config.ts):
              react-vendor      (react + react-dom)
              motion-vendor     (framer-motion)
              charts-vendor     (recharts)
              html2canvas-vendor
              jspdf-vendor
              transformers-vendor (@huggingface/transformers)
              onnx-vendor        (onnxruntime-web)
```

En producción, Express sirve `dist/` como archivos estáticos y captura toda ruta no-API con `index.html` (SPA fallback). En desarrollo, Vite corre como middleware dentro del mismo proceso Express (`vite.createServer({ middlewareMode: true })`).

---

## 8. Cómo se está publicando (deployment actual)

### Modo de operación actual: **local on-premise**

El sistema **no está desplegado en un servidor público**. Corre completamente en la máquina `Manada-Gammer` de forma local.

```
Inicio:
  npm start
    └── cross-env NODE_ENV=production tsx server.ts
          └── initDatabase()    → conecta a PostgreSQL :5433
          └── createApp()       → crea Express + Vite middleware
          └── app.listen(PORT, "0.0.0.0")   → escucha en todas las interfaces
```

El servidor escucha en `0.0.0.0`, lo que significa que es accesible desde la red local (LAN) en la IP de la máquina. No hay configuración de reverse proxy (nginx/caddy) ni HTTPS activo.

### Scripts de control

| Script | Archivo | Función |
|---|---|---|
| Arranque público | `scripts/start-public.ps1` | Levanta servidor con variables de entorno |
| Parada | `scripts/stop-public.ps1` | Termina el proceso del servidor |
| Dev | `npm run dev` | Mismo servidor con NODE_ENV=development + HMR |
| Tests E2E | `npm run test:e2e` | `npm run build` + Playwright headless |

### Variables de entorno (`.env`)

```env
PORT=3000                           # puerto de escucha (3051 en tests)
DB_HOST=localhost
DB_PORT=5433                        # PostgreSQL en puerto no-estándar
DB_USER=aiuser
DB_PASSWORD=changeme
DB_NAME=aiagency
OLLAMA_HOST=http://localhost:11434  # Ollama local
OLLAMA_TIMEOUT_MS=180000
JSON_LIMIT=50mb
```

### Repositorio y ramas

```
origin: https://github.com/rafaelcastro7/thegu.git

main                          ← rama de producción
codex/pro-backend-rag-v2      ← rama activa de desarrollo (HEAD)
```

La rama `codex/pro-backend-rag-v2` está publicada en GitHub pero el servidor no se despliega automáticamente desde el repositorio. El deploy es manual: pull + `npm start`.

---

## 9. Dependencias de infraestructura

| Servicio | Tipo | Requisito |
|---|---|---|
| PostgreSQL 14+ | Local | Opcional — sistema degrada a Map<> en RAM |
| Ollama | Local (CUDA/CPU) | Requerido para embeddings y generación — si falla, usa reportes determinísticos |
| datos.gov.co (Socrata) | Externo (HTTPS) | Requerido para ingestar contratos de SECOP II |
| GitHub | Externo | Control de versiones únicamente — no CI/CD activo |

No hay dependencias de Firebase, Supabase, servicios de IA en la nube, CDN ni base de datos remota. El sistema puede operar completamente offline excepto para la ingesta de datos de SECOP II.

---

## 10. Tests

```
npx playwright test
  ├── tests/e2e/backend.spec.ts  (4 tests)
  │     ├── health + cache APIs operacionales
  │     ├── proxy SECOP retorna contratos reales
  │     ├── RAG jurídico retorna contexto rankeado
  │     └── endpoint de generación local produce texto
  │
  └── tests/e2e/app.spec.ts     (2 tests)
        ├── preserva identidad visual institucional
        └── carga hallazgo persistido y genera informe forense
```

Todos los tests corren headless con Playwright y arrancan el servidor de producción (`npm start`) internamente. Tiempo promedio: 8–15 segundos en esta máquina.

---

*Documento generado automáticamente el 2026-05-08 a partir del estado real del repositorio y el hardware de la máquina de ejecución.*
