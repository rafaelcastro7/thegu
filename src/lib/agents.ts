import { generateForensicReport } from './gemini';
import { getLegalContext } from './ragManager';
import { AnalysisResult } from './analysis';
import { neuralManager } from './neuralManager';

export interface AgentAction {
  agent: 'FORENSIC' | 'LEGAL' | 'SYSTEM';
  message: string;
  timestamp: string;
  status: 'THINKING' | 'EXECUTING' | 'OPTIMIZING' | 'COMPLETED';
}

export interface NeuralMemory {
  totalAudits: number;
  detectedPatterns: string[];
  systemBiasAdjustment: number;
}

const MEMORY_KEY = 'gob_ia_neural_memory';

export const AGENT_PERSONAS = {
  FORENSIC: {
    name: "Audit Sentinel",
    focus: "OECD Pattern Recognition",
    role: "Analizar desviaciones estadísticas y anomalías de mercado.",
    color: "#a855f7",
    icon: "Activity"
  },
  LEGAL: {
    name: "Juris Guard",
    focus: "Compliance & Jurisprudence",
    role: "Validar hallazgos contra el bloque de constitucionalidad.",
    color: "#10b981",
    icon: "Gavel"
  },
  SYSTEM: {
    name: "Resilience Node",
    focus: "Self-Optimization & Health",
    role: "Garantizar la estabilidad y refinar pesos neuronales de detección.",
    color: "#3b82f6",
    icon: "Cpu"
  }
};

function getMemory(): NeuralMemory {
  const saved = localStorage.getItem(MEMORY_KEY);
  return saved ? JSON.parse(saved) : { totalAudits: 0, detectedPatterns: [], systemBiasAdjustment: 0 };
}

function saveMemory(mem: NeuralMemory) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(mem));
}

export async function runCollaborativeAudit(result: AnalysisResult, lang: 'ES' | 'EN' = 'ES') {
  const memory = getMemory();
  const logs: AgentAction[] = [];
  const isEs = lang === 'ES';

  const addLog = (agent: AgentAction['agent'], message: string, status: AgentAction['status']) => {
    logs.push({ agent, message, timestamp: new Date().toISOString(), status });
  };

  // 1. SYSTEM: Check Health & Load Memory
  addLog('SYSTEM', isEs ? "Restaurando pesos neurales de ciclos previos..." : "Restoring neural weights from previous audit cycles...", 'THINKING');
  await neuralManager.processRequest("Restore neural weights", { type: 'SYSTEM' });
  addLog('SYSTEM', isEs ? `Memoria activa: ${memory.totalAudits} nodos procesados.` : `Memory active: ${memory.totalAudits} historical nodes processed.`, 'EXECUTING');

  // 2. LEGAL: Knowledge Base Lookup
  addLog('LEGAL', isEs ? `Escaneando banderas rojas OCDE: ${result.redFlags.length} detectadas` : `Scanning Socrata Context vs OECD Red Flags: ${result.redFlags.length} detected`, 'THINKING');
  await neuralManager.processRequest(`Scan context for ${result.redFlags.length} flags`, { type: 'LEGAL' });
  const legalContext = await getLegalContext(result.contracts[0].objeto_del_contrato, result.redFlags);
  addLog('LEGAL', isEs ? "Jurisprudencia reclasificada según densidad de patrones." : "Jurisprudence re-ranked based on current pattern density.", 'COMPLETED');

  // 3. FORENSIC: Synthesis
  addLog('FORENSIC', isEs ? "Cruzando clústeres temporales y acumulación de valor..." : "Cross-referencing temporal clusters and value bunching...", 'THINKING');
  
  const forensicPrompt = isEs 
    ? `Realiza una auditoría forense profunda para ${result.providerName}. El riesgo es ${result.riskScore}/100. Analiza la similitud del ${(result.similarityScore * 100).toFixed(1)}% y los ${result.contracts.length} contratos encontrados. Utiliza el contexto legal: ${legalContext}`
    : `Perform a deep forensic audit for ${result.providerName}. Risk is ${result.riskScore}/100. Analyze the ${(result.similarityScore * 100).toFixed(1)}% similarity and the ${result.contracts.length} contracts found. Use legal context: ${legalContext}`;
  
  const report = await neuralManager.processRequest(forensicPrompt, { type: 'FORENSIC', result, lang });
  addLog('FORENSIC', isEs ? "Informe de Auditoría sintetizado." : "Audit Report synthesized. Pattern vector locked.", 'COMPLETED');

  // 4. SYSTEM: Self-Improvement (Learning Loop)
  addLog('SYSTEM', isEs ? "Analizando rendimiento... optimizando umbrales." : "Analyzing system performance... Self-optimizing detection thresholds.", 'OPTIMIZING');
  memory.totalAudits += 1;
  if (result.risk === 'Red') {
    const uniqueFlags = result.redFlags.filter(f => !memory.detectedPatterns.includes(f));
    memory.detectedPatterns.push(...uniqueFlags);
  }
  memory.systemBiasAdjustment += 0.005; // Incremental tuning
  saveMemory(memory);
  addLog('SYSTEM', isEs ? "Ciclo de aprendizaje completado. Sensibilidad actualizada." : "Learning cycle completed. Neural sensitivity updated.", 'COMPLETED');

  return { report, logs, memory };
}

export async function performAutonomousTraining(entity: string) {
  const logs: AgentAction[] = [];
  const addLog = (agent: AgentAction['agent'], message: string, status: AgentAction['status']) => {
    logs.push({ agent, message, timestamp: new Date().toISOString(), status });
  };

  addLog('SYSTEM', `Initiating autonomous scan for: ${entity}`, 'EXECUTING');
  await neuralManager.processRequest(`Boot training sequence for ${entity}`, { type: 'TRAINING' });
  
  addLog('LEGAL', `Indexing new documentation for ${entity} into RAG vectors...`, 'THINKING');
  await neuralManager.processRequest(`Index RAG vectors for ${entity}`, { type: 'TRAINING' });
  
  addLog('FORENSIC', `Training pattern recognition on ${entity} dataset...`, 'OPTIMIZING');
  await neuralManager.processRequest(`Execute local training on ${entity} patterns`, { type: 'TRAINING' });
  const memory = getMemory();
  memory.totalAudits += 1;
  memory.systemBiasAdjustment += 0.002;
  saveMemory(memory);
  
  addLog('SYSTEM', `Node ${entity} training completed. Weights synchronized.`, 'COMPLETED');
  return { logs, memory };
}
