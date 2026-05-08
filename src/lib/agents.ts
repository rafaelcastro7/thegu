import { generateForensicReport } from './gemini';
import { getLegalContext } from './ragManager';
import { AnalysisResult } from './analysis';
import { neuralManager } from './neuralManager';

export type AgentId = 'FORENSIC' | 'LEGAL' | 'SYSTEM' | 'FINANCIAL' | 'ETHICS' | 'FIELD';

export interface AgentAction {
  agent: AgentId;
  message: string;
  timestamp: string;
  status: 'THINKING' | 'EXECUTING' | 'OPTIMIZING' | 'COMPLETED' | 'IDLE';
}

export interface NeuralMemory {
  totalAudits: number;
  detectedPatterns: string[];
  systemBiasAdjustment: number;
}

const MEMORY_KEY = 'gob_ia_neural_memory';

export const AGENT_PERSONAS = {
  FORENSIC: {
    name: 'Correlacion de patrones',
    focus: 'Similitud, ventanas temporales y sintesis',
    role: 'Convierte el lote analizado en una lectura ejecutiva y probatoria.',
    color: '#a855f7',
    icon: 'Activity',
  },
  LEGAL: {
    name: 'Contexto normativo',
    focus: 'RAG juridico y referencias aplicables',
    role: 'Recupera y ordena normas, principios y contexto legal relevante.',
    color: '#10b981',
    icon: 'Gavel',
  },
  SYSTEM: {
    name: 'Memoria operativa',
    focus: 'Sesion, aprendizaje y consistencia',
    role: 'Mantiene memoria de patrones, estado de la sesion y recalibracion.',
    color: '#3b82f6',
    icon: 'Cpu',
  },
  FINANCIAL: {
    name: 'Concentracion de valor',
    focus: 'Cuantias, agregacion y umbrales',
    role: 'Resume exposicion economica y patrones de acumulacion de monto.',
    color: '#f59e0b',
    icon: 'DollarSign',
  },
  ETHICS: {
    name: 'Revision competitiva',
    focus: 'Modalidades y presion competitiva',
    role: 'Evalua el peso de modalidades no competitivas dentro del grupo.',
    color: '#ef4444',
    icon: 'ShieldCheck',
  },
  FIELD: {
    name: 'Trazabilidad documental',
    focus: 'Fechas, contratos y fuente abierta',
    role: 'Prepara la trazabilidad contrato a contrato usando el registro disponible.',
    color: '#64748b',
    icon: 'MapPin',
  },
};

function getMemory(): NeuralMemory {
  const saved = localStorage.getItem(MEMORY_KEY);
  return saved ? JSON.parse(saved) : { totalAudits: 0, detectedPatterns: [], systemBiasAdjustment: 0 };
}

function saveMemory(mem: NeuralMemory) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
}

function buildCompetitionSummary(result: AnalysisResult, isEs: boolean) {
  const nonCompetitiveCount = result.contracts.filter((contract) => {
    const modality = contract.modalidad_de_contratacion?.toUpperCase() || '';
    return (
      modality.includes('DIRECTA') ||
      modality.includes('MINIMA') ||
      modality.includes('PRESTACION DE SERVICIOS')
    );
  }).length;

  const share = result.contracts.length > 0 ? Math.round((nonCompetitiveCount / result.contracts.length) * 100) : 0;
  return isEs
    ? `Modalidades no competitivas en ${nonCompetitiveCount}/${result.contracts.length} contratos (${share}%).`
    : `Non-competitive procedures in ${nonCompetitiveCount}/${result.contracts.length} contracts (${share}%).`;
}

