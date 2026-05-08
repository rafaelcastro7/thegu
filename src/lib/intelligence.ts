
import { Contract } from './secop';

export interface IntelligenceRule {
  id: string;
  name: string;
  description: string;
  riskWeight: number;
  source?: string; // Law, Jurisprudence, or Learned Pattern
  memoryPatterns?: string[];
  isLearned?: boolean;
  discoveredAt?: string;
  check: (contracts: Contract[]) => { triggered: boolean; message: string; evidence?: string };
}

/**
 * Notorious Entities & Providers (Historically high risk)
 */
export const NOTORIOUS_ENTITIES = [
  "UNGRD", 
  "UNIDAD NACIONAL PARA LA GESTIÓN DEL RIESGO DE DESASTRES",
  "GOBERNACION DE LA GUAJIRA",
  "GOBERNACION DEL CHOCO",
  "GOBERNACION DE CORDOBA",
  "ALCALDIA DE RIOHACHA",
  "CARDIQUE",
  "CORPOCESAR",
  "FONDO ADAPTACION",
  "INVÍAS"
];

/**
 * Jurisprudencia & Legal Framework (The "Inspiration")
 */
export const LEGAL_FRAMEWORK = [
  { id: 'L1', title: 'Ley 80 de 1993', category: 'General', summary: 'Estatuto General de Contratación de la Administración Pública. Prohíbe el fraccionamiento de contratos para evadir licitación.' },
  { id: 'L2', title: 'Ley 1474 de 2011', category: 'Anticorrupción', summary: 'Estatuto Anticorrupción. Establece sanciones para la colusión y el favorecimiento ilícito.' },
  { id: 'L3', title: 'Circular Externa 17 CCE', category: 'Regulatoria', summary: 'Directrices de Colombia Compra Eficiente sobre la planificación y agregación de demanda.' },
  { id: 'L4', title: 'Sentencia C-300/12', category: 'Jurisprudencia', summary: 'Corte Constitucional sobre la transparencia y el principio de planeación en la contratación.' },
  { id: 'L5', title: 'Ley 1150 de 2007', category: 'Eficiencia', summary: 'Introduce medidas para la eficiencia y transparencia en la Ley 80.' }
];

export const INITIAL_RULES: IntelligenceRule[] = [
  {
    id: 'RULE_DIRECT_ABUSE',
    name: 'Abuso de Contratación Directa',
    description: 'Detección de uso excesivo de contratación directa para servicios que requieren licitación.',
    source: 'Ley 80 de 1993',
    riskWeight: 40,
    check: (list) => {
      const direct = list.filter(c => c.modalidad_de_contratacion.toUpperCase().includes('DIRECTA'));
      const ratio = direct.length / list.length;
      return {
        triggered: ratio > 0.8 && list.length > 3,
        message: `Patrón de contratación directa detectado (${(ratio * 100).toFixed(0)}%).`,
        evidence: `El proveedor tiene ${direct.length} de ${list.length} contratos bajo modalidad directa.`
      };
    }
  },
  {
    id: 'RULE_TIME_SQUEEZE',
    name: 'Ventana de Ejecución Sospechosa',
    description: 'Múltiples contratos firmados el mismo día o en menos de 48 horas.',
    source: 'Circular 17 CCE',
    riskWeight: 35,
    check: (list) => {
       const uniqueDates = new Set(list.map(c => (c.fecha_de_firma || '').split('T')[0]).filter(Boolean)).size;
       const spread = list.length - uniqueDates;
       return {
         triggered: spread >= 2,
         message: 'Sincronía temporal detectada: Múltiples firmas en fechas idénticas.',
         evidence: `${spread} contratos fueron firmados en fechas solapadas.`
       };
    }
  },
  {
    id: 'RULE_NOTORIOUS_ENTITY',
    name: 'Entidad de Alto Riesgo',
    description: 'La entidad contratante tiene historial de opacidad técnica.',
    source: 'Historial institucional',
    riskWeight: 20,
    check: (list) => {
      const entity = list[0]?.nombre_entidad?.toUpperCase() || "";
      const isNotorious = NOTORIOUS_ENTITIES.some(n => entity.includes(n));
      return {
        triggered: isNotorious,
        message: `Entidad bajo vigilancia especial: ${entity}`,
        evidence: 'Historial de auditorías previos con hallazgos de integridad.'
      };
    }
  },
  {
    id: 'RULE_VALUE_SPIKE',
    name: 'Incremento Volumétrico Atípico',
    description: 'El valor total supera el promedio de contratos similares en la región.',
    source: 'Análisis Estadístico',
    riskWeight: 25,
    check: (list) => {
      const values = list.map(c => parseFloat(c.valor_del_contrato) || 0);
      const total = values.reduce((a, b) => a + b, 0);
      return {
        triggered: total > 5000000000, // > 5 Billion COP
        message: 'Concentración de valor en riesgo crítico.',
        evidence: `Valor total acumulado: $${total.toLocaleString()} COP.`
      };
    }
  }
];

