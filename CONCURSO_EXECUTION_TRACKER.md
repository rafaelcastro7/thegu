# Concurso Execution Tracker

Ultima actualizacion: 2026-05-08
Estado: documento vivo de ejecucion

## Objetivo
Consolidar en un solo lugar todos los cambios pedidos para GobIA Auditor, con estado real de implementacion, verificacion y pendientes. Este documento se debe actualizar de forma continua durante el trabajo.

## Leyenda
- `DONE`: implementado y validado
- `PARTIAL`: iniciado pero falta cerrar o verificar
- `TODO`: aun no implementado
- `BLOCKED`: depende de credenciales, acceso o validacion externa

## Flujo de trabajo
1. Registrar cada pedido nuevo en este documento.
2. Ejecutar el cambio en codigo, infraestructura o datos.
3. Validar con `lint`, `build`, smoke tests y revision visual.
4. Actualizar estado, notas y archivos tocados.

## Hecho

### Plataforma y publicacion
- `DONE` Publicacion temporal via Cloudflare Tunnel.
- `DONE` URL publica guardada en `PUBLIC_URL.txt`.
- `DONE` Scripts para encender y apagar la publicacion local.
- `DONE` Validacion basica de `npm run build`.
- `DONE` Guia `SETUP_DESDE_CERO.md` reescrita como manual operativo real para otra maquina.
- `DONE` `.env.example` alineado con la configuracion recomendada del proyecto.

### Branding y limpieza inicial
- `DONE` Cambio de titulo visible a `GobIA Auditor`.
- `DONE` Limpieza de parte del branding viejo `BHA` en textos visibles.
- `DONE` Reescritura de paneles teatrales/fake de actividad de agentes a copy mas sobrio.

### Dossier y evidencia
- `DONE` El dossier probatorio ya no descarga por defecto; funciona como ventana interna con contrato e infraccion exacta.
- `DONE` Botones internos del dossier apuntan a abrir la fuente del contrato dentro del flujo de UI.

### Motor y persistencia
- `DONE` Fallback en memoria si PostgreSQL no responde.
- `DONE` Cache local y persistencia de resultados hidratados desde `localStorage`.

### Visualizacion de agentes
- `DONE` Integracion inicial de Phaser.js en frontend.
- `DONE` Nuevo `src/components/AgentOffice.tsx` con escena 2D de oficina responsiva.
- `DONE` Sincronizacion visual basada en eventos de estado derivados de `logs`.
- `DONE` Rediseño de la vista de actividad a una consola secuencial con resumen, flujo reciente, mapa operativo y detalle por modulos.

## En curso

### Arquitectura UX
- `DONE` Separacion funcional entre `Panel de auditoria` y `Sistema`.
  Nota: `src/App.tsx` ya navega sin errores de tipos entre `AUDIT` y `SYSTEM`, con subtabs visibles en la capa del sistema.

### Fuente SECOP interna
- `DONE` Se agrego endpoint interno para recuperar y mostrar contenido SECOP desde backend.
- `DONE` Existe modal interno de visualizacion de fuente con metadata del contrato, resumen y texto recuperado.
- `DONE` El flujo visible principal ya mantiene al usuario dentro del sistema para revisar fuente SECOP y evidencia contractual.

### Auditoria interactiva
- `DONE` Preguntas sugeridas iniciales y capa adaptativa en funcion del historial.
- `DONE` Cache de sugerencias y precalentamiento local.
- `DONE` Respuestas deterministas de baja latencia para preguntas frecuentes.
- `PARTIAL` Falta seguir puliendo exactitud, cobertura de casos y experiencia visual tipo asistente premium.

### Reporte de hallazgos
- `DONE` El acceso principal desde hallazgos ya no descarga directamente; abre una experiencia interna de reporte.
- `DONE` Se agrego una ventana emergente de panorama ejecutivo con descarga PDF secundaria.
- `DONE` El expediente ahora abre con un resumen inmediato y luego se refina en segundo plano para evitar esperas ciegas.
- `PARTIAL` El PDF ya sale desde una vista membreteada, pero aun puede mejorar en narrativa y secciones pedagogicas.