export async function runCollaborativeAudit(
  result: AnalysisResult,
  lang: 'ES' | 'EN' = 'ES',
  onUpdate?: (logs: AgentAction[], memory: NeuralMemory) => void
) {
  const memory = getMemory();
  const logs: AgentAction[] = [];
  const isEs = lang === 'ES';

  const addLog = (agent: AgentAction['agent'], message: string, status: AgentAction['status']) => {
    logs.push({ agent, message, timestamp: new Date().toISOString(), status });
    if (onUpdate) onUpdate([...logs], { ...memory });
  };

  addLog(
    'SYSTEM',
    isEs
      ? `Recuperando memoria de sesion. Patrones activos: ${memory.detectedPatterns.length}.`
      : `Restoring session memory. Active patterns: ${memory.detectedPatterns.length}.`,
    'THINKING'
  );
  await neuralManager.processRequest('Restore session memory', { type: 'SYSTEM' });
  addLog(
    'SYSTEM',
    isEs
      ? `Ciclos historicos disponibles: ${memory.totalAudits}.`
      : `Historical audit cycles available: ${memory.totalAudits}.`,
    'COMPLETED'
  );

  addLog(
    'LEGAL',
    isEs
      ? `Consultando contexto legal para ${result.redFlags.length} alerta(s).`
      : `Retrieving legal context for ${result.redFlags.length} alert(s).`,
    'EXECUTING'
  );
  const legalContext = await getLegalContext(result.contracts[0].objeto_del_contrato, result.redFlags);
  addLog(
    'LEGAL',
    isEs ? 'Contexto normativo priorizado para el expediente.' : 'Legal context ranked for the case file.',
    'COMPLETED'
  );

  addLog(
    'ETHICS',
    buildCompetitionSummary(result, isEs),
    'COMPLETED'
  );

  addLog(
    'FINANCIAL',
    isEs
      ? `Exposicion agregada identificada: $${result.totalValue.toLocaleString()}.`
      : `Aggregated exposure identified: $${result.totalValue.toLocaleString()}.`,
    'COMPLETED'
  );

  addLog(
    'FIELD',
    isEs
      ? `Trazabilidad preparada para ${result.contracts.length} contrato(s) con fechas y fuente abierta.`
      : `Traceability assembled for ${result.contracts.length} contract(s) with dates and open source references.`,
    'COMPLETED'
  );

  addLog(
    'FORENSIC',
    isEs
      ? 'Sintetizando hallazgo, evidencia y lectura ejecutiva.'
      : 'Synthesizing the finding, evidence, and executive readout.',
    'THINKING'
  );

  const forensicPrompt = isEs
    ? `Realiza una auditoria forense profunda para ${result.providerName}. El riesgo es ${result.riskScore}/100. Analiza la similitud del ${(result.similarityScore * 100).toFixed(1)}% y los ${result.contracts.length} contratos encontrados. Utiliza el contexto legal: ${legalContext}`
    : `Perform a deep forensic audit for ${result.providerName}. Risk is ${result.riskScore}/100. Analyze the ${(result.similarityScore * 100).toFixed(1)}% similarity and the ${result.contracts.length} contracts found. Use legal context: ${legalContext}`;

  const report = await neuralManager.processRequest(forensicPrompt, { type: 'FORENSIC', result, lang });
  addLog(
    'FORENSIC',
    isEs ? 'Informe tecnico consolidado.' : 'Technical report consolidated.',
    'COMPLETED'
  );

  addLog(
    'SYSTEM',
    isEs ? 'Actualizando memoria del caso y sensibilidad del sistema.' : 'Updating case memory and system sensitivity.',
    'OPTIMIZING'
  );
  memory.totalAudits += 1;
  if (result.risk === 'Red') {
    const uniqueFlags = result.redFlags.filter((flag) => !memory.detectedPatterns.includes(flag));
    memory.detectedPatterns.push(...uniqueFlags);
  }
  memory.systemBiasAdjustment += 0.005;
  saveMemory(memory);
  addLog(
    'SYSTEM',
    isEs ? 'Memoria de sesion actualizada.' : 'Session memory updated.',
    'COMPLETED'
  );

  return { report, logs, memory };
}

export async function performAutonomousTraining(entity: string) {
  const logs: AgentAction[] = [];
  const addLog = (agent: AgentAction['agent'], message: string, status: AgentAction['status']) => {
    logs.push({ agent, message, timestamp: new Date().toISOString(), status });
  };

  addLog('SYSTEM', `Preparando nuevo ciclo de entrenamiento para ${entity}.`, 'EXECUTING');
  await neuralManager.processRequest(`Boot training sequence for ${entity}`, { type: 'TRAINING' });

  addLog('LEGAL', `Reindexando contexto legal asociado a ${entity}.`, 'EXECUTING');
  await neuralManager.processRequest(`Index legal vectors for ${entity}`, { type: 'TRAINING' });

  addLog('FORENSIC', `Recalculando patrones recurrentes para ${entity}.`, 'OPTIMIZING');
  await neuralManager.processRequest(`Execute local training on ${entity} patterns`, { type: 'TRAINING' });

  const memory = getMemory();
  memory.totalAudits += 1;
  memory.systemBiasAdjustment += 0.002;
  saveMemory(memory);

  addLog('SYSTEM', `Ciclo de entrenamiento finalizado para ${entity}.`, 'COMPLETED');
  return { logs, memory };
}