// Memory for learned patterns
let dynamicRules: IntelligenceRule[] = [];

export function getActiveRules() {
  return [...INITIAL_RULES, ...dynamicRules];
}

function cleanValue(raw: string) {
  const numeric = Number.parseFloat(String(raw || '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
}

function getDirectRatio(contracts: Contract[]) {
  const directCount = contracts.filter(contract => {
    const modality = contract.modalidad_de_contratacion?.toUpperCase() || '';
    return (
      modality.includes('DIRECTA') ||
      modality.includes('MINIMA') ||
      modality.includes('PRESTACION DE SERVICIOS') ||
      modality.includes('CONTRATACION DIRECTA')
    );
  }).length;

  return contracts.length > 0 ? directCount / contracts.length : 0;
}

function getSameDaySpread(contracts: Contract[]) {
  const normalizedDays = contracts.map(contract => (contract.fecha_de_firma || '').split('T')[0]).filter(Boolean);
  return contracts.length - new Set(normalizedDays).size;
}

function getValueCoefficient(contracts: Contract[]) {
  if (contracts.length === 0) return 1;
  const values = contracts.map(contract => cleanValue(contract.valor_del_contrato));
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (!average) return 1;
  const variance = values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / values.length;
  return Math.sqrt(variance) / average;
}

function getObjectFamilyScore(contracts: Contract[]) {
  if (contracts.length < 2) return 0;

  const tokenSets = contracts.map(contract => {
    const normalized = (contract.objeto_del_contrato || '')
      .toUpperCase()
      .replace(/[^A-Z0-9ÁÉÍÓÚÑ ]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length >= 5);
    return new Set(normalized);
  });

  const anchor = Array.from(tokenSets[0]);
  if (anchor.length === 0) return 0;

  const overlaps = tokenSets.slice(1).map(set => {
    const shared = anchor.filter(token => set.has(token)).length;
    return shared / anchor.length;
  });

  return overlaps.reduce((sum, value) => sum + value, 0) / overlaps.length;
}

function buildLearnedRule(kind: 'DIRECT_TIME_STACK' | 'VALUE_LADDER' | 'OBJECT_FAMILY') {
  const discoveredAt = new Date().toISOString();

  if (kind === 'DIRECT_TIME_STACK') {
    return {
      id: 'LEARNED_DIRECT_TIME_STACK',
      name: 'Patrón Aprendido: Bloque Directo Sincronizado',
      description: 'Aprende cuando un proveedor concentra contratación directa y firmas superpuestas en ventanas cortas.',
      source: 'Autoaprendizaje del sistema',
      memoryPatterns: ['contratación directa detectado', 'Sincronía temporal detectada'],
      isLearned: true,
      discoveredAt,
      riskWeight: 30,
      check: (contracts: Contract[]) => ({
        triggered: contracts.length >= 3 && getDirectRatio(contracts) >= 0.75 && getSameDaySpread(contracts) >= 2,
        message: 'Patrón aprendido: bloque de contratación directa sincronizado.',
        evidence: 'Alta dependencia de contratación directa con firmas concentradas en fechas repetidas.',
      }),
    } satisfies IntelligenceRule;
  }

  if (kind === 'VALUE_LADDER') {
    return {
      id: 'LEARNED_VALUE_LADDER',
      name: 'Patrón Aprendido: Escalera de Cuantías',
      description: 'Aprende secuencias donde múltiples contratos mantienen montos casi idénticos para conservar una ruta de baja competencia.',
      source: 'Autoaprendizaje del sistema',
      memoryPatterns: ['Estandarización de cuantías sospechosa', 'Patrón de bunching crítico'],
      isLearned: true,
      discoveredAt,
      riskWeight: 28,
      check: (contracts: Contract[]) => ({
        triggered: contracts.length >= 4 && getValueCoefficient(contracts) <= 0.12,
        message: 'Patrón aprendido: escalera de cuantías con baja variación.',
        evidence: 'Los valores del clúster permanecen en una banda estrecha que sugiere fragmentación deliberada.',
      }),
    } satisfies IntelligenceRule;
  }

  return {
    id: 'LEARNED_OBJECT_FAMILY',
    name: 'Patrón Aprendido: Familia de Objetos Repetidos',
    description: 'Aprende recurrencias de objetos contractuales con vocabulario técnico altamente compartido.',
    source: 'Autoaprendizaje del sistema',
    memoryPatterns: ['Similitud de objeto sospechosa', 'Identidad de objeto'],
    isLearned: true,
    discoveredAt,
    riskWeight: 26,
    check: (contracts: Contract[]) => ({
      triggered: contracts.length >= 4 && getObjectFamilyScore(contracts) >= 0.35,
      message: 'Patrón aprendido: familia de objetos contractuales repetidos.',
      evidence: 'Los contratos comparten una base léxica y técnica consistente entre sí.',
    }),
  } satisfies IntelligenceRule;
}

export function learnFromFindings(analyzedResults: Array<{ contracts: Contract[]; maxDayDiff?: number }>) {
  if (!Array.isArray(analyzedResults) || analyzedResults.length === 0) return null;

  const candidateMatrix = [
    {
      kind: 'DIRECT_TIME_STACK' as const,
      hits: analyzedResults.filter(result => {
        return result.contracts.length >= 3 && getDirectRatio(result.contracts) >= 0.75 && getSameDaySpread(result.contracts) >= 2 && (result.maxDayDiff ?? 999) <= 60;
      }).length,
    },
    {
      kind: 'VALUE_LADDER' as const,
      hits: analyzedResults.filter(result => {
        return result.contracts.length >= 4 && getValueCoefficient(result.contracts) <= 0.12;
      }).length,
    },
    {
      kind: 'OBJECT_FAMILY' as const,
      hits: analyzedResults.filter(result => {
        return result.contracts.length >= 4 && getObjectFamilyScore(result.contracts) >= 0.35;
      }).length,
    },
  ].sort((a, b) => b.hits - a.hits);

  const winner = candidateMatrix[0];
  if (!winner || winner.hits < 2) return null;

  const existing = dynamicRules.find(rule => rule.id === `LEARNED_${winner.kind}`);
  if (existing) return existing;

  const learnedRule = buildLearnedRule(winner.kind);
  dynamicRules.push(learnedRule);
  return learnedRule;
}

export function runIntelligenceAudit(contracts: Contract[]) {
  const findings = getActiveRules()
    .map(rule => ({ rule, ...rule.check(contracts) }))
    .filter(f => f.triggered);

  const totalRiskScore = findings.reduce((sum, f) => sum + f.rule.riskWeight, 0);
  
  return {
    riskScore: Math.min(100, totalRiskScore),
    flags: findings.map(f => f.message),
    detailedEvidence: findings.map(f => f.evidence).filter(Boolean) as string[],
    triggeredRuleIds: findings.map(f => f.rule.id)
  };
}
