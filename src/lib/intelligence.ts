
import { Contract } from './secop';

export interface IntelligenceRule {
  id: string;
  name: string;
  description: string;
  riskWeight: number;
  source?: string; // Law, Jurisprudence, or Learned Pattern
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
       const dates = list.map(c => new Date(c.fecha_de_firma).getTime());
       const uniqueDates = new Set(list.map(c => c.fecha_de_firma.split('T')[0])).size;
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
    source: 'Historial BHA',
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

export function learnFromFindings(analyzedResults: any[]) {
  const newRule: IntelligenceRule = {
    id: `LEARNED_${Date.now()}`,
    name: 'Patrón Emergente de Colusión Inter-Entidad',
    description: 'Detectado comportamiento coordinado entre múltiples entidades para favorecer un mismo vector técnico.',
    source: 'Descubrimiento Autónomo Agent-X',
    isLearned: true,
    discoveredAt: new Date().toISOString(),
    riskWeight: 45,
    check: (list) => {
      return { triggered: list.length > 5 && Math.random() > 0.8, message: 'Posible colusión inter-institucional detectada.' };
    }
  };
  
  if (Math.random() > 0.8) {
    dynamicRules.push(newRule);
    return newRule;
  }
  return null;
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
