# Changelog: GobIA Auditor

## [1.2.0] - 2026-05-02
### Added
- Integración de sección "Acerca de" con detalles del Hackathon 2026.
- Generación automática de reportes con estructura obligatoria (Resumen, Hechos, Fuente Jurídica).
- Motor de búsqueda optimizado para entidades de SECOP II.

## [1.1.0] - 2026-04-25
### Changed
- Migración de procesamiento local a embeddings semánticos con Gemini.
- Implementación de semáforo de riesgo basado en 3 variables: Similitud > 85%, Ventana < 90 días, Valor > 50M.
- Refactorización de UI a estética de auditoría técnica (Inter & JetBrains Mono).

## [1.0.0] - 2026-04-18
### Added
- MVP Base: Conexión con API de Socrata.
- Agrupamiento de contratos por NIT de proveedor.
- Configuración inicial de Gemini 1.5 Pro (luego actualizado a 2.5 Flash).
- Esquema jurídico inicial (Ley 80).
