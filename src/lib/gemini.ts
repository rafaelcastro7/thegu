import { GoogleGenAI } from "@google/genai";
import { AnalysisResult, DetailedFinding } from "./analysis";

const API_KEY = process.env.GEMINI_API_KEY;

export const ai = new GoogleGenAI({ 
  apiKey: API_KEY!,
});

// Simple In-memory cache for embeddings
const embeddingCache = new Map<string, number[]>();

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = String(error).toLowerCase();
    const isQuotaError = 
      errorStr.includes('429') || 
      errorStr.includes('quota') || 
      errorStr.includes('resource_exhausted');

    if (isQuotaError && retries > 0) {
      const waitTime = delay + Math.random() * 2000;
      console.warn(`[BHA] Quota exceeded. Throttling... Retrying in ${Math.round(waitTime)}ms. Attempts left: ${retries}`);
      await new Promise(r => setTimeout(r, waitTime));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function getEmbedding(text: string): Promise<number[]> {
  if (embeddingCache.has(text)) return embeddingCache.get(text)!;

  try {
    const result = await withRetry(async () => {
      // In @google/genai, embedding uses ai.models.embedContent
      return await ai.models.embedContent({
        model: "gemini-embedding-2-preview",
        contents: [text],
      });
    });

    const embedding = result.embeddings[0].values;
    embeddingCache.set(text, embedding);
    return embedding;
  } catch (error) {
    console.error("Embedding Error:", error);
    return new Array(768).fill(0);
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    mA += a[i] * a[i];
    mB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(mA) * Math.sqrt(mB));
}

export async function generateForensicReport(results: AnalysisResult[] | AnalysisResult, lang: 'ES' | 'EN'): Promise<string> {
  const isEs = lang === 'ES';
  const resultsArray = Array.isArray(results) ? results : [results];
  const prompt = `
    Eres un Auditor Forense Digital de BHA (Bot de Hallazgos y Auditoría).
    Analiza el siguiente resumen de clusters de contratación sospechosos en SECOP II.
    
    DATA:
    ${JSON.stringify(resultsArray.map(r => ({
      provider: r.providerName,
      total_value: r.totalValue,
      similarity: r.similarityScore,
      risk: r.risk,
      red_flags: r.redFlags
    })), null, 2)}
    
    INSTRUCTIONS:
    1. Genera un INFORME DE AUDITORÍA FORENSE DE ALTO IMPACTO.
    2. Usa una estructura jerárquica clara:
       - RESUMEN EJECUTIVO PARA ALTA GERENCIA (Impacto fiscal total).
       - MATRIZ DE RIESGOS (Clasificación de hallazgos por severidad).
       - EVIDENCIA TÉCNICA DETALLADA (Cita contratos específicos y montos).
       - FUNDAMENTOS JURÍDICOS (Ley 80, Ley 1474, etc).
       - RECOMENDACIONES DE MITIGACIÓN.
    3. Enfócate en el RIESGO DE FRACCIONAMIENTO CONTRACTUAL y POSIBLE COLUSIÓN.
    4. Identifica específicamente los "contratos puente" o "nodos de colusión" en el clúster.
    5. Ignora hallazgos con riesgo despreciable; enfócate en lo que un auditor humano querría denunciar.
    6. El tono debe ser técnico, seco y autoritario. Menciona que los datos fueron extraídos de SECOP II.
    7. Utiliza Markdown para el formato, usa negritas para montos y términos legales.
    8. Idioma: ${isEs ? "Español" : "Inglés"}.
  `;

  if (!API_KEY) return isEs ? "Error: API Key no configurada." : "Error: API Key not configured.";

  try {
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
    });
    
    return response.text || (isEs ? "Error en generación." : "Generation error.");
  } catch (error) {
    console.error("Report Generation Error:", error);
    return isEs ? "Error al generar el informe." : "Error generating report.";
  }
}

export async function chatAboutFinding(
  result: AnalysisResult, 
  finding: DetailedFinding, 
  userMessage: string, 
  lang: 'ES' | 'EN'
): Promise<string> {
  const isEs = lang === 'ES';
  const prompt = `
    CONCURSO DE AUDITORÍA INTERACTIVA - BHA
    
    CONTEXT for Finding ID ${finding.contractId}:
    - Provider: ${result.providerName}
    - Reasons for Risk: ${finding.reasons.join(', ')}
    - Evidence: ${finding.evidence}
    
    FULL CONTRACT DATA:
    ${JSON.stringify(finding.contract, null, 2)}
    
    GLOBAL CONTEXT of Provider Analysis:
    - Total Value: ${result.totalValue}
    - Semantic Similarity in Group: ${result.similarityScore * 100}%
    - Red Flags in Group: ${result.redFlags.join(', ')}
    
    USER QUESTION: "${userMessage}"
    
    INSTRUCTIONS:
    1. Respond strictly about the technical facts of this finding vs Colombian procurement law (Ley 80 de 1993, Circular Externa No. 17 de Colombia Compra Eficiente).
    2. Be forensic and objective. Use professional terminology.
    3. If asked about legality, mention that only a judge can determine crime, but the system marks "Pattern of High Risk for Split Contracting".
    4. Keep it concise (max 3 paragraphs).
    5. Respond in ${isEs ? "Spanish" : "English"}.
  `;

  if (!API_KEY) return isEs ? "Error: API Key no configurada." : "Error: API Key not configured.";

  try {
    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
    });
    
    return response.text || (isEs ? "Error al procesar consulta." : "Query processing error.");
  } catch (error) {
    console.error("Chat Error:", error);
    return isEs ? "Error al procesar consulta." : "Query processing error.";
  }
}
