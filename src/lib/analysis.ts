import { Contract } from "./secop";
import { getEmbedding, cosineSimilarity, ai } from "./gemini";
import { differenceInDays } from "date-fns";

export interface AnalysisResult {
  groupKey: string;
  providerName: string;
  contracts: Contract[];
  totalValue: number;
  similarityScore: number;
  maxDayDiff: number;
  risk: "Red" | "Orange" | "Green";
  quickObservation?: string;
  redFlags: string[];
  riskScore: number; // 0-100
  loadType?: 'FULL' | 'REFERENCE';
}

export interface AnalysisConfig {
  similarityThreshold: number;
  dayWindow: number;
  valueThreshold: number;
}

const DEFAULT_CONFIG: AnalysisConfig = {
  similarityThreshold: 0.85,
  dayWindow: 90,
  valueThreshold: 50000000
};

export async function analyzeContractGroup(
  groupKey: string, 
  contracts: Contract[], 
  config: AnalysisConfig = DEFAULT_CONFIG
): Promise<AnalysisResult> {
  const providerName = contracts[0].nombre_del_contratista;
  
  // Clean values: remove any non-numeric chars except decimal point
  const cleanValue = (val: string) => {
    if (!val) return 0;
    const cleaned = val.replace(/[^0-9.]/g, '');
    return parseFloat(cleaned) || 0;
  };

  const totalValue = contracts.reduce((acc, c) => acc + cleanValue(c.valor_del_contrato), 0);
  
  // 1. Temporal Window Analysis
  let maxDiff = 0;
  if (contracts.length > 1) {
    const dates = contracts
      .map(c => new Date(c.fecha_de_firma))
      .filter(d => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    
    if (dates.length > 1) {
      maxDiff = Math.abs(differenceInDays(dates[dates.length - 1], dates[0]));
    }
  }

  // 2. Semantic Similarity Matrix
  // We use the embedding cache from gemini.ts implicitly here
  const embeddings = await Promise.all(contracts.map(c => getEmbedding(c.objeto_del_contrato)));
  let totalSim = 0;
  let pairs = 0;
  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      if (embeddings[i] && embeddings[j]) {
        totalSim += cosineSimilarity(embeddings[i]!, embeddings[j]!);
        pairs++;
      }
    }
  }
  const avgSim = pairs > 0 ? totalSim / pairs : 0;

  // 3. OECD RED FLAGS CALCULATION (Extreme Forensic Mode)
  const redFlags: string[] = [];
  let riskScore = 0;

  // FLAG 1: High Semantic Duplication (Identity of Object)
  if (avgSim > config.similarityThreshold) {
    redFlags.push("Identidad de Objeto: Duplicidad Semántica Extrema (>85%)");
    riskScore += 50;
  } else if (avgSim > 0.7) {
    redFlags.push("Similitud de Objeto Sospechosa (>70%)");
    riskScore += 25;
  }

  // FLAG 2: Temporal Tightness (Proximity)
  const avgDaysBetween = contracts.length > 1 ? maxDiff / (contracts.length - 1) : 0;
  if (maxDiff < config.dayWindow && contracts.length >= 3) {
    redFlags.push(`Agolpamiento Temporal: ${contracts.length} contratos en ${maxDiff} días`);
    riskScore += 35;
  } else if (avgDaysBetween < 15 && contracts.length > 2) {
    redFlags.push("Frecuencia de Contratación Anómala (<15 días prom)");
    riskScore += 20;
  }

  // FLAG 3: Value Standardization (Bunching)
  const values = contracts.map(c => cleanValue(c.valor_del_contrato));
  const avgValResult = totalValue / contracts.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - avgValResult, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const coeffVar = avgValResult > 0 ? stdDev / avgValResult : 0;

  if (coeffVar < 0.05 && contracts.length > 3) { // Extremely low variance
    redFlags.push("Patrón de Bunching Crítico: Estandarización de cuantías (<5% var)");
    riskScore += 35;
  } else if (coeffVar < 0.15 && contracts.length > 2) { 
    redFlags.push("Estandarización de Cuantías Sospechosa");
    riskScore += 15;
  }

  // FLAG 4: Volume & Concentration
  if (totalValue > config.valueThreshold * 10) {
    redFlags.push("Concentración Económica Extrema (>10x Threshold)");
    riskScore += 30;
  } else if (totalValue > config.valueThreshold * 5) {
    redFlags.push("Concentración Económica Crítica (>5x Threshold)");
    riskScore += 20;
  } else if (totalValue > config.valueThreshold) {
    riskScore += 10;
  }

  // FLAG 5: Modality Risk (Abuse of non-competitive processes)
  const nonCompetitive = contracts.filter(c => {
    const mod = c.modalidad_de_contratacion?.toUpperCase() || "";
    return mod.includes('DIRECTA') || 
           mod.includes('MINIMA') || 
           mod.includes('PRESTACION DE SERVICIOS') ||
           mod.includes('CONTRATACION DIRECTA');
  }).length;
  
  if (nonCompetitive / contracts.length > 0.8 && contracts.length >= 2) {
    redFlags.push("Abuso de Modalidades No Competitivas (>80% Directa/Mínima/PS)");
    riskScore += 30;
  } else if (nonCompetitive / contracts.length > 0.5) {
    redFlags.push("Alta Dependencia de Contratación Directa");
    riskScore += 15;
  }

  // Final Risk Classification (Capped at 100)
  riskScore = Math.min(100, riskScore);
  
  let risk: "Red" | "Orange" | "Green" = "Green";
  if (riskScore >= 75) risk = "Red";
  else if (riskScore >= 45) risk = "Orange";

  let quickObservation = "";
  if (risk !== "Green") {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Actúa como Analista de Integridad de la OCDE. Genera una instrucción de riesgo de UNA SOLA ORACIÓN técnica y contundente para este hallazgo: ${contracts.length} contratos, riesgo ${riskScore}/100, flags [${redFlags.join(', ')}]. No menciones nombres propios.`,
        config: { temperature: 0.1 }
      });
      quickObservation = response.text.trim().replace(/^"|"$/g, '');
    } catch (e) {
      quickObservation = "Alerta de fraccionamiento: Patrón de contratación fragmentada detectado sistemáticamente con elusión de competencia.";
    }
  }

  return {
    groupKey,
    providerName,
    contracts,
    totalValue,
    similarityScore: avgSim,
    maxDayDiff: maxDiff,
    risk,
    quickObservation,
    redFlags,
    riskScore
  };
}
