
export type Language = 'ES' | 'EN';

export const translations = {
  ES: {
    nav: {
      intel: 'PANEL DE AUDITORÍA',
      hub: 'CENTRO ANALÍTICO',
      nodes: 'ESTADO DE LA RED',
      logs: 'HISTORIAL TÉCNICO',
      about: 'AYUDA Y MANUAL',
      knowledge: 'BASE DE INTELIGENCIA'
    },
    header: {
      status: 'Estado del Servicio',
      uptime: 'Disponibilidad',
      search_placeholder: 'Buscar Entidad (Ej: SENA, DIAN, UNGRD)...'
    },
    dashboard: {
      title: 'Sistema de Vigilancia de Contratación Pública',
      subtitle: 'Herramienta de Auditoría Inteligente para la Detección de Riesgos en SECOP II',
      exposure: 'Presupuesto Bajo Análisis',
      clusters: 'Proveedores Identificados',
      variance: 'Alertas de Alto Riesgo',
      purity: 'Confiabilidad del Sistema',
      pattern_discovery: 'Hallazgos de Auditoría (IA)',
      export: 'Ver Informe de Hallazgos',
      syncing: 'Sincronizando con los servidores de SECOP II...',
      empty: 'Iniciando escaneo preventivo de entidades nacionales...'
    },
    help: {
      risk_score: 'Puntaje de 0 a 100 que indica la probabilidad de irregularidad basada en la repetición de objetos contractuales.',
      similarity: 'Grado de coincidencia textual entre contratos de un mismo proveedor. Valores altos sugieren "contratos espejo".',
      exposure: 'Monto total invertido por la entidad en el grupo de contratos analizado.',
      window: 'Tiempo transcurrido entre la firma de los contratos sospechosos.',
      load_full: 'Auditoría Integral: Análisis de los últimos 100 registros históricos.',
      load_ref: 'Escaneo Rápido: Análisis de los 30 registros más recientes.'
    },
    cortex: {
      topology: 'Monitoreo de modelos y rendimiento',
      active_node: 'Motor activo',
      inference_volume: 'Volumen de Inferencia',
      tokens_processed: 'Total de Tokens Procesados',
      economic_burn: 'Consumo Económico',
      operational_cost: 'Costo Operativo Estimado',
      registry: 'Registro de Modelos y Enrutamiento',
      integrity: 'Integridad del Sistema',
      security_protocol: 'Protocolo de Seguridad',
      security_desc: 'Los modelos locales se ejecutan en un contexto de navegador seguro usando Transformers.js. Cero datos salen del entorno durante los ciclos de inferencia locales.',
      stability: 'Estabilidad API',
      cluster_load: 'Carga Cluster Local',
      verification: 'Tasa Verificación'
    },
    agents: {
      calibration: 'Centro de Comando de Agentes AI',
      cycles: 'Simulaciones Realizadas',
      sensitivity: 'Ajuste de Sensibilidad',
      execute_cycle: 'Ejecutar Auditoría Global',
      scanning: 'Agentes Analizando Red...',
      logic_feed: 'Bitácora operativa',
      cluster_viz: 'Vista de actividad del sistema'
    },
    about: {
      title: 'MANUAL OPERATIVO GOBIA AUDITOR',
      mission: 'Misión de Vigilancia',
      mission_text: 'GobIA Auditor es una plataforma de analítica forense diseñada para detectar fraccionamiento contractual y señales de baja competencia en la contratación pública colombiana.',
      how_it_works: 'Arquitectura del Sistema',
      step_1: 'Ingesta Bio-Inspirada',
      step_1_text: 'El sistema descarga en tiempo real procesos de SECOP II, analizando no solo el monto sino la densidad técnica del objeto contractual.',
      step_2: 'Procesamiento Semántico',
      step_2_text: 'Convertimos el lenguaje natural de cada contrato en embeddings vectoriales (768 dimensiones). Esto permite identificar similitudes conceptuales que los algoritmos tradicionales ignoran.',
      step_3: 'Auditoría Multi-Agente',
      step_3_text: 'Un enjambre de 3 agentes (Auditor, Validador y Sentinel) colaboran para calificar el riesgo. Si el patrón se repite, se activa la alerta "ROJA" de fraccionamiento.',
      manual: 'Guía de Operación',
      instruction_search: 'Busque entidades nacionales por su nombre oficial. El sistema descargará y procesará automáticamente los últimos 30-100 procesos.',
      instruction_risk: 'Revise los hallazgos en rojo. Cada uno cuenta con un "Auditor Interactivo" (Chatbot) que le explicará la base jurídica y técnica del riesgo encontrado.',
      instruction_cache: 'El sistema reutiliza caché de análisis y reportes para acelerar revisiones posteriores.',
      juror_note: 'Nota técnica del sistema',
      juror_text: 'GobIA Auditor no es un buscador documental; es un motor de inferencia que detecta cuando una necesidad pública podría estar fragmentada en múltiples contratos de menor escala.'
    }
  },
  EN: {
    nav: {
      intel: 'AUDIT',
      hub: 'AI HUB',
      nodes: 'AI PANEL',
      logs: 'HISTORY',
      about: 'HELP & MANUAL',
      knowledge: 'INTELLIGENCE BASE'
    },
    header: {
      status: 'System Status',
      uptime: 'System Uptime',
      search_placeholder: 'TARGET ENTITY IDENTIFIER...'
    },
    dashboard: {
      title: 'Fiscal Infrastructure Monitor',
      subtitle: 'Detecting anomalies in public procurement using Artificial Intelligence',
      exposure: 'Funds Under Analysis',
      clusters: 'Contract Groups',
      variance: 'Red Flags',
      purity: 'AI Accuracy',
      pattern_discovery: 'Atypical Pattern Discovery',
      export: 'Open Findings Report',
      syncing: 'Syncing data stream with SECOP II...',
      empty: 'Initiating automated discovery of irregularities...'
    },
    help: {
      risk_score: 'Risk level calculated based on atypical procurement patterns.',
      similarity: 'Measures how similar contracts from the same provider are in a short period.',
      exposure: 'Total sum of contracts analyzed for this entity/provider.',
      window: 'Day difference between the signing of suspicious contracts.',
      load_full: 'Deep Audit: Exhaustive analysis of every contract from the provider.',
      load_ref: 'Reference Load: Quick scan of high-level patterns.'
    },
    cortex: {
      topology: 'Model and performance monitoring',
      active_node: 'Active engine',
      inference_volume: 'Inference Volume',
      tokens_processed: 'Total Tokens Processed',
      economic_burn: 'Economic Burn',
      operational_cost: 'Estimated Operational Cost',
      registry: 'Model Registry & Routing',
      integrity: 'System Integrity',
      security_protocol: 'Security Protocol',
      security_desc: 'Local models run within a sandboxed browser context using Transformers.js. Zero data leaves the environment during local inference.',
      stability: 'API Stability',
      cluster_load: 'Local Cluster Load',
      verification: 'Verification Rate'
    },
    agents: {
      calibration: 'AI Agent Command Center',
      cycles: 'Total Simulations',
      sensitivity: 'Sensitivity Adjustment',
      execute_cycle: 'Execute Global Audit',
      scanning: 'Agents Scanning Network...',
      logic_feed: 'Operational log',
      cluster_viz: 'System activity view'
    },
    about: {
      title: 'GOBIA AUDITOR OPERATING MANUAL',
      mission: 'Vigilance Mission',
      mission_text: 'GobIA Auditor is a forensic analytics platform designed to detect contract splitting and weak-competition signals in Colombian public procurement.',
      how_it_works: 'System Architecture',
      step_1: 'Bio-Inspired Ingestion',
      step_1_text: 'The system downloads SECOP II processes in real-time, analyzing not just the amount but the technical density of the contractual object.',
      step_2: 'Semantic Processing',
      step_2_text: 'We convert the natural language of each contract into vector embeddings (768 dimensions). This identifies conceptual similarities that traditional algorithms ignore.',
      step_3: 'Multi-Agent Audit',
      step_3_text: 'A swarm of 3 agents (Auditor, Validator, and Sentinel) collaborate to score risk. If the pattern repeats, a "RED" flag for contract splitting is triggered.',
      manual: 'Operation Guide',
      instruction_search: 'Search for national entities by their official name. The system will automatically download and process the last 30-100 records.',
      instruction_risk: 'Review findings in red. Each one has an "Interactive Auditor" (Chatbot) that will explain the legal and technical basis of the detected risk.',
      instruction_cache: 'The system reuses analysis and report caches to speed up subsequent reviews.',
      juror_note: 'System technical note',
      juror_text: 'GobIA Auditor is not a document search engine; it is an inference engine that detects when one public need may be fragmented into multiple smaller contracts.'
    }
  }
};
