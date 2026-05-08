# Setup Desde Cero

Guia operativa para levantar `GobIA Auditor` en otra maquina sin depender de contexto previo.

## 1. Alcance

Este documento deja el sistema listo para:

- ejecutar frontend y backend locales
- conectar PostgreSQL para cache persistente
- usar Ollama como motor local de generacion y embeddings
- validar salud tecnica con `lint`, `build` y pruebas E2E
- exponer una URL web publica temporal desde la misma maquina si hace falta

## 2. Requisitos del equipo

Instala y verifica lo siguiente:

- `Git`
- `Node.js 22 LTS` o superior
- `npm 10+`
- `Docker Desktop`
- `Ollama`
- `PowerShell` con permisos normales de ejecucion

Comandos de verificacion:

```powershell
git --version
node --version
npm --version
docker info
ollama --version
```

## 3. Clonar el repositorio

```powershell
git clone https://github.com/rafaelcastro7/thegu.git
cd thegu
```

Para reproducir exactamente el estado actual de trabajo:

```powershell
git checkout codex/pro-backend-rag-v2
git pull origin codex/pro-backend-rag-v2
```

Si la rama ya fue fusionada, puedes usar `main` o la rama oficial vigente.

## 4. Variables de entorno

Copia `.env.example` a `.env`:

```powershell
Copy-Item .env.example .env
```

Contenido esperado:

```env
PORT=3000

# PostgreSQL cache
DB_HOST=localhost
DB_PORT=5433
DB_NAME=aiagency
DB_USER=aiuser
DB_PASSWORD=changeme

# Local Ollama runtime used by the backend proxy
OLLAMA_HOST=http://localhost:11434
OLLAMA_TIMEOUT_MS=180000

# Express JSON body limit
JSON_LIMIT=50mb
```

## 5. Instalar dependencias Node

```powershell
npm install
```

## 6. Levantar PostgreSQL con Docker

Crear el contenedor recomendado:

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

Si ya existe:

```powershell
docker start thegu_postgres
```

Verificacion:

```powershell
docker exec thegu_postgres pg_isready -U aiuser -d aiagency
```

Respuesta esperada:

```text
/var/run/postgresql:5432 - accepting connections
```

## 7. Instalar modelos de Ollama

El sistema usa:

- `tinyllama:latest`
- `gemma4-fast:latest`
- `qwen3:4b`
- `nomic-embed-text`

Instalacion recomendada:

```powershell
ollama pull tinyllama
ollama pull gemma2:2b
ollama pull qwen2.5:3b
ollama pull nomic-embed-text
```

Crear alias para que coincidan con el codigo del proyecto:

```powershell
ollama copy gemma2:2b gemma4-fast:latest
ollama copy qwen2.5:3b qwen3:4b
```

Verificar modelos:

```powershell
ollama list
```

Debes ver como minimo estos nombres disponibles para el runtime:

- `tinyllama:latest`
- `gemma4-fast:latest`
- `qwen3:4b`
- `nomic-embed-text`

## 8. Verificar Ollama

En muchos equipos Windows queda corriendo como servicio. Si no, inicia el servidor:

```powershell
ollama serve
```

Verificacion:

```powershell
curl http://localhost:11434/api/tags
```

## 9. Arrancar la aplicacion

Modo desarrollo:

```powershell
npm run dev
```

Modo produccion local:

```powershell
npm run build
$env:NODE_ENV="production"
npm start
```

Salida esperada:

```text
Server running on http://0.0.0.0:3000 (Ollama: http://localhost:11434)
```

## 10. Verificaciones funcionales

### 10.1 Salud del backend

```powershell
curl http://localhost:3000/api/health
```

Respuesta esperada:

```json
{"status":"ok","database":"connected","ollamaHost":"http://localhost:11434"}
```

### 10.2 Frontend

Abre:

```text
http://localhost:3000
```

La interfaz debe cargar como `GobIA Auditor`.

### 10.3 Proxy SECOP

```powershell
curl "http://localhost:3000/api/secop/contracts?entity=SENA&limit=3"
```

Debe devolver un arreglo JSON con contratos reales.

### 10.4 Embeddings

```powershell
curl -X POST http://localhost:3000/api/ollama/embeddings `
  -H "Content-Type: application/json" `
  -d '{"model":"nomic-embed-text","prompt":"contrato de prestacion de servicios"}'
```

### 10.5 Contexto legal persistente

```powershell
curl -X POST http://localhost:3000/api/rag/legal-context `
  -H "Content-Type: application/json" `
  -d '{"query":"posible fraccionamiento contractual","redFlags":["fraccionamiento","competencia"]}'
```

## 11. Validacion tecnica obligatoria

Ejecuta estas tres verificaciones antes de dar por instalado el entorno:

```powershell
npm run lint
npm run build
npm run test:e2e
```

Estado validado en esta rama:

- `npm run lint` pasa
- `npm run build` pasa
- `npm run test:e2e` pasa

## 12. Publicar temporalmente desde la misma maquina

Si necesitas una URL web publica sin desplegar a infraestructura externa, el repo incluye scripts para usar `cloudflared`.

Requisito adicional:

- `cloudflared` instalado en `C:\Program Files (x86)\cloudflared\cloudflared.exe`

Iniciar publicacion:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-public.ps1
```

Esto:

- levanta el servidor en `PORT=3055`
- valida `api/health`
- abre un `Quick Tunnel`
- guarda la URL publica en `PUBLIC_URL.txt`

Detener publicacion:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-public.ps1
```

## 13. Dependencias operativas del sistema

Servicios que deben estar disponibles para la experiencia completa:

| Servicio | Puerto | Verificacion |
| --- | --- | --- |
| PostgreSQL Docker | `5433` | `docker exec thegu_postgres pg_isready -U aiuser -d aiagency` |
| Ollama | `11434` | `curl http://localhost:11434/api/tags` |
| App local | `3000` | `curl http://localhost:3000/api/health` |
| Publicacion opcional | `3055` | `Get-Content .\PUBLIC_URL.txt` |

## 14. Comandos utiles

```powershell
git status --short
npm run lint
npm run build
npm run test:e2e
docker ps
ollama list
```

## 15. Troubleshooting rapido

### El backend responde con fallback de memoria

Si `/api/health` no muestra `database: connected`, revisa:

```powershell
docker ps
docker start thegu_postgres
docker logs thegu_postgres --tail 100
```

### El modelo local no responde

```powershell
curl http://localhost:11434/api/tags
ollama list
ollama serve
```

### Falla `npm run test:e2e`

La suite E2E depende de:

- acceso real a SECOP
- Ollama activo
- PostgreSQL operativo

Revisa primero:

```powershell
curl http://localhost:3000/api/health
curl "http://localhost:3000/api/secop/contracts?entity=SENA&limit=1"
```

## 16. Resultado esperado

La maquina queda lista para:

- buscar contratos reales desde SECOP
- generar analisis y reportes dentro de la interfaz
- usar caché persistente en PostgreSQL
- responder consultas del auditor interactivo con Ollama local
- correr pruebas E2E y publicar una demo temporal desde web
