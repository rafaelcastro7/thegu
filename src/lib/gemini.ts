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

const embeddingCache = new Map<string, number[]>();

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      const waitTime = delay + Math.random() * 2000;
      console.warn(`[BHA] Error with local model. Retrying in ${Math.round(waitTime)}ms. Attempts left: ${retries}`);
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

      console.warn(`[BHA] Local model ${model} returned an empty response. Trying next model.`);
    } catch (error) {
      lastError = error;
      console.warn(`[BHA] Local model ${model} failed. Trying next model.`, error);
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
    Eres un Auditor Forense Digital de BHA (Bot de Hallazgos y Auditoría).
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

export async function chatAboutFinding(
  result: AnalysisResult,
  finding: DetailedFinding,
  userMessage: string,
  lang: "ES" | "EN"
): Promise<string> {
  const isEs = lang === "ES";
  const prompt = `
    CONCURSO DE AUDITORÍA INTERACTIVA - BHA

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
