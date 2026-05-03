import { differenceInDays } from "date-fns";
import { generateQuickObservation, getEmbedding } from "./gemini";
import { runIntelligenceAudit } from "./intelligence";
import { Contract } from "./secop";
import { cosineSimilarity } from "./vector";

export interface DetailedFinding {
  contractId: string;
  reasons: string[];
  evidence: string;
  contract: Contract;
}

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
  detailedFindings: DetailedFinding[];
  riskScore: number;
  loadType?: "FULL" | "REFERENCE";
}

export interface AnalysisConfig {
  similarityThreshold: number;
  dayWindow: number;
  valueThreshold: number;
}

const DEFAULT_CONFIG: AnalysisConfig = {
  similarityThreshold: 0.85,
  dayWindow: 90,
  valueThreshold: 50000000,
};

function cleanValue(val: string) {
  if (!val) return 0;
  const cleaned = val.replace(/[^0-9.]/g, "");
  return parseFloat(cleaned) || 0;
}

export async function analyzeContractGroup(
  groupKey: string,
  contracts: Contract[],
  config: AnalysisConfig = DEFAULT_CONFIG
): Promise<AnalysisResult> {
  const providerName = contracts[0].nombre_del_contratista;
  const totalValue = contracts.reduce((acc, contract) => acc + cleanValue(contract.valor_del_contrato), 0);

  let maxDiff = 0;
  if (contracts.length > 1) {
    const dates = contracts
      .map((contract) => new Date(contract.fecha_de_firma))
      .filter((date) => !isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length > 1) {
      maxDiff = Math.abs(differenceInDays(dates[dates.length - 1], dates[0]));
    }
  }

  const embeddings = await Promise.all(contracts.map((contract) => getEmbedding(contract.objeto_del_contrato)));
  let totalSimilarity = 0;
  let pairs = 0;

  for (let i = 0; i < embeddings.length; i++) {
    for (let j = i + 1; j < embeddings.length; j++) {
      if (embeddings[i] && embeddings[j]) {
        totalSimilarity += cosineSimilarity(embeddings[i], embeddings[j]);
        pairs++;
      }
    }
  }

  const avgSim = pairs > 0 ? totalSimilarity / pairs : 0;
  const intelAudit = runIntelligenceAudit(contracts);

  const redFlags: string[] = [...intelAudit.flags];
  let riskScore = 0;

  if (avgSim > config.similarityThreshold) {
    redFlags.push("Identidad de objeto: duplicidad semántica extrema (>85%)");
    riskScore += 50;
  } else if (avgSim > 0.7) {
    redFlags.push("Similitud de objeto sospechosa (>70%)");
    riskScore += 25;
  }

  const avgDaysBetween = contracts.length > 1 ? maxDiff / (contracts.length - 1) : 0;
  if (maxDiff < config.dayWindow && contracts.length >= 3) {
    redFlags.push(`Aglomeración temporal: ${contracts.length} contratos en ${maxDiff} días`);
    riskScore += 35;
  } else if (avgDaysBetween < 15 && contracts.length > 2) {
    redFlags.push("Frecuencia de contratación anómala (<15 días promedio)");
    riskScore += 20;
  }

  const values = contracts.map((contract) => cleanValue(contract.valor_del_contrato));
  const averageValue = totalValue / contracts.length;
  const variance = values.reduce((acc, value) => acc + Math.pow(value - averageValue, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  const coeffVar = averageValue > 0 ? stdDev / averageValue : 0;

  if (coeffVar < 0.05 && contracts.length > 3) {
    redFlags.push("Patrón de bunching crítico: estandarización de cuantías (<5% var)");
    riskScore += 35;
  } else if (coeffVar < 0.15 && contracts.length > 2) {
    redFlags.push("Estandarización de cuantías sospechosa");
    riskScore += 15;
  }

  if (totalValue > config.valueThreshold * 10) {
    redFlags.push("Concentración económica extrema (>10x threshold)");
    riskScore += 30;
  } else if (totalValue > config.valueThreshold * 5) {
    redFlags.push("Concentración económica crítica (>5x threshold)");
    riskScore += 20;
  } else if (totalValue > config.valueThreshold) {
    riskScore += 10;
  }

  const nonCompetitive = contracts.filter((contract) => {
    const modality = contract.modalidad_de_contratacion?.toUpperCase() || "";
    return (
      modality.includes("DIRECTA") ||
      modality.includes("MINIMA") ||
      modality.includes("PRESTACION DE SERVICIOS") ||
      modality.includes("CONTRATACION DIRECTA")
    );
  }).length;

  if (nonCompetitive / contracts.length > 0.8 && contracts.length >= 2) {
    redFlags.push("Abuso de modalidades no competitivas (>80% directa/mínima/PS)");
    riskScore += 30;
  } else if (nonCompetitive / contracts.length > 0.5) {
    redFlags.push("Alta dependencia de contratación directa");
    riskScore += 15;
  }

  riskScore += intelAudit.riskScore * 0.5;
  riskScore = Math.min(100, riskScore);

  const detailedFindings: DetailedFinding[] = contracts.map((contract, index) => {
    const individualReasons: string[] = [];
    const value = cleanValue(contract.valor_del_contrato);
    const modality = contract.modalidad_de_contratacion?.toUpperCase() || "";

    if (value > config.valueThreshold) individualReasons.push("Cuantía individual significativa");
    if (modality.includes("DIRECTA") || modality.includes("MINIMA")) {
      individualReasons.push(`Modalidad de riesgo: ${contract.modalidad_de_contratacion}`);
    }

    for (let j = 0; j < embeddings.length; j++) {
      if (index !== j && embeddings[index] && embeddings[j]) {
        const similarity = cosineSimilarity(embeddings[index], embeddings[j]);
        if (similarity > config.similarityThreshold) {
          individualReasons.push(`Identidad semántica con contrato ${contracts[j].id_contrato} (${(similarity * 100).toFixed(1)}%)`);
        }
      }
    }

    return {
      contractId: contract.id_contrato || String(index),
      reasons: individualReasons,
      evidence: `Objeto: ${contract.objeto_del_contrato.substring(0, 100)}... | Valor: ${contract.valor_del_contrato} | Fecha: ${contract.fecha_de_firma}`,
      contract,
    };
  });

  let risk: "Red" | "Orange" | "Green" = "Green";
  if (riskScore >= 75) risk = "Red";
  else if (riskScore >= 45) risk = "Orange";

  let quickObservation = "";
  if (risk !== "Green") {
    quickObservation = await generateQuickObservation(
      `${contracts.length} contratos, riesgo ${riskScore}/100, flags [${redFlags.join(", ")}].`,
      "ES"
    );
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
    detailedFindings,
    riskScore,
  };
}
