import type { AnalysisResult, DetailedFinding } from "./analysis";

const GENERATE_MODELS = ["tinyllama:latest", "gemma4-fast:latest", "qwen3:4b"];
const EMBED_MODEL = "nomic-embed-text";
const NO_THINK_PREFIX = "/no_think\n";

interface OllamaGenerateResponse {
  response?: string;
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

export interface SuggestedAuditQA {
  question: string;
  answer: string;
}

export interface AuditChatMessage {
  role: "user" | "ai";
  content: string;
}

const embeddingCache = new Map<string, number[]>();
const suggestedQACache = new Map<string, SuggestedAuditQA[]>();

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      const waitTime = delay + Math.random() * 2000;
      console.warn(`[GOBIA] Error with local model. Retrying in ${Math.round(waitTime)}ms. Attempts left: ${retries}`);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return withRetry(fn, retries - 1, delay * 2);
    }

    throw error;
  }
}

async function callLocalModel<T>(endpoint: string, payload: unknown): Promise<T> {
  const response = await fetch(`/api/ollama/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Local model request failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<T>;
}

async function generateText(prompt: string, numPredict = 400): Promise<string> {
  let lastError: unknown = null;

  for (const model of GENERATE_MODELS) {
    try {
      const response = await withRetry(() =>
        callLocalModel<OllamaGenerateResponse>("generate", {
          model,
          prompt: `${NO_THINK_PREFIX}${prompt}`,
          stream: false,
          options: {
            num_predict: numPredict,
            temperature: 0.2,
          },
        })
      );

      const text = response.response?.trim() || "";
      if (text) return text;

      console.warn(`[GOBIA] Local model ${model} returned an empty response. Trying next model.`);
    } catch (error) {
      lastError = error;
      console.warn(`[GOBIA] Local model ${model} failed. Trying next model.`, error);
    }
  }

  if (lastError) throw lastError;
  return "";
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (embeddingCache.has(text)) return embeddingCache.get(text)!;

  try {
    const result = await withRetry(() =>
      callLocalModel<OllamaEmbeddingResponse>("embeddings", {
        model: EMBED_MODEL,
        prompt: text,
      })
    );

    const embedding = result.embedding;
    embeddingCache.set(text, embedding);
    return embedding;
  } catch (error) {
    console.error("Embedding Error:", error);
    return new Array(768).fill(0);
  }
}

export async function generateForensicReport(results: AnalysisResult[] | AnalysisResult, lang: "ES" | "EN"): Promise<string> {
  const isEs = lang === "ES";
  const resultsArray = Array.isArray(results) ? results : [results];
  const prompt = `
    Eres un Auditor Forense Digital de GobIA Auditor.
    Analiza el siguiente resumen de clusters de contratación sospechosos en SECOP II.

    DATA:
    ${JSON.stringify(resultsArray.map((result) => ({
      provider: result.providerName,
      total_value: result.totalValue,
      similarity: result.similarityScore,
      risk: result.risk,
      red_flags: result.redFlags,
    })), null, 2)}

    INSTRUCTIONS:
    1. Genera un INFORME DE AUDITORÍA FORENSE DE ALTO IMPACTO.
    2. Usa una estructura jerárquica clara:
       - RESUMEN EJECUTIVO PARA ALTA GERENCIA.
       - MATRIZ DE RIESGOS.
       - EVIDENCIA TÉCNICA DETALLADA.
       - FUNDAMENTOS JURÍDICOS.
       - RECOMENDACIONES DE MITIGACIÓN.
    3. Enfócate en el riesgo de fraccionamiento contractual y posible colusión.
    4. Señala contratos puente o nodos relevantes del cluster.
    5. Usa Markdown con tono técnico y sobrio.
    6. Idioma: ${isEs ? "Español" : "English"}.
  `;

  try {
    const response = await generateText(prompt, 240);
    return response || buildDeterministicForensicReport(resultsArray, lang);
  } catch (error) {
    console.error("Report Generation Error:", error);
    return buildDeterministicForensicReport(resultsArray, lang);
  }
}

function buildDeterministicForensicReport(results: AnalysisResult[], lang: "ES" | "EN") {
  const isEs = lang === "ES";
  const totalExposure = results.reduce((sum, result) => sum + result.totalValue, 0);
  const highRisk = results.filter((result) => result.risk === "Red");
  const flags = Array.from(new Set(results.flatMap((result) => result.redFlags))).slice(0, 8);

  if (!isEs) {
    return `
# Forensic Audit Report

## Executive Summary
The local audit engine analyzed ${results.length} procurement cluster(s), with an estimated fiscal exposure of **$${totalExposure.toLocaleString()}**. ${highRisk.length} cluster(s) were classified as high risk.

## Risk Matrix
${results.map((result) => `- **${result.providerName}**: ${result.risk} risk, ${result.riskScore.toFixed(1)}/100, ${(result.similarityScore * 100).toFixed(1)}% semantic similarity.`).join("\n")}

## Technical Evidence
${flags.map((flag) => `- ${flag}`).join("\n") || "- No active red flags were detected."}

## Legal Basis
Potential split-contracting indicators should be reviewed against Colombian procurement planning, transparency and competition principles.

## Recommendations
Prioritize human review of high-risk clusters, compare budget certificates and prior studies, and verify whether similar objects should have been consolidated into a single competitive process.
    `.trim();
  }

  return `
# Informe de Auditoría Forense

## Resumen Ejecutivo
El motor local analizó ${results.length} clúster(es) de contratación, con una exposición fiscal estimada de **$${totalExposure.toLocaleString()}**. ${highRisk.length} clúster(es) fueron clasificados como alto riesgo.

## Matriz de Riesgo
${results.map((result) => `- **${result.providerName}**: riesgo ${result.risk}, ${result.riskScore.toFixed(1)}/100, similitud semántica ${(result.similarityScore * 100).toFixed(1)}%.`).join("\n")}

## Evidencia Técnica
${flags.map((flag) => `- ${flag}`).join("\n") || "- No se detectaron banderas rojas activas."}

## Fundamento Jurídico
Los indicios de posible fraccionamiento deben revisarse frente a los principios de planeación, transparencia, selección objetiva y competencia de la contratación pública colombiana.

## Recomendaciones
Priorizar revisión humana de los clústeres de alto riesgo, contrastar certificados presupuestales y estudios previos, y verificar si los objetos contractuales similares debieron consolidarse en un único proceso competitivo.
  `.trim();
}

export async function generateQuickObservation(summary: string, lang: "ES" | "EN"): Promise<string> {
  const isEs = lang === "ES";
  const prompt = `
    Eres un auditor forense de contratación pública.
    Redacta exactamente una sola oración, breve, técnica y contundente.
    No uses viñetas ni comillas.
    Idioma: ${isEs ? "Español" : "English"}.
    Contexto: ${summary}
  `;

  try {
    const response = await generateText(prompt, 80);
    return response.trim().replace(/^"|"$/g, "");
  } catch (error) {
    console.error("Quick Observation Error:", error);
    return isEs
      ? "Alerta de fraccionamiento: patrón de contratación fragmentada con posible elusión de competencia."
      : "Split contracting alert: fragmented procurement pattern with possible competition evasion.";
  }
}

function tryDeterministicAuditAnswer(
  result: AnalysisResult,
  finding: DetailedFinding,
  userMessage: string,
  lang: "ES" | "EN"
) {
  const isEs = lang === "ES";
  const normalized = userMessage.trim().toLowerCase();
  const contractDate = new Date(finding.contract.fecha_de_firma).toLocaleDateString(isEs ? "es-CO" : "en-CA");
  const reasons = finding.reasons.join(", ");
  const firstFlag = result.redFlags[0] || (isEs ? "senal agregada del cluster" : "aggregated cluster signal");

  if (normalized.includes("que activo") || normalized.includes("qué activ") || normalized.includes("trigger")) {
    return isEs
      ? `La alerta se activó por ${reasons || "la combinación de señales del grupo"}. Además, el clúster de ${result.providerName} quedó calificado en ${result.riskScore.toFixed(0)}/100 con ${(result.similarityScore * 100).toFixed(1)}% de similitud promedio.`
      : `The alert was triggered by ${reasons || "the combination of cluster signals"}. In addition, the ${result.providerName} cluster was scored at ${result.riskScore.toFixed(0)}/100 with ${(result.similarityScore * 100).toFixed(1)}% average similarity.`;
  }

  if (normalized.includes("siguiente") || normalized.includes("next") || normalized.includes("verificar")) {
    return isEs
      ? `El siguiente paso es validar el soporte SECOP del contrato ${finding.contractId}, revisar estudios previos y confirmar si el objeto contractual debía consolidarse antes del ${contractDate}.`
      : `The next step is to validate the SECOP support for contract ${finding.contractId}, review prior studies, and confirm whether the contract object should have been consolidated before ${contractDate}.`;
  }

  if (normalized.includes("norma") || normalized.includes("ley") || normalized.includes("legal") || normalized.includes("jurid")) {
    return `${getLikelyLegalFrame(result, finding, lang)} ${isEs ? "El sistema entrega una hipótesis de riesgo priorizada; la calificación jurídica final requiere revisión humana e institucional." : "The system delivers a prioritized risk hypothesis; the final legal qualification still requires human and institutional review."}`;
  }

  if (normalized.includes("fraccion") || normalized.includes("split") || normalized.includes("divid")) {
    return isEs
      ? `El patrón apunta a posible fraccionamiento porque combina ${firstFlag}, una ventana temporal de ${result.maxDayDiff} días y repetición material del objeto contractual dentro del mismo proveedor.`
      : `The pattern points to possible split contracting because it combines ${firstFlag}, a ${result.maxDayDiff}-day time window, and material repetition of the contract object within the same supplier.`;
  }

  if (normalized.includes("contrato") && normalized.includes("difer")) {
    return isEs
      ? `El sistema diferencia contratos por identificador de adjudicación, referencia del proceso o identificador compuesto del registro SECOP. No asume que dos objetos parecidos sean el mismo contrato: compara identidad documental, fecha, cuantía y referencia del proceso.`
      : `The system differentiates contracts by award identifier, process reference, or a composite SECOP record identifier. It does not assume that two similar objects are the same contract: it compares documentary identity, date, amount, and process reference.`;
  }

  return null;
}

export async function chatAboutFinding(
  result: AnalysisResult,
  finding: DetailedFinding,
  userMessage: string,
  lang: "ES" | "EN"
): Promise<string> {
  const isEs = lang === "ES";
  const deterministic = tryDeterministicAuditAnswer(result, finding, userMessage, lang);
  if (deterministic) return deterministic;
  const prompt = `
    AUDITORÍA INTERACTIVA GOBIA

    CONTEXT for Finding ID ${finding.contractId}:
    - Provider: ${result.providerName}
    - Reasons for Risk: ${finding.reasons.join(", ")}
    - Evidence: ${finding.evidence}

    FULL CONTRACT DATA:
    ${JSON.stringify(finding.contract, null, 2)}

    GLOBAL CONTEXT of Provider Analysis:
    - Total Value: ${result.totalValue}
    - Semantic Similarity in Group: ${result.similarityScore * 100}%
    - Red Flags in Group: ${result.redFlags.join(", ")}

    USER QUESTION: "${userMessage}"

    INSTRUCTIONS:
    1. Respond strictly about the technical facts of this finding vs Colombian procurement law.
    2. Be forensic and objective. Use professional terminology.
    3. If asked about legality, mention that only a judge can determine crime, but the system marks a high-risk split-contracting pattern.
    4. Keep it concise with a maximum of 3 paragraphs.
    5. Respond in ${isEs ? "Spanish" : "English"}.
  `;

  try {
    const response = await generateText(prompt, 220);
    return response || (isEs ? "Error al procesar consulta." : "Query processing error.");
  } catch (error) {
    console.error("Chat Error:", error);
    return isEs ? "Error al procesar consulta." : "Query processing error.";
  }
}

function getLikelyLegalFrame(result: AnalysisResult, finding: DetailedFinding, lang: "ES" | "EN") {
  const isEs = lang === "ES";
  const joined = `${result.redFlags.join(" ")} ${finding.reasons.join(" ")}`.toLowerCase();

  if (joined.includes("directa")) {
    return isEs
      ? "La señal apunta a selección no competitiva, con revisión prioritaria frente a Ley 80, planeación y transparencia."
      : "The signal points to non-competitive selection, with priority review against Law 80, planning, and transparency principles.";
  }

  if (joined.includes("similitud") || joined.includes("identidad")) {
    return isEs
      ? "La alerta sugiere identidad material entre objetos contractuales, un indicio clásico de fraccionamiento."
      : "The alert suggests material identity between contract objects, a classic split-contracting indicator.";
  }

  if (joined.includes("cuant")) {
    return isEs
      ? "La coincidencia de cuantías sugiere fraccionamiento orientado a permanecer dentro de umbrales menos exigentes."
      : "Amount similarity suggests splitting designed to remain within less demanding thresholds.";
  }

  return isEs
    ? "El expediente combina señales de riesgo técnico que justifican revisión humana priorizada."
    : "The case combines technical risk signals that justify prioritized human review.";
}

function buildDeterministicSuggestedAuditQA(
  result: AnalysisResult,
  finding: DetailedFinding,
  lang: "ES" | "EN"
): SuggestedAuditQA[] {
  const isEs = lang === "ES";
  const firstReason = finding.reasons[0] || (isEs ? "Indicio técnico relevante" : "Relevant technical clue");
  const legalFrame = getLikelyLegalFrame(result, finding, lang);
  const contractDate = new Date(finding.contract.fecha_de_firma).toLocaleDateString(isEs ? "es-CO" : "en-CA");

  if (!isEs) {
    return [
      {
        question: "What exactly triggered this alert?",
        answer: `The primary trigger is "${firstReason}". The contract sits inside a cluster scored at ${result.riskScore.toFixed(0)}/100 with ${result.contracts.length} related contracts.`,
      },
      {
        question: "Why could this be split contracting?",
        answer: `The supplier shows repeated contracting patterns, ${(result.similarityScore * 100).toFixed(1)}% semantic similarity, and a time window of ${result.maxDayDiff} days across the cluster.`,
      },
      {
        question: "What legal angle should I review first?",
        answer: legalFrame,
      },
      {
        question: "What should the auditor verify next?",
        answer: `Validate the SECOP support for contract ${finding.contractId}, review prior studies, compare budget documents, and confirm whether the object should have been consolidated before ${contractDate}.`,
      },
    ];
  }

  return [
    {
      question: "¿Qué activó exactamente esta alerta?",
      answer: `El disparador principal es "${firstReason}". El contrato pertenece a un clúster calificado en ${result.riskScore.toFixed(0)}/100 con ${result.contracts.length} contratos relacionados.`,
    },
    {
      question: "¿Por qué puede tratarse de fraccionamiento?",
      answer: `El proveedor presenta recurrencia contractual, ${(result.similarityScore * 100).toFixed(1)}% de similitud semántica y una ventana temporal de ${result.maxDayDiff} días en el clúster analizado.`,
    },
    {
      question: "¿Cuál es el frente jurídico más relevante?",
      answer: legalFrame,
    },
    {
      question: "¿Qué debe verificar después el auditor?",
      answer: `Revise el soporte SECOP del contrato ${finding.contractId}, contraste estudios previos y documentos presupuestales, y valide si el objeto debía consolidarse antes del ${contractDate}.`,
    },
  ];
}

function buildAdaptiveFallbackQA(
  result: AnalysisResult,
  finding: DetailedFinding,
  history: AuditChatMessage[],
  lang: "ES" | "EN"
) {
  if (history.length === 0) {
    return buildDeterministicSuggestedAuditQA(result, finding, lang);
  }

  const isEs = lang === "ES";
  const lastUser = [...history].reverse().find((item) => item.role === "user")?.content || "";
  const lastAnswer = [...history].reverse().find((item) => item.role === "ai")?.content || "";
  const primaryReason = finding.reasons[0] || (isEs ? "Indicio técnico relevante" : "Relevant technical clue");
  const contractDate = new Date(finding.contract.fecha_de_firma).toLocaleDateString(isEs ? "es-CO" : "en-CA");
  const baseId = finding.contractId;

  if (!isEs) {
    return [
      {
        question: "What remains unverified after the last answer?",
        answer: `The next verification point is the documentary support behind "${primaryReason}" for contract ${baseId}. Contrast it against the last answer and confirm whether SECOP shows prior studies, budget support, and a competitive rationale.`,
      },
      {
        question: "Which comparable contracts should I inspect now?",
        answer: `Review the nearest contracts in the same cluster for ${result.providerName}, especially those signed around ${contractDate} with overlapping object language and similar value bands.`,
      },
      {
        question: "What legal or procedural angle is still open?",
        answer: `${getLikelyLegalFrame(result, finding, lang)} The unresolved angle from the previous exchange is: ${lastUser || "the competitive basis for this purchase"}.`,
      },
      {
        question: "What would be the fastest next question?",
        answer: `Ask for the exact SECOP evidence that confirms or weakens the previous answer: ${lastAnswer.slice(0, 180) || "No previous answer was stored yet."}`,
      },
    ];
  }

  return [
    {
      question: "¿Qué queda por verificar después de la última respuesta?",
      answer: `El siguiente punto es validar el soporte documental de "${primaryReason}" para el contrato ${baseId}. Contrástalo con la última respuesta y confirma si SECOP muestra estudios previos, respaldo presupuestal y justificación competitiva.`,
    },
    {
      question: "¿Qué contratos comparables conviene revisar ahora?",
      answer: `Revisa los contratos más cercanos del mismo clúster de ${result.providerName}, especialmente los firmados alrededor de ${contractDate} con lenguaje de objeto similar y cuantías dentro de la misma banda.`,
    },
    {
      question: "¿Cuál es el frente jurídico o procedimental que sigue abierto?",
      answer: `${getLikelyLegalFrame(result, finding, lang)} El frente que sigue abierto después del intercambio previo es: ${lastUser || "la justificación competitiva del proceso"}.`,
    },
    {
      question: "¿Cuál debería ser la siguiente pregunta más útil?",
      answer: `Pide la evidencia SECOP exacta que confirme o debilite la respuesta anterior: ${lastAnswer.slice(0, 180) || "Aún no existe una respuesta previa registrada."}`,
    },
  ];
}

function makeSuggestedQACacheKey(
  result: AnalysisResult,
  finding: DetailedFinding,
  history: AuditChatMessage[],
  lang: "ES" | "EN"
) {
  const historySignature = history
    .slice(-6)
    .map((item) => `${item.role}:${item.content.trim().toLowerCase().slice(0, 120)}`)
    .join("|");

  return `${lang}::${result.groupKey}::${finding.contractId}::${historySignature}`;
}

export async function generateSuggestedAuditQA(
  result: AnalysisResult,
  finding: DetailedFinding,
  lang: "ES" | "EN"
): Promise<SuggestedAuditQA[]> {
  const isEs = lang === "ES";
  const prompt = `
    Eres un auditor forense interactivo.
    A partir del siguiente expediente, genera exactamente 4 preguntas probables que haría un auditor humano y responde cada una.

    CONTEXTO:
    - Proveedor: ${result.providerName}
    - Riesgo: ${result.riskScore}/100
    - Motivos del hallazgo: ${finding.reasons.join(", ")}
    - Evidencia: ${finding.evidence}
    - Contrato: ${JSON.stringify(finding.contract)}
    - Banderas globales: ${result.redFlags.join(", ")}

    REGLAS:
    1. Responde en ${isEs ? "Español" : "English"}.
    2. Devuelve solo JSON válido.
    3. Formato exacto: [{"question":"...", "answer":"..."}]
    4. Cada respuesta debe ser breve, clara y accionable.
  `;

  try {
    const raw = await generateText(prompt, 320);
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as SuggestedAuditQA[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter(item => item?.question && item?.answer)
          .slice(0, 4);
      }
    }
  } catch (error) {
    console.error("Suggested QA Error:", error);
  }

  return buildDeterministicSuggestedAuditQA(result, finding, lang);
}

export async function generateAdaptiveAuditQA(
  result: AnalysisResult,
  finding: DetailedFinding,
  history: AuditChatMessage[],
  lang: "ES" | "EN"
): Promise<SuggestedAuditQA[]> {
  const cacheKey = makeSuggestedQACacheKey(result, finding, history, lang);
  const cached = suggestedQACache.get(cacheKey);
  if (cached) return cached;

  if (history.length === 0) {
    const initial = await generateSuggestedAuditQA(result, finding, lang);
    suggestedQACache.set(cacheKey, initial);
    return initial;
  }

  const isEs = lang === "ES";
  const prompt = `
    You are an adaptive public-procurement audit assistant.
    Recalculate exactly 4 likely next questions for the auditor after reading the conversation so far.

    CASE:
    - Provider: ${result.providerName}
    - Risk score: ${result.riskScore}/100
    - Red flags: ${result.redFlags.join(", ")}
    - Finding reasons: ${finding.reasons.join(", ")}
    - Evidence: ${finding.evidence}
    - Contract: ${JSON.stringify(finding.contract)}

    CHAT HISTORY:
    ${JSON.stringify(history.slice(-6))}

    RULES:
    1. Respond in ${isEs ? "Spanish" : "English"}.
    2. Questions must feel like the next best click suggestions in a fast investigative UI.
    3. Avoid repeating answered questions unless the angle changes.
    4. Return valid JSON only.
    5. Exact format: [{"question":"...", "answer":"..."}]
  `;

  try {
    const raw = await generateText(prompt, 320);
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(raw.slice(start, end + 1)) as SuggestedAuditQA[];
      const cleaned = parsed
        .filter((item) => item?.question && item?.answer)
        .slice(0, 4);

      if (cleaned.length > 0) {
        suggestedQACache.set(cacheKey, cleaned);
        return cleaned;
      }
    }
  } catch (error) {
    console.error("Adaptive Suggested QA Error:", error);
  }

  const fallback = buildAdaptiveFallbackQA(result, finding, history, lang);
  suggestedQACache.set(cacheKey, fallback);
  return fallback;
}