### Datos reales, cache y vectorizacion
- `PARTIAL` La base tiene cache de analisis y reportes.
- `PARTIAL` Conteos verificados:
  - `analysis_cache`: 14
  - `report_cache`: 4
  - `legal_context_cache`: 0 al momento de la verificacion
- `TODO` Precargar mas data real analizada para minimizar latencia.
- `TODO` Vectorizar y persistir mejor el contexto legal y preguntas frecuentes.

## Pendiente

### Producto y contenido
- `TODO` Reorganizar toda la capa documental/comercial para jurado y publico con estructura mas estrategica.
- `TODO` Agregar flujos e imagenes super claras para explicar operacion real del sistema.
- `TODO` Mejorar tooltips y explicaciones de:
  - autoaprendizaje
  - auditoria retroactiva
  - modulos y salidas clave

### Consola avanzada
- `TODO` Convertir configuracion avanzada en consola profesional, completa y parametrizable.

### Contratos y fuentes
- `PARTIAL` Permitir abrir los contratos y fuentes sin salir del sistema en todos los puntos de la UX.
- `DONE` Ya se muestran identificadores verificables de proceso/adjudicacion para distinguir contratos dentro del dossier y del desglose tecnico.

### Limpieza UX general
- `TODO` Revisar y eliminar mensajes dirigidos a desarrolladores.
- `TODO` Hacer un roast completo del sistema y cerrar inconsistencias de interfaz.
- `PARTIAL` Redisenar la UX general con mejor jerarquia, tabs/subtabs y coherencia visual.

### Infraestructura de rendimiento
- `TODO` Completar modo concurso del PC:
  - dejar vivo TeamViewer
  - dejar vivo backend, tunnel, Docker/DB y motores utiles
  - apagar procesos locales duplicados o ajenos al demo
  - dejar checklist final de dependencias activas
- `TODO` Validar disponibilidad real de Ollama y su impacto en latencia del sistema.

### Integraciones externas
- `TODO` Buscar e integrar, si existen credenciales reales disponibles, conectores remotos para Google y Claude.
  Estado actual: no hay evidencia consolidada aun de configuracion usable dentro del repo principal.

### Skills y capacidades
- `TODO` Auditar skills/capacidades disponibles en el entorno y documentar cuales se aprovechan en el sistema.
- `TODO` Si aplica, crear skill local operativa para flujos repetitivos del concurso.

## Bloqueos y validaciones
- `BLOCKED` Integraciones Google/Claude requieren confirmar existencia de credenciales utiles o endpoints reales.
- `DONE` `npm run lint` vuelve a pasar.
- `DONE` `npm run build` vuelve a pasar.
- `DONE` Caso E2E critico de carga de hallazgo persistido y reporte forense vuelve a pasar.
- `DONE` Suite `npm run test:e2e` completa vuelve a pasar.
- `DONE` Se agregaron limites operativos y fallback rapido en el flujo de reporte y consulta legal para evitar bloqueos de UX.

## Archivos clave tocados hasta ahora
- `src/App.tsx`
- `src/components/AgentOffice.tsx`
- `src/components/CortexDashboard.tsx`
- `src/components/KnowledgeBase.tsx`
- `src/components/TechnicalFindings.tsx`
- `src/lib/agents.ts`
- `src/lib/gemini.ts`
- `src/lib/i18n.ts`
- `src/lib/intelligence.ts`
- `src/lib/localAgents.ts`
- `src/lib/secop.ts`
- `src/server/app.ts`
- `src/server/database.ts`
- `index.html`
- `package.json`
- `package-lock.json`

## Proximo cierre operativo
1. Completar la depuracion de salidas externas restantes y reforzar experiencia 100% in-app.
2. Seguir elevando el informe PDF con mas narrativa util y guia de lectura.
3. Afinar todavia mas la auditoria interactiva para respuestas premium y tiempos consistentes.
4. Continuar la auditoria integral del producto contra el tracker vivo.
5. Publicar los cambios consolidados al remoto y mantener esta guia como fuente oficial de bootstrap.
