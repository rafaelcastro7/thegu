# GobIA Auditor

Sistema de analítica forense para detectar posibles patrones de fraccionamiento contractual en SECOP II. La aplicación combina ingesta de contratos, análisis heurístico, RAG jurídico y generación de informes técnicos con modelos locales.

## Stack Actual

- Frontend: React + Tailwind CSS + Framer Motion
- Backend: Express + Vite middleware
- Base de datos: PostgreSQL para caché de análisis, reportes y contexto RAG
- Modelos locales: Ollama (`tinyllama` para respuesta rápida, `gemma4-fast`/`qwen3:4b` como respaldo y `nomic-embed-text`)
- Fuente de datos: datos.gov.co / SECOP II
- Validación: TypeScript + Playwright e2e

## Componentes Clave

- `server.ts`: punto de arranque del servidor
- `src/server/*`: configuración, rutas API, PostgreSQL, proxy Ollama y RAG persistente
- `src/lib/secop.ts`: consulta SECOP segura y normalización de contratos
- `src/lib/analysis.ts`: motor de riesgo, similitud semántica y hallazgos
- `src/lib/ragManager.ts`: cliente RAG con fallback local
- `src/lib/legalKnowledgeBase.ts`: base legal inicial para indexación vectorial
- `src/lib/neuralManager.ts`: orquestación de generación y caché de reportes

## Desarrollo Local

1. Instala dependencias:

```bash
npm install
```

2. Configura variables de entorno usando `.env.example`.

3. Asegura que PostgreSQL y Ollama estén disponibles. Ollama debe tener cargados:

```bash
ollama pull tinyllama
ollama pull gemma4-fast
ollama pull qwen3:4b
ollama pull nomic-embed-text
```

4. Inicia la app:

```bash
npm run dev
```

## Validación

```bash
npm run lint
npm run build
npm run test:e2e
```

Los e2e cubren health del backend, caché PostgreSQL, proxy SECOP, RAG persistente y generación de informe desde la UI.

## Docker

El repo incluye `Dockerfile`, `docker-compose.yml` y `SETUP_LOCAL.md` para levantar la app contra PostgreSQL y Ollama en entorno local. El contenedor espera que Ollama esté disponible en `OLLAMA_HOST`.
