# Script de instalación desde cero — GobIA Auditor
### Pégale este prompt completo a Claude en el nuevo computador

---

## PROMPT PARA CLAUDE (copia y pega todo esto):

---

Hola Claude. Necesito que me instales y dejes funcionando completamente el proyecto **GobIA Auditor** desde cero en este computador. Sigue estos pasos en orden, verifica cada uno antes de continuar, y dime si algo falla.

---

## PASO 1 — Verificar prerequisitos del sistema

Verifica que el sistema tenga instalado:
- **Node.js v20+** (`node --version`)
- **npm v10+** (`npm --version`)
- **Git** (`git --version`)
- **Docker Desktop** (abre y verifica que el daemon esté corriendo: `docker info`)
- **Ollama** (`ollama --version`)

Si alguno falta, instálalo así:

### Node.js (si falta)
Descarga e instala desde https://nodejs.org/en/download (LTS v22). En Windows usa el instalador `.msi`.

### Git (si falta)
Descarga desde https://git-scm.com/downloads e instala con opciones por defecto.

### Docker Desktop (si falta)
Descarga desde https://www.docker.com/products/docker-desktop/ e instala. Luego ábrelo y espera que el daemon arranque (ícono en la barra de tareas).

### Ollama (si falta)
Descarga desde https://ollama.com/download e instala. Luego en terminal: `ollama serve` (déjalo corriendo en segundo plano).

---

## PASO 2 — Clonar el repositorio

```bash
git clone https://github.com/rafaelcastro7/thegu.git
cd thegu
```

Verifica que existan estos archivos clave después del clone:
- `server.ts`
- `package.json`
- `src/server/app.ts`
- `src/lib/analysis.ts`
- `.env.example`

---

## PASO 3 — Crear el archivo `.env`

Crea el archivo `.env` en la raíz del proyecto con este contenido exacto:

```
PORT=3000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5433
DB_USER=aiuser
DB_PASSWORD=changeme
DB_NAME=aiagency

# Ollama (LLM local)
OLLAMA_HOST=http://localhost:11434
OLLAMA_TIMEOUT_MS=180000

# Express
JSON_LIMIT=50mb
```

---

## PASO 4 — Instalar dependencias Node

```bash
npm install
```

Verifica que no haya errores críticos. Advertencias (warnings) son aceptables.

---

## PASO 5 — Levantar PostgreSQL con Docker

Ejecuta este comando para crear y arrancar un contenedor PostgreSQL dedicado para el proyecto:

```bash
docker run -d \
  --name thegu_postgres \
  -e POSTGRES_USER=aiuser \
  -e POSTGRES_PASSWORD=changeme \
  -e POSTGRES_DB=aiagency \
  -p 5433:5432 \
  --restart unless-stopped \
  postgres:16-alpine
```

