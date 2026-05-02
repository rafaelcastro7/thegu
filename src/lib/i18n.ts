
export type Language = 'ES' | 'EN';

export const translations = {
  ES: {
    nav: {
      intel: 'PANEL DE AUDITORÍA',
      hub: 'CENTRO ANALÍTICO',
      nodes: 'ESTADO DE LA RED',
      logs: 'HISTORIAL TÉCNICO',
      about: 'AYUDA Y MANUAL'
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
      export: 'Descargar Informe de Hallazgos',
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
      topology: 'Monitoreo de Topología Neural',
      active_node: 'Nodo Activo',
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
      logic_feed: 'Bitácora de Pensamiento de la IA',
      cluster_viz: 'Mapa de Colaboración de Agentes'
    },
    about: {
      title: 'MANUAL TÉCNICO Y DE USUARIO',
      mission: 'Misión del Proyecto',
      mission_text: 'GOB_IA es una plataforma de vanguardia diseñada para la detección proactiva de irregularidades en la contratación pública colombiana, utilizando modelos de lenguaje de gran escala (LLMs) y análisis vectorial.',
      how_it_works: '¿Cómo funciona?',
      step_1: 'Ingesta de Datos',
      step_1_text: 'El sistema se conecta en tiempo real a la API de SECOP II para obtener los últimos contratos firmados por entidades gubernamentales.',
      step_2: 'Análisis Semántico',
      step_2_text: 'Utilizamos embeddings de Google Gemini para convertir el objeto de cada contrato en un vector matemático. Esto permite detectar cuando un proveedor recibe múltiples contratos con descripciones casi idénticas en ventanas de tiempo sospechosas.',
      step_3: 'Auditoría de Agentes',
      step_3_text: 'Tres agentes de IA (Neural Auditor, Vector Validator, Pattern Sentinel) revisan cada cluster para asignar un nivel de riesgo basado en el histórico y la probabilidad de colusión.',
      manual: 'Guía de Usuario',
      instruction_search: 'Usa el buscador para analizar entidades específicas por su nombre en SECOP II.',
      instruction_risk: 'Haz clic en cualquier tarjeta de resultado para ver el análisis detallado y la justificación de la IA.',
      instruction_cache: 'Los resultados se guardan localmente para rapidez. Usa "REINICIAR CACHE" para forzar un nuevo escaneo.',
      juror_note: 'Nota para el Jurado',
      juror_text: 'Esta herramienta no solo automatiza la revisión física, sino que encuentra relaciones semánticas que escapan al ojo humano y a las búsquedas tradicionales por palabras clave.'
    }
  },
  EN: {
    nav: {
      intel: 'AUDIT',
      hub: 'AI HUB',
      nodes: 'AI PANEL',
      logs: 'HISTORY',
      about: 'HELP & MANUAL'
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
      export: 'Export Report',
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
      topology: 'Neural Topology Monitoring',
      active_node: 'Active Node',
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
      logic_feed: 'AI Thought Log',
      cluster_viz: 'Agent Collaboration Map'
    },
    about: {
      title: 'TECHNICAL & USER MANUAL',
      mission: 'Project Mission',
      mission_text: 'GOB_IA is a cutting-edge platform designed for proactive detection of irregularities in Colombian public procurement, using large language models (LLMs) and vector analysis.',
      how_it_works: 'How it works?',
      step_1: 'Data Ingestion',
      step_1_text: 'The system connects in real-time to the SECOP II API to fetch the latest contracts signed by government entities.',
      step_2: 'Semantic Analysis',
      step_2_text: "We use Google Gemini embeddings to convert each contract's object into a mathematical vector. This enables detecting when a provider receives multiple contracts with nearly identical descriptions in suspicious time frames.",
      step_3: 'Agent Audit',
      step_3_text: 'Three AI agents (Neural Auditor, Vector Validator, Pattern Sentinel) review each cluster to assign a risk level based on history and collusion probability.',
      manual: 'User Guide',
      instruction_search: 'Use the search bar to analyze specific entities by their name in SECOP II.',
      instruction_risk: 'Click on any result card to see detailed analysis and AI justification.',
      instruction_cache: 'Results are saved locally for speed. Use "RESET CACHE" to force a new scan.',
      juror_note: 'Note for the Jury',
      juror_text: 'This tool does not just automate physical review; it finds semantic relationships that escape the human eye and traditional keyword searches.'
    }
  }
};
