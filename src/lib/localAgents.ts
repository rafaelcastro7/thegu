import type { AnalysisResult, DetailedFinding } from "./analysis";
import type { Language } from "./i18n";
import type { AuditChatMessage } from "./gemini";
import { generateAdaptiveAuditQA, generateForensicReport } from "./gemini";

export interface LocalAgentLog {
  agent: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "SKIPPED" | "ERROR";
  message: string;
  timestamp: string;
}

interface PrimeAuditOptions {
  result: AnalysisResult;
  lang: Language;
  history?: AuditChatMessage[];
  onLog?: (entry: LocalAgentLog) => void;
}

function makeLog(agent: LocalAgentLog["agent"], status: LocalAgentLog["status"], message: string): LocalAgentLog {
  return {
    agent,
    status,
    message,
    timestamp: new Date().toISOString(),
  };
}

async function warmLegalContext(result: AnalysisResult) {
  const query = [
    result.providerName,
    result.redFlags.join(" "),
    result.contracts.slice(0, 3).map((contract) => contract.objeto_del_contrato).join(" "),
  ]
    .filter(Boolean)
    .join(" | ");

  await fetch("/api/rag/legal-context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      redFlags: result.redFlags,
    }),
  });
}

async function warmInteractivePaths(result: AnalysisResult, lang: Language, history: AuditChatMessage[]) {
  const priorityFindings = result.detailedFindings
    .filter((finding) => finding.reasons.length > 0 || result.riskScore >= 80)
    .slice(0, 4);

  await Promise.all(
    priorityFindings.map((finding) => generateAdaptiveAuditQA(result, finding, history, lang))
  );
}

async function warmNarrativeReport(result: AnalysisResult, lang: Language) {
  if (result.risk !== "Red") return;
  await generateForensicReport(result, lang);
}

export async function primeAuditExperience({
  result,
  lang,
  history = [],
  onLog,
}: PrimeAuditOptions) {
  const emit = (entry: LocalAgentLog) => onLog?.(entry);

  emit(makeLog("OPTIMIZER", "RUNNING", "Preheating legal context cache."));
  try {
    await warmLegalContext(result);
    emit(makeLog("OPTIMIZER", "COMPLETED", "Legal context cache is ready."));
  } catch (error) {
    console.error(error);
    emit(makeLog("OPTIMIZER", "ERROR", "Legal context cache could not be refreshed."));
  }

  emit(makeLog("INTERACTIVE", "RUNNING", "Precomputing likely audit questions."));
  try {
    await warmInteractivePaths(result, lang, history);
    emit(makeLog("INTERACTIVE", "COMPLETED", "Suggested audit questions were refreshed."));
  } catch (error) {
    console.error(error);
    emit(makeLog("INTERACTIVE", "ERROR", "Interactive suggestions are using fallback mode."));
  }

  emit(makeLog("REPORTING", "RUNNING", "Refreshing the narrative report cache."));
  try {
    await warmNarrativeReport(result, lang);
    emit(makeLog("REPORTING", "COMPLETED", "Narrative report cache refreshed."));
  } catch (error) {
    console.error(error);
    emit(makeLog("REPORTING", "ERROR", "Narrative report cache is not available yet."));
  }
}

export function buildNextQuestionSeed(
  result: AnalysisResult,
  finding: DetailedFinding,
  history: AuditChatMessage[],
  lang: Language
) {
  const lastAssistant = [...history].reverse().find((item) => item.role === "ai")?.content || "";
  const lastUser = [...history].reverse().find((item) => item.role === "user")?.content || "";
  const isEs = lang === "ES";

  if (!history.length) {
    return isEs
      ? `Prioriza sustento SECOP, comparables del proveedor, modalidad y documentacion faltante para ${finding.contractId}.`
      : `Prioritize SECOP evidence, supplier comparables, modality, and missing documentation for ${finding.contractId}.`;
  }

  return isEs
    ? `Readapta las siguientes preguntas usando el contexto ya respondido. Ultima pregunta: ${lastUser}. Ultima respuesta: ${lastAssistant}. Cluster: ${result.providerName}.`
    : `Readapt the next questions using the answered context. Last question: ${lastUser}. Last answer: ${lastAssistant}. Cluster: ${result.providerName}.`;
}
