# Guía de Despliegue de THEGU (Entorno 100% Local)

Este documento detalla los pasos exactos para recrear el entorno de **THEGU (Bot de Hallazgos y Auditoría)** en una computadora desde cero. El escenario a replicar asume que **no hay bases de datos instaladas ni modelos de IA descargados**, y que se utilizará la arquitectura centralizada "Hub-and-Spoke" de la Agencia de IA (PostgreSQL centralizado y modelos Ollama en el host).

## Paso 0: Preparación del Entorno (Máquina en blanco)

Si la computadora es completamente nueva y no tiene nada instalado, abre una terminal y ejecuta los siguientes comandos para instalar las herramientas fundamentales.

### 1. Instalar Docker y Docker Compose
Es la base de la infraestructura, ya que THEGU y la base de datos corren en contenedores aislados.

**En Ubuntu/Linux:**
```bash
# Descargar e instalar Docker
curl -fsSL https://get.docker.com | sh

# Agregar tu usuario al grupo docker (para no usar sudo en cada comando)
sudo usermod -aG docker $USER
newgrp docker

# Verificar instalación
docker compose version
```
*(Si usas **Windows** o **Mac**, descarga e instala [Docker Desktop](https://www.docker.com/products/docker-desktop) directamente).*

### 2. Instalar Git
Necesario para clonar este repositorio.
**En Ubuntu/Linux:** `sudo apt update && sudo apt install git -y`
*(En Windows, descarga [Git for Windows](https://gitforwindows.org/)).*

### 3. Instalar Ollama (Motor Local de IA)
Ollama es el entorno que permite correr la inteligencia artificial directamente usando la tarjeta de video (GPU) o procesador local.
**En Linux/WSL:**
```bash
curl -fsSL https://ollama.com/install.sh | sh
```
*(Para **Windows/Mac**, descarga el instalador desde [ollama.com](https://ollama.com/download)).*

---

## Paso 1: Configurar el Motor de Inteligencia Artificial (Ollama)

Dado que los modelos se ejecutan en el entorno local (Host) para aprovechar la aceleración por hardware (GPU/Apple Silicon), primero debemos descargar los modelos requeridos por la arquitectura.

Abre una terminal y ejecuta:

```bash
# Iniciar el servicio de Ollama (si no inicia automáticamente)
# En Windows/Mac, asegúrate de que la aplicación Ollama esté abierta.
# En Linux: sudo systemctl start ollama

# Descargar el modelo Worker/Generativo principal
ollama pull tinyllama

# Descargar modelos generativos de respaldo
ollama pull gemma4-fast

ollama pull qwen3:4b

# Descargar el modelo de Embeddings RAG
ollama pull nomic-embed-text
```

> **Verificación:** Ejecuta `ollama list` para asegurar que ambos modelos aparecen en la lista.

---

## Paso 2: Crear la Red y Levantar la Infraestructura Base (PostgreSQL)

Para seguir las mejores prácticas de microservicios, todos los contenedores deben comunicarse a través de una red interna dedicada de Docker. 

1. Abre la terminal y crea la red principal de la agencia:
   ```bash
   docker network create ai-net
   ```

2. THEGU está diseñado para conectarse a un servidor PostgreSQL unificado. Si estás desplegando THEGU en una computadora nueva donde no existe la infraestructura base, crea un archivo llamado `docker-compose.infra.yml` con el siguiente contenido:

```yaml
version: '3.8'

services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: postgres
    environment:
      POSTGRES_DB: aiagency
      POSTGRES_USER: aiuser
      POSTGRES_PASSWORD: aiagency_secure_2026
    ports: 
      - "5433:5432"
    volumes:
      - pg_data_thegu:/var/lib/postgresql/data
    networks:
      - ai-net

volumes:
  pg_data_thegu:

networks:
  ai-net:
    external: true
```

3. Levanta este servicio de infraestructura en segundo plano ejecutando:

```bash
docker-compose -f docker-compose.infra.yml up -d
```

> **Nota:** Esto levanta la base de datos dentro de la red `ai-net`, respondiendo internamente al host `postgres` (puerto 5432), pero exponiéndose al puerto `5433` hacia tu máquina física.

---

## Paso 3: Inicializar y Levantar THEGU

Con los modelos listos y la base de datos corriendo, es momento de levantar la aplicación THEGU. Esta aplicación corre en su propio contenedor y se conecta a los servicios del Host mediante `host.docker.internal`.

1. Navega al directorio de THEGU:
   ```bash
   cd ruta/hacia/PROYECTOS/AgencIA/thegu
   ```

2. Construye e inicia el contenedor de la aplicación:
   ```bash
   docker-compose up --build -d
   ```

---

## Paso 4: Acceder y Validar el Sistema

1. **Acceso Web:** Abre tu navegador y dirígete a:  
   👉 **http://localhost:3030**

2. **Verificar Conexión a la BD:** Al hacer una búsqueda (ej. "CARDIQUE"), THEGU conectará con la API de SECOP II, realizará los cálculos iniciales y guardará el reporte en caché en PostgreSQL (`localhost:5433`).
   
3. **Verificar Modelos Locales:** Al hacer clic en una tarjeta para ver el "Informe de Auditoría", la plataforma enviará el contexto a Ollama (`http://localhost:11434`) usando `qwen3:4b`.

## Solución de Problemas Comunes

- **No conecta a PostgreSQL:** Asegúrate de que tu Docker permite la resolución de `host.docker.internal`. En Windows y Mac funciona por defecto. En Linux, `extra_hosts: ['host.docker.internal:host-gateway']` en el `docker-compose.yml` solventa esto.
- **Ollama Error de Conexión:** Por defecto, Ollama solo escucha en `127.0.0.1`. Si estás en Linux, puede ser necesario ajustar las variables de entorno de Ollama para que escuche en todas las interfaces: `OLLAMA_HOST=0.0.0.0 ollama serve`.
- **Lentitud extrema en IA:** Revisa que Ollama esté detectando la GPU. Si la inferencia corre en CPU, tomará considerablemente más tiempo.