**En Windows PowerShell usa backtick (`) en lugar de backslash (\):**
```powershell
docker run -d `
  --name thegu_postgres `
  -e POSTGRES_USER=aiuser `
  -e POSTGRES_PASSWORD=changeme `
  -e POSTGRES_DB=aiagency `
  -p 5433:5432 `
  --restart unless-stopped `
  postgres:16-alpine
```

Espera 5 segundos y verifica que esté listo:
```bash
docker exec thegu_postgres pg_isready -U aiuser -d aiagency
```
Debe responder: `/var/run/postgresql:5432 - accepting connections`

Si el contenedor ya existe de antes, arráncalo con:
```bash
docker start thegu_postgres
```

---

## PASO 6 — Descargar modelos de Ollama

Estos modelos son necesarios para que el sistema funcione. Descárgalos en orden (pueden tardar varios minutos dependiendo de la conexión):

```bash
# Modelo de embeddings (obligatorio para análisis semántico)
ollama pull nomic-embed-text

# LLM principal para generación de reportes forenses
ollama pull tinyllama

# LLM fallback 1
ollama pull gemma2:2b

# LLM fallback 2 (más preciso, más pesado ~2.5GB)
ollama pull qwen2.5:3b
```

Verifica que estén instalados:
```bash
ollama list
```
Deben aparecer: `nomic-embed-text`, `tinyllama`, `gemma2:2b`, `qwen2.5:3b`

> **Nota importante:** El proyecto usa `tinyllama:latest`, `gemma4-fast:latest` y `qwen3:4b` en el código. Si esos nombres exactos no están disponibles en tu versión de Ollama, los modelos recomendados arriba son los equivalentes funcionales. Si quieres usar los nombres exactos del código, ejecuta adicionalmente:
> ```bash
> ollama pull qwen2.5:3b
> ollama copy qwen2.5:3b qwen3:4b
> ```

---

## PASO 7 — Verificar que Ollama está corriendo

En una terminal separada (o en background), asegúrate que Ollama esté sirviendo:

```bash
ollama serve
```

Si ya está corriendo como servicio del sistema (Windows/Mac lo hacen automáticamente al instalar), este comando dirá que el puerto ya está en uso — eso está bien, significa que ya está activo.

Verifica:
```bash
curl http://localhost:11434/api/tags
```
Debe responder con un JSON listando los modelos instalados.

---

## PASO 8 — Arrancar el servidor de desarrollo

```bash
npm run dev
```

Debes ver en consola:
```
Server running on http://0.0.0.0:3000 (Ollama: http://localhost:11434)
```

Y también el banner de Vite con el frontend.

---

## PASO 9 — Verificar que todo funciona

Ejecuta estas verificaciones en orden:

### 9.1 Health check del backend
```bash
curl http://localhost:3000/api/health
```
Respuesta esperada:
```json
{"status":"ok","database":"connected","ollamaHost":"http://localhost:11434"}
```

### 9.2 Verificar frontend
Abre en el navegador: **http://localhost:3000**
Debe cargar la interfaz de GobIA Auditor con el panel de búsqueda.

### 9.3 Prueba funcional básica
En la interfaz, busca la entidad `CARDIQUE` y espera que carguen los contratos del SECOP II. Si la API pública de datos.gov.co responde, deben aparecer contratos y análisis de riesgo.

### 9.4 Verificar embeddings (Ollama)
```bash
curl -X POST http://localhost:3000/api/ollama/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model":"nomic-embed-text","prompt":"contrato de prestación de servicios"}'
```
Debe responder con un array de 768 números.

### 9.5 Verificar RAG jurídico
```bash
curl -X POST http://localhost:3000/api/rag/legal-context \
  -H "Content-Type: application/json" \
  -d '{"query":"fraccionamiento contractual","redFlags":["fraccionamiento"]}'
```
Debe responder con texto de la Ley 80 y otras fuentes legales.

---

## PASO 10 — Configurar inicio automático (opcional pero recomendado)

Para que el contenedor PostgreSQL arranque solo cuando Docker Desktop inicia, ya tiene `--restart unless-stopped`. Solo asegúrate de que Docker Desktop esté configurado para iniciar con Windows:
- Docker Desktop → Settings → General → "Start Docker Desktop when you sign in" ✅

Para Ollama, en Windows se instala como servicio automático.

---

## RESUMEN DE SERVICIOS CORRIENDO

| Servicio | Puerto | Comando para verificar |
|----------|--------|----------------------|
| PostgreSQL (Docker) | 5433 | `docker ps \| grep thegu_postgres` |
| Ollama (LLM local) | 11434 | `curl http://localhost:11434/api/tags` |
| GobIA Auditor (dev) | 3000 | `curl http://localhost:3000/api/health` |
| Frontend (Vite) | 3000 | Abrir http://localhost:3000 en browser |

---

## TROUBLESHOOTING COMÚN

### Error: `connect ECONNREFUSED 127.0.0.1:5433`
→ El contenedor PostgreSQL no está corriendo.
```bash
docker start thegu_postgres
# Si no existe:
docker run -d --name thegu_postgres -e POSTGRES_USER=aiuser -e POSTGRES_PASSWORD=changeme -e POSTGRES_DB=aiagency -p 5433:5432 postgres:16-alpine
```

### Error: `connect ECONNREFUSED 127.0.0.1:11434`
→ Ollama no está corriendo.
```bash
ollama serve
```

### Error al descargar contratos del SECOP II
→ Problema de conectividad con `datos.gov.co`. Verifica conexión a internet. La API es pública pero a veces tiene latencia alta.

### Error: `model not found` en generación de reportes
→ El modelo Ollama no está descargado.
```bash
ollama pull tinyllama
```

### Puerto 3000 en uso
→ Cambia `PORT=3001` en el `.env` y reinicia.

### Error de TypeScript al arrancar
→ Los errores de TS no bloquean `tsx` en dev mode. Solo importan en `npm run lint`.

---

## ESTRUCTURA DEL PROYECTO (referencia)

```
thegu/
├── server.ts              ← Punto de entrada (Express + DB init)
├── src/
│   ├── server/
│   │   ├── app.ts         ← Rutas API Express
│   │   ├── config.ts      ← Variables de entorno
│   │   ├── database.ts    ← PostgreSQL pool + init tablas
│   │   ├── ollama.ts      ← Proxy hacia Ollama
│   │   ├── rag.ts         ← RAG jurídico persistente
│   │   └── http.ts        ← Helpers HTTP
│   ├── lib/
│   │   ├── analysis.ts    ← Motor forense multi-algoritmo
│   │   ├── agents.ts      ← Orquestación multi-agente
│   │   ├── intelligence.ts← Reglas + auto-aprendizaje
│   │   ├── secop.ts       ← Cliente API SECOP II
│   │   ├── gemini.ts      ← Generación de reportes LLM
│   │   ├── ragManager.ts  ← RAG client-side
│   │   ├── legalKnowledgeBase.ts ← Corpus jurídico
│   │   ├── vector.ts      ← Similitud coseno
│   │   ├── neuralManager.ts ← Gestión de modelos
│   │   └── firebase.ts    ← Caché Firebase (opcional)
│   └── App.tsx            ← Frontend React principal
├── .env                   ← Variables de entorno (crear manualmente)
├── .env.example           ← Plantilla
├── package.json
├── vite.config.ts
└── playwright.config.ts
```

---

## DATOS TÉCNICOS DEL PROYECTO

- **Repo:** https://github.com/rafaelcastro7/thegu.git
- **Rama principal:** `main`
- **Rama de desarrollo activo:** `codex/pro-backend-rag-v2`
- **Stack:** React 19 + TypeScript + Vite + Express + PostgreSQL + Ollama
- **Node mínimo:** v20
- **Puerto dev:** 3000
- **Puerto PostgreSQL:** 5433

---

*GobIA Auditor — Colombia 5.0 · Mayo 2026*
