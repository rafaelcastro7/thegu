# Auditoria extrema y reingenieria de producto

Fecha: 2026-05-03
Branch: `codex/pro-backend-rag-v2`

## Diagnostico honesto

El sistema ya tenia una base potente: ingestion SECOP, motor de analisis, RAG legal persistente, generacion local con fallback, expediente tecnico, exportacion y pruebas E2E. El problema principal era de producto: parecia una app con modulos separados en vez de una consola de auditoria. El usuario veia "Panel de Auditoria", "Centro Analitico", "Estado de Red", "Historial" y "Base de Inteligencia" como mundos distintos.

La reingenieria aplicada convierte la experiencia principal en un solo flujo:

- El `Panel de Auditoria` queda como la vista operativa principal.
- El `Centro Analitico` vive dentro del panel y se sincroniza con los hallazgos.
- La red neural, modelos, historial tecnico, base de inteligencia y manual pasan a la consola avanzada del engranaje.
- Se agrega una `Cola priorizada de auditoria` con accion recomendada y trazabilidad por ciclo de contratacion.

## Benchmark usado

Se contrasto contra practicas de:

- Open Contracting Data Standard: trazabilidad por planeacion, licitacion, adjudicacion, contrato e implementacion.
- GOV.UK Contracts Finder: busqueda clara, contratos anteriores, oportunidades, guardado/exportacion/API.
- USASpending: perfiles, busqueda avanzada, API y descargas.
- ChileCompra Datos Abiertos: datos reutilizables y soporte a control social.
- OECD y World Bank: priorizacion de riesgos, red flags por fase y analitica para integridad.

## Cambios implementados

- Menu principal simplificado para dejar visible solo lo esencial para el usuario final.
- Consola avanzada con tabs de calibracion, base IA, red/modelos, historial y manual.
- Centro analitico integrado dentro del panel con estado conectado, patrones aprendidos, cruces de memoria y proveedor en foco.
- Sincronizacion del aprendizaje neural hacia el scoring del panel.
- Cola priorizada de casos con acciones recomendadas por nivel de riesgo.
- Trazabilidad estilo OCDS para evidenciar brechas de datos por ciclo contractual.
- Pruebas E2E ampliadas para validar identidad visual, puente analitico, consola avanzada y generacion de informe.

## Lo que falta para ser clase mundial

- Evidencia de ejecucion: fotos, interventoria, pagos, actas, avances fisicos y georreferenciacion.
- Perfiles consolidados de proveedor: beneficiarios finales, sanciones, relaciones societarias, historico multi-entidad.
- Alertas guardadas y notificaciones por entidad/proveedor/sector.
- Exportacion OCDS/JSON ademas de CSV/PDF.
- Comparador de precios de mercado por sector y region.
- Workflow de caso: asignar responsable, estado, severidad, evidencia, cierre y trazabilidad de decisiones.
- Accesibilidad formal WCAG y pruebas visuales responsive mas profundas.

## Criterio de cierre de esta vuelta

- `npm run lint`: aprobado.
- `npm run build`: aprobado.
- `npm run test:e2e`: aprobado.
- Estado protegido en branch separado, sin tocar `main`.

Auto-respuesta: esto no es aun "lo maximo posible" como plataforma nacional, porque faltan fuentes externas de ejecucion, beneficiarios finales y workflow real de casos. Pero si es una mejora fuerte y verificable del producto actual: menos ruido visible, mas foco para el usuario y una arquitectura de experiencia mas profesional.
